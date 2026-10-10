import { describe, expect, it } from 'vitest';
import { acceptsArchitectureFile } from '../discovery/discovery';
import { acceptsMapFile, deployablesFrom, factsFromFiles } from './facts';
import { buildMap } from './build';

const files = [
  { path: 'web/package.json', content: '{"name":"web"}' },
  { path: 'web/src/a.ts', content: "import { b } from './b';\nexport const a = b;\n" },
  { path: 'web/src/b.ts', content: "import { a } from './a';\nexport const b = 1;\nexport { a };\n" },
  { path: 'api/main.go', content: 'package main\n' },
  { path: 'api/Dockerfile', content: 'FROM golang:1.22\nEXPOSE 8080\n' },
];

describe('factsFromFiles', () => {
  it('counts lines, resolves imports and feeds buildMap', () => {
    const facts = factsFromFiles(files, 'demo');
    expect(facts.files.map((f) => f.path)).toEqual(['api/main.go', 'web/src/a.ts', 'web/src/b.ts']);
    expect(facts.imports.map((i) => `${i.from}>${i.to}:${i.line}`)).toEqual(['web/src/a.ts>web/src/b.ts:1', 'web/src/b.ts>web/src/a.ts:1']);
    const model = buildMap(facts);
    expect(model.stats).toMatchObject({ files: 3, imports: 2, unresolved: 0 });
  });
  it('filters what the map reads', () => {
    expect(['a.ts', 'x/Dockerfile', 'go.mod', 'a.test.ts', 'node_modules/x.js', 'README.md'].map(acceptsMapFile)).toEqual([true, true, true, false, false, false]);
  });
  it('carries the scanner\'s broken imports into stats.unresolved', () => {
    const facts = factsFromFiles([{ path: 'a.ts', content: "import './missing';\nimport './b';" }, { path: 'b.ts', content: '' }], 'demo');
    expect(facts.unresolvedImports).toBe(1);
    expect(buildMap(facts).stats).toMatchObject({ imports: 1, unresolved: 1 });
    expect(buildMap({ ...facts, unresolvedImports: undefined }).stats.unresolved).toBe(0);
  });
  it('makes the root unit the part for src/, and a store a data link to an ext: node', () => {
    const facts = factsFromFiles([
      { path: 'package.json', content: '{"name":"webapp"}' }, { path: 'src/main.ts', content: 'export {};\n' },
      { path: 'worker/wrangler.toml', content: 'name = "share"\nmain = "index.ts"\n\n[[r2_buckets]]\nbinding = "S"\nbucket_name = "shares"\n' },
    ], 'demo');
    expect(facts.parts?.map((p) => p.dir).sort()).toEqual(['src', 'worker']);
    expect(facts.externals).toEqual([{ id: 'ext:shares', name: 'shares', desc: 'store · R2' }]);
    expect(facts.links?.[0]).toMatchObject({ from: 'worker', to: 'ext:shares', kind: 'data' });
  });
});

describe('factsFromFiles options', () => {
  it('lists unread files with 0 lines and counts a src/ listed only in `paths`', () => {
    const facts = factsFromFiles([{ path: 'a.ts', content: "import './big';\n" }], 'demo', { paths: ['a.ts', 'big.ts', 'src/x.ts'], listed: ['a.ts', 'big.ts', 'x.d.ts', 'vendor/y.ts'] });
    expect(facts.files).toEqual([{ path: 'a.ts', loc: 1 }, { path: 'big.ts', loc: 0 }]);
    expect(facts.imports.map((i) => i.to)).toEqual(['big.ts']);
  });
});

