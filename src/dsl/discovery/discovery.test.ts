import { describe, expect, it } from 'vitest';
import { compileWorkspace } from '../compile';
import { deterministicLayout } from '../layout';
import { acceptsArchitectureFile, capUnits, discoverArchitecture, discoveryToDsl } from './discovery';

// The browser entry point: files already read (the repo page fetches them from
// GitHub). mcp-server/tests/discoveryFixtures.test.ts runs the fixtures through the Node walk.
const FILES = [
  { path: 'docker-compose.yml', content: 'services:\n  web:\n    build: ./web\n    environment:\n      API_URL: http://api:8080\n  api:\n    image: acme/api:1\n  db:\n    image: postgres:16\n' },
  { path: 'web/package.json', content: '{"name":"web","dependencies":{"react":"^19"}}' },
  { path: 'api/package.json', content: '{"name":"api","dependencies":{"pg":"^8"}}' },
  { path: 'api/src/server.test.ts', content: "import Stripe from 'stripe';\n" },
];

describe('discoverArchitecture', () => {
  it('finds units and calls from in-memory files, without a filesystem', () => {
    const result = discoverArchitecture(FILES, 'shop');
    expect(result.units.map((unit) => unit.name).sort()).toEqual(['api', 'db', 'web']);
    const call = result.relations.find((relation) => relation.label === 'calls')!;
    expect(call.evidence[0]).toMatchObject({ file: 'docker-compose.yml', line: 5 });
  });

  it('writes each arrow\'s evidence into the DSL, linked when asked, and the DSL compiles', async () => {
    const result = discoverArchitecture(FILES, 'shop');
    expect(discoveryToDsl(result, 'shop')).toMatch(/ -> \S+ : calls \[link: docker-compose\.yml:5\]/);
    const linked = discoveryToDsl(result, 'shop', ({ file, line }) => `https://github.com/acme/shop/blob/HEAD/${file}#L${line}`);
    expect(linked).toContain('https://github.com/acme/shop/blob/HEAD/docker-compose.yml#L5');
    const workspace = await compileWorkspace(linked, { layout: deterministicLayout });
    expect(workspace.views.flatMap((view) => view.result.diagnostics).filter(({ severity }) => severity !== 'info')).toEqual([]);
  });
});

describe('discoveryToDsl view order', () => {
  const viewLines = (dsl: string) => dsl.split('\n').map((line) => line.trim()).filter((line) => /^view (landscape|container)\b/.test(line));

  it('a single-product repo opens on its services and has no lone-box system map', () => {
    const files = ['frontend', 'cartservice', 'checkoutservice'].map((svc) => ({ path: `src/${svc}/Dockerfile`, content: 'FROM alpine\n' }));
    const dsl = discoveryToDsl(discoverArchitecture(files, 'microservices-demo'), 'microservices-demo');
    expect(viewLines(dsl)).toEqual(['view container of microservices-demo']);
  });

  const dockerfiles = (...dirs: string[]) => dirs.map((dir) => ({ path: `${dir}/Dockerfile`, content: 'FROM node\n' }));

  it('web/ + api/ + worker/, one service each, is one system that lands on its services', () => {
    const views = viewLines(discoveryToDsl(discoverArchitecture(dockerfiles('web', 'api', 'worker'), 'shop'), 'shop'));
    expect(views).toEqual(['view container of shop']);
  });

  it('two folders that each hold 2+ services are two systems, System map first', () => {
    const files = dockerfiles('billing/api', 'billing/worker', 'storefront/web', 'storefront/api');
    const views = viewLines(discoveryToDsl(discoverArchitecture(files, 'mono'), 'mono'));
    expect(views[0]).toBe('view landscape');
    expect(views).toHaveLength(3);
  });

  it('one product folder plus a single-unit folder stays one repo system', () => {
    const files = dockerfiles('billing/api', 'billing/worker', 'docs');
    expect(viewLines(discoveryToDsl(discoverArchitecture(files, 'mono'), 'mono'))).toEqual(['view container of mono']);
  });
});

describe('capUnits', () => {
  it('keeps services before dependencies, drops their relations, and counts what it left out', () => {
    const result = discoverArchitecture(FILES, 'shop');
    const capped = capUnits(result, 2);
    expect(capped.dropped).toBe(1);
    expect(capped.result.units.map((unit) => unit.kind)).toEqual(['container', 'container']);
    expect(capped.result.relations.every((relation) => capped.result.units.some((unit) => unit.id === relation.to))).toBe(true);
    expect(capUnits(result, 10)).toEqual({ result, dropped: 0 });
  });
});

describe('acceptsArchitectureFile skip directories', () => {
  it('ignores vendored, build and dot directories at any depth', () => {
    const api = { path: 'api/package.json', content: '{"name":"api","dependencies":{"pg":"^8"}}' };
    const noise = [
      { path: 'node_modules/foo/package.json', content: '{"name":"foo","dependencies":{"redis":"1"}}' },
      { path: 'dist/Dockerfile', content: 'FROM node:20\n' },
      { path: '.github/workflows/ci.yml', content: 'name: ci\n' },
      // A failed Playwright run leaves an HTML report full of third-party URLs.
      { path: 'playwright-report/index.js', content: 'fetch("https://trace.playwright.dev/x")\n' },
      { path: 'test-results/a/trace.js', content: 'fetch("https://www.dropbox.com/s")\n' },
    ];
    expect(discoverArchitecture([api, ...noise], 'shop').units).toEqual(discoverArchitecture([api], 'shop').units);
  });

  it('only directory segments count: a root dotfile keeps its verdict', () => {
    expect(acceptsArchitectureFile('.env')).toBe(false);
    expect(acceptsArchitectureFile('.eslintrc.json')).toBe(true);
    expect(acceptsArchitectureFile('packages/app/node_modules/x/index.js')).toBe(false);
    expect(acceptsArchitectureFile('.vscode/settings.json')).toBe(false);
    expect(acceptsArchitectureFile('api/index.ts')).toBe(true);
  });
});
