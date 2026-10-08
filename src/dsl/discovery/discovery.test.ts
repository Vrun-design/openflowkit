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

  it('two folders that each hold 2+ services are two systems, Landscape first', () => {
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

describe('Cloudflare Workers', () => {
  const toml = 'name = "openflowkit-share"\nmain = "index.ts"\n\n[[r2_buckets]]\nbinding = "SHARES"\nbucket_name = "openflowkit-shares"\n';
  const worker = [
    { path: 'worker/wrangler.toml', content: toml },
    { path: 'worker/index.ts', content: 'export default { fetch() {} };\n' },
  ];

  it('a wrangler config makes its folder a Worker, and its R2 binding a store it uses', () => {
    const result = discoverArchitecture(worker, 'repo');
    const unit = result.units.find((entry) => entry.dir === 'worker')!;
    expect(unit).toMatchObject({ kind: 'container', name: 'openflowkit-share', tech: 'Cloudflare Workers' });
    expect(unit.evidence[0]).toMatchObject({ file: 'worker/wrangler.toml', line: 1 });
    const bucket = result.units.find((entry) => entry.name === 'openflowkit-shares')!;
    expect(bucket).toMatchObject({ kind: 'store', tech: 'R2' });
    const use = result.relations.find((relation) => relation.to === bucket.id)!;
    expect(use).toMatchObject({ from: unit.id, label: 'uses' });
    expect(use.evidence[0]).toMatchObject({ file: 'worker/wrangler.toml', line: 6 });
  });

  it('enriches the folder\'s package.json unit instead of adding a second one', () => {
    const files = [...worker, { path: 'worker/package.json', content: '{"name":"share","dependencies":{"hono":"^4"}}' }];
    const units = discoverArchitecture(files, 'repo').units.filter((entry) => entry.dir === 'worker');
    expect(units).toHaveLength(1);
    expect(units[0]!.tech).toBe('Cloudflare Workers');
  });

  it('an assets-only wrangler config (no main) is static hosting: no Worker unit, tech untouched', () => {
    const files = [
      { path: 'wrangler.toml', content: 'name = "site"\n\n[assets]\ndirectory = "./dist"\n' },
      { path: 'package.json', content: '{"name":"site","dependencies":{"react":"^19"}}' },
    ];
    expect(discoverArchitecture(files, 'repo').units.map((unit) => unit.tech)).toEqual(['React']);
  });

  it('accepts every wrangler config spelling', () => {
    for (const name of ['wrangler.toml', 'wrangler.json', 'wrangler.jsonc']) expect(acceptsArchitectureFile(`worker/${name}`)).toBe(true);
  });

  it('reads a wrangler.jsonc the same way', () => {
    const jsonc = '{\n  // share links\n  "name": "share",\n  "main": "src/index.ts",\n  "r2_buckets": [\n    { "binding": "SHARES", "bucket_name": "shares" }\n  ]\n}\n';
    const result = discoverArchitecture([{ path: 'w/wrangler.jsonc', content: jsonc }], 'repo');
    expect(result.units.map((entry) => [entry.name, entry.kind])).toEqual([['share', 'container'], ['shares', 'store']]);
  });
});

describe('compose depends_on flow lists', () => {
  const edges = (dependsOn: string) => {
    const content = `services:\n  web:\n    image: web:1\n    depends_on: ${dependsOn}\n  api:\n    image: api:1\n  db:\n    image: postgres:16\n`;
    const found = discoverArchitecture([{ path: 'docker-compose.yml', content }], 'shop');
    return found.relations.map((r) => `${r.from}>${r.to}`).sort();
  };

  it('reads [a, b] in every spacing and quote style, with a trailing comment', () => {
    for (const list of ['[api, db]', '[api,db]', '[ api , db ]', '["api", \'db\']', '[api, db]   # needs both']) expect(edges(list), list).toEqual(['web>api', 'web>db']);
  });

  it('reads the single and empty forms and ignores junk', () => {
    expect(edges('[api]')).toEqual(['web>api']);
    expect(edges('[]')).toEqual([]);
    expect(edges('[ {a: b} ]')).toEqual([]);
    expect(edges('api')).toEqual([]);
  });

  it('stays linear on hostile lines (1 MB)', () => {
    for (const hostile of [`${'['.repeat(1e6)}`, `[a${' '.repeat(1e6)}b]`, `[${'a,'.repeat(5e5)}]`, `[${']'.repeat(5e5)} x`]) {
      const started = performance.now();
      edges(hostile);
      expect(performance.now() - started).toBeLessThan(200);
    }
  });
});