describe('buildMap with prototype-named folders', () => {
  it('keeps `constructor` and `__proto__` folders as ordinary nodes', () => {
    const model = buildMap({ files: [{ path: 'constructor/a.ts', loc: 1 }, { path: '__proto__/b.ts', loc: 2 }, { path: 'toString/c.ts', loc: 3 }], imports: [{ from: 'constructor/a.ts', to: '__proto__/b.ts', line: 1, text: 'x' }] });
    expect(model.nodes['constructor/a.ts']?.kind).toBe('file');
    expect(model.nodes['__proto__/b.ts']?.kind).toBe('file');
    expect(model.stats).toMatchObject({ files: 3, loc: 6, imports: 1 });
    expect(Object.keys(model.nodes).some((k) => k === '__proto__' || k.startsWith('__proto__'))).toBe(true);
  });
});

describe('acceptsMapFile narrowing', () => {
  it('reads what makes parts and links, and not docs examples, locales or lockfiles', () => {
    const take = ['src/a.ts', 'api/main.py', 'Dockerfile', 'web/Dockerfile', 'docker-compose.yml', 'k8s/deploy.yaml', 'infra/main.tf', 'worker/wrangler.jsonc', 'worker/wrangler.toml',
      'package.json', 'go.mod', 'requirements.txt', 'pyproject.toml', 'tsconfig.json', 'config/base.json', 'svc/Main.java', 'svc/app.rb', 'examples/app/package.json', 'examples/app/index.tsx', 'docs/mkdocs.yml', 'pkg/global.d.ts'];
    const drop = ['docs_src/tutorial/a.py', 'packages/x/locales/en.json', 'package-lock.json', 'schema/manifest.json', 'a.test.ts', 'vendor/x.go', 'README.md'];
    expect(take.filter((p) => !acceptsMapFile(p))).toEqual([]);
    expect(drop.filter(acceptsMapFile)).toEqual([]);
  });

  it('leaves discovery\'s parts, links and externals unchanged', () => {
    const repo: Record<string, string> = {
      'docker-compose.yml': 'services:\n  api:\n    build: ./api\n    environment:\n      DB: postgres://db:5432/x\n  db:\n    image: postgres:16\n',
      'api/Dockerfile': 'FROM python:3.12\n', 'api/requirements.txt': 'stripe\n', 'api/main.py': 'import stripe\nimport redis\n',
      'worker/wrangler.toml': 'name = "w"\nmain = "i.ts"\n\n[[r2_buckets]]\nbinding = "S"\nbucket_name = "b"\n', 'worker/i.ts': 'export {};\n',
      'docs_src/ex.py': 'import redis\nimport boto3\n', 'docs/mkdocs.yml': 'site_name: x\n', 'locales/en.json': '{"redis":"x"}', 'package-lock.json': '{"name":"stripe"}',
    };
    const all = Object.keys(repo).filter((p) => acceptsArchitectureFile(p)).map((path) => ({ path, content: repo[path]! }));
    const narrowed = all.filter((f) => acceptsMapFile(f.path));
    expect(narrowed.length).toBeLessThan(all.length);
    const [before, after] = [deployablesFrom(all, 'r', false), deployablesFrom(narrowed, 'r', false)];
    expect(after.parts).toEqual(before.parts);
    expect(after.links.map((l) => `${l.from}>${l.to}`)).toEqual(before.links.map((l) => `${l.from}>${l.to}`));
  });
});

describe('compose depends_on', () => {
  const compose = (dependsOn: (service: string) => string) =>
    `services:\n  web:\n    build: ./web\n${dependsOn('api')}  api:\n    build: ./api\n${dependsOn('db')}  db:\n    image: postgres:16\n`;
  const repo = (composeText: string) => [
    { path: 'docker-compose.yml', content: composeText },
    { path: 'web/package.json', content: '{"name":"web"}' }, { path: 'web/Dockerfile', content: 'FROM node:20\n' }, { path: 'web/main.ts', content: 'export {};\n' },
    { path: 'api/package.json', content: '{"name":"api"}' }, { path: 'api/Dockerfile', content: 'FROM node:20\n' }, { path: 'api/main.ts', content: 'export {};\n' },
  ];

  it('turns a block-list depends_on into a call link between parts and a data link to the postgres store', () => {
    const model = buildMap(factsFromFiles(repo(compose((name) => `    depends_on:\n      - ${name}\n`)), 'shop'));
    expect(model.links.filter((l) => l.kind !== 'import').map((l) => `${l.from}>${l.to}:${l.kind}`).sort()).toEqual(['api>ext:db:data', 'web>api:call']);
    expect(model.nodes['ext:db']).toMatchObject({ kind: 'external', desc: expect.stringContaining('PostgreSQL') });
  });

  it('reads the inline flow list depends_on: [x] the same way, quoted or not', () => {
    for (const style of [(n: string) => `[${n}]`, (n: string) => `["${n}"]`, (n: string) => `[ '${n}' ]`]) {
      const model = buildMap(factsFromFiles(repo(compose((name) => `    depends_on: ${style(name)}\n`)), 'shop'));
      expect(model.links.filter((l) => l.kind !== 'import').map((l) => `${l.from}>${l.to}:${l.kind}`).sort()).toEqual(['api>ext:db:data', 'web>api:call']);
    }
  });
});

// GoogleCloudPlatform/microservices-demo: a workload with no code of its own (redis-cart, the collector) took a
// top-level box named after its yaml folder and pushed real services into "more".
describe('deployablesFrom on deploy-only workloads', () => {
  const workload = (name: string, image: string, env = '') =>
    `apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: ${name}\nspec:\n  template:\n    spec:\n      containers:\n        - name: server\n          image: ${image}\n${env}`;
  const files = [
    { path: 'kubernetes-manifests/cartservice.yaml', content: `${workload('cartservice', 'cartservice', '          env:\n          - name: REDIS_ADDR\n            value: "redis-cart:6379"\n')}---\n${workload('redis-cart', 'redis:alpine')}` },
    { path: 'kustomize/components/otel/collector.yaml', content: workload('opentelemetrycollector', 'otel/opentelemetry-collector-contrib:0.1') },
    { path: 'src/cartservice/Dockerfile', content: 'FROM mcr.microsoft.com/dotnet/sdk:9.0\n' },
  ];

  it('draws only units with code as parts; a store it calls is an outside node', () => {
    const { parts, links, externals } = deployablesFrom(files, 'demo', true);
    expect(parts.map((p) => p.dir)).toEqual(['src/cartservice']);
    expect(externals.map((e) => e.name)).toEqual(['redis-cart']);
    expect(links.map((l) => `${l.from}>${l.to}:${l.kind}`)).toEqual([`src/cartservice>${externals[0]!.id}:data`]);
  });

  it('never lets an image-only compose service stand for src/', () => {
    const { parts } = deployablesFrom([{ path: 'compose.yml', content: 'services:\n  proxy:\n    image: traefik:v3\n' }], 'demo', true);
    expect(parts).toEqual([]);
  });

  it('does not read sources in languages it draws nothing for', () => {
    expect(['crates/milli/src/lib.rs', 'App/Main.swift', 'lib/app.php', 'src/Program.cs', 'cmd/main.go', 'app/models.py', 'src/Main.java'].map(acceptsMapFile))
      .toEqual([false, false, false, false, true, true, true]);
  });
});

// opentelemetry-demo and this repo: the root app stands for src/, and src/ also holds services (src/cart) or a
// library (src/lib). Those stay beside the app at the top, not inside it.
describe('the root app standing for src/', () => {
  it('keeps the parts under src/ beside it', () => {
    const model = buildMap(factsFromFiles([
      { path: 'package.json', content: '{"name":"demo","scripts":{"dev":"vite"}}' },
      { path: 'src/main.ts', content: "import './lib/core';\n" },
      { path: 'src/lib/package.json', content: '{"name":"core"}' },
      { path: 'src/lib/core.ts', content: 'export {};\n' },
      { path: 'src/cart/Dockerfile', content: 'FROM node:20\n' },
      { path: 'src/cart/index.ts', content: 'export {};\n' },
    ], 'demo'));
    expect(model.nodes.root.children.filter((id) => model.nodes[id]!.kind === 'part').sort()).toEqual(['src', 'src/cart', 'src/lib']);
  });
});
