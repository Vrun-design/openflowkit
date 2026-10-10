import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import { RepoError } from '../discovery/githubRepo';
import { loadRepoMap, mapPriority, selectMapFile, type MapProgress } from './loadRepoMap';
import type { MapModel } from '../../dsl/map/types';
import { buildMap } from '../../dsl/map/build';
import { factsFromFiles, isMapSource } from '../../dsl/map/facts';
import type { CacheEntry, CacheStore } from './cache';

const FILES: Record<string, string> = {
  'src/a.ts': "import { b } from './b';\nexport const a = b;\n",
  'src/b.ts': 'export const b = 1;\n',
  'pkg/main.py': 'print(1)\n',
  'tsconfig.json': '{}',
};
const TREE = [...Object.keys(FILES), 'src/a.test.ts', 'node_modules/x/index.js', 'README.md', 'logo.png'];

const fake = (async (input: RequestInfo | URL) => {
  const url = String(input);
  if (url.includes('/git/trees/')) return new Response(JSON.stringify({ tree: TREE.map((path) => ({ path, type: 'blob', size: 50 })), truncated: false }), { status: 200 });
  const path = Object.keys(FILES).find((p) => url.endsWith(`/${p}`));
  return path ? new Response(FILES[path]!, { status: 200 }) : new Response('nope', { status: 404 });
}) as typeof fetch;

describe('selectMapFile', () => {
  it('takes TS/JS/Py/Go sources and the configs, not tests, vendored code or docs', () => {
    expect(TREE.filter(selectMapFile)).toEqual(['src/a.ts', 'src/b.ts', 'pkg/main.py', 'tsconfig.json']);
    expect(selectMapFile('go.mod')).toBe(true);
    expect(selectMapFile('packages/x/package.json')).toBe(true);
  });
});

describe('loadRepoMap', () => {
  it('posts the tree alone first, then the map with lines and imports', async () => {
    const snaps: { model: MapModel; progress: MapProgress }[] = [];
    const model = await loadRepoMap({ owner: 'o', repo: 'r', ref: 'main' }, { fetch: fake, onSnapshot: (m, progress) => snaps.push({ model: m, progress }) });
    expect(snaps).toHaveLength(2);
    expect(snaps[0]!.model.stats).toMatchObject({ files: 3, loc: 0, imports: 0 });
    expect(snaps[0]!.progress).toEqual({ read: 0, total: 4 });
    expect(snaps[1]!.model).toBe(model);
    expect(model.stats.files).toBe(3);
    expect(model.stats.loc).toBeGreaterThan(0);
    expect(model.stats.imports).toBe(1);
    expect(model.source).toEqual({ repo: 'o/r', ref: 'main' });
  });

  it('rejects with the fetcher\'s RepoError and posts no map', async () => {
    const snaps: MapModel[] = [];
    const missing = (async () => new Response('{}', { status: 404 })) as typeof fetch;
    await expect(loadRepoMap({ owner: 'o', repo: 'r', ref: 'HEAD' }, { fetch: missing, onSnapshot: (m) => snaps.push(m) })).rejects.toBeInstanceOf(RepoError);
    expect(snaps).toHaveLength(0);
  });

  it('turns discovery units into parts and their relations into call links, skipping a root unit', async () => {
    const repo: Record<string, string> = {
      'docker-compose.yml': 'services:\n  web:\n    build: ./web\n    depends_on:\n      - api\n  api:\n    build: ./api\n',
      'web/Dockerfile': 'FROM node:20\n',
      'web/package.json': '{"name":"web"}',
      'web/index.ts': 'export const w = 1;\n',
      'api/Dockerfile': 'FROM node:20\n',
      'api/package.json': '{"name":"api"}',
      'api/index.ts': 'export const a = 1;\n',
      'package.json': '{"name":"root"}',
    };
    const get = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/git/trees/')) return new Response(JSON.stringify({ sha: 'treesha1', tree: Object.keys(repo).map((path) => ({ path, type: 'blob', size: 50 })) }), { status: 200 });
      const path = Object.keys(repo).find((p) => url.endsWith(`/${p}`));
      return path ? new Response(repo[path]!, { status: 200 }) : new Response('nope', { status: 404 });
    }) as typeof fetch;
    const snaps: MapModel[] = [];
    const model = await loadRepoMap({ owner: 'o', repo: 'r', ref: 'main' }, { fetch: get, onSnapshot: (m) => snaps.push(m) });
    expect(snaps[0]!.source.sha).toBe('treesha1');
    expect(model.source.sha).toBe('treesha1');
    expect(Object.values(model.nodes).filter((n) => n.kind === 'part').map((n) => n.id).sort()).toEqual(['api', 'web']);
    const call = model.links.filter((l) => l.kind === 'call');
    expect(call.length).toBeGreaterThan(0);
    expect(call[0]).toMatchObject({ from: 'web', to: 'api' });
    expect(call[0]!.evidence[0]!.file).toBe('docker-compose.yml');
  });

  it('lists a file over the size cap with 0 lines instead of dropping it', async () => {
    const big = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/git/trees/')) return new Response(JSON.stringify({ tree: [{ path: 'src/huge.ts', type: 'blob', size: 900_000 }, { path: 'src/a.ts', type: 'blob', size: 10 }] }), { status: 200 });
      return new Response('export {};\n', { status: 200 });
    }) as typeof fetch;
    const model = await loadRepoMap({ owner: 'o', repo: 'r', ref: 'main' }, { fetch: big, onSnapshot: () => undefined });
    expect(model.stats.files).toBe(2);
    expect(Object.values(model.nodes).find((n) => n.name === 'huge.ts')?.loc).toBe(0);
  });

  it('reads configs, then sources, then other architecture files', () => {
    expect(['docker-compose.yml', 'src/a.ts', 'tsconfig.json', 'go.mod'].sort((a, b) => mapPriority(a) - mapPriority(b))).toEqual(['tsconfig.json', 'go.mod', 'src/a.ts', 'docker-compose.yml']);
  });

  it('reports offline for a real closed port', async () => {
    const server = createServer();
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    await new Promise<void>((resolve) => server.close(() => resolve()));
    const error = await loadRepoMap({ owner: 'o', repo: 'r', ref: 'HEAD' }, { hosts: { api: url, raw: url }, onSnapshot: () => undefined }).catch((e: unknown) => e) as RepoError;
    expect(error).toBeInstanceOf(RepoError);
    expect(error.problem.kind).toBe('offline');
  });
});

describe('streaming, cache and sampling', () => {
  const repoOf = (count: number): Record<string, string> => {
    const repo: Record<string, string> = { 'tsconfig.json': '{}' };
    for (let i = 0; i < count; i++) repo[`src/d${i % 10}/f${i}.ts`] = `export const v${i} = ${i};\n`;
    return repo;
  };
  const serve = (repo: Record<string, string>, counter: { raw: number; tree: number }) => (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/git/trees/')) {
      counter.tree++;
      return new Response(JSON.stringify({ sha: 'tree1', tree: Object.keys(repo).map((path) => ({ path, type: 'blob', size: 30 })) }), { status: 200 });
    }
    counter.raw++;
    const path = Object.keys(repo).find((p) => url.endsWith(`/${p}`));
    return path ? new Response(repo[path]!, { status: 200 }) : new Response('nope', { status: 404 });
  }) as typeof fetch;
  const memory = (): CacheStore => {
    const rows = new Map<string, CacheEntry>();
    const used = new Map<string, number>();
    return { get: async (k) => rows.get(k), put: async (e) => { rows.set(e.key, e); }, touch: async (k, at) => { used.set(k, at); }, list: async () => [...used].map(([key, usedAt]) => ({ key, usedAt })), remove: async (k) => { rows.delete(k); used.delete(k); } };
  };

  it('posts growing snapshots while files arrive, and the last one equals the returned map', async () => {
    const counter = { raw: 0, tree: 0 };
    const snaps: { model: MapModel; progress: MapProgress }[] = [];
    const model = await loadRepoMap({ owner: 'o', repo: 'r', ref: 'main' }, { fetch: serve(repoOf(250), counter), cache: null, onSnapshot: (m, progress) => snaps.push({ model: m, progress }) });
    expect(snaps.length).toBeGreaterThanOrEqual(3);
    expect(snaps[0]!.model.stats.loc).toBe(0);
    const locs = snaps.map((s) => s.model.stats.loc);
    expect(locs).toEqual([...locs].sort((a, b) => a - b));
    expect(snaps.at(-1)!.model).toBe(model);
    expect(model.stats.files).toBe(250);
    expect(model.stats.loc).toBeGreaterThan(0);
  });

  it('answers a revisit of the same tree sha from the cache with one tree call and no file reads', async () => {
    const cache = memory();
    const first = { raw: 0, tree: 0 };
    const model = await loadRepoMap({ owner: 'o', repo: 'r', ref: 'main' }, { fetch: serve(repoOf(30), first), cache, onSnapshot: () => undefined });
    expect(first.raw).toBeGreaterThan(0);
    const again = { raw: 0, tree: 0 };
    const snaps: MapModel[] = [];
    const revisit = await loadRepoMap({ owner: 'o', repo: 'r', ref: 'main' }, { fetch: serve(repoOf(30), again), cache, onSnapshot: (m) => snaps.push(m) });
    expect(again).toEqual({ raw: 0, tree: 1 });
    expect(snaps).toHaveLength(1);
    expect(revisit.stats).toEqual(model.stats);
    expect(revisit.source.sha).toBe('tree1');
  });

  it('GitHub\'s limit reached with this repo cached: the cached map, said to be possibly out of date', async () => {
    const cache = memory();
    const model = await loadRepoMap({ owner: 'o', repo: 'r', ref: 'main' }, { fetch: serve(repoOf(30), { raw: 0, tree: 0 }), cache, onSnapshot: () => undefined });
    const limited = (async () => new Response('{}', { status: 403, headers: { 'x-ratelimit-remaining': '0' } })) as typeof fetch;
    const snaps: MapProgress[] = [];
    const again = await loadRepoMap({ owner: 'o', repo: 'r', ref: 'main' }, { fetch: limited, cache, onSnapshot: (_m, p) => snaps.push(p) });
    expect(again.stats).toEqual(model.stats);
    expect(snaps.at(-1)!.stale).toBe(true);
    // Only another ref cached: shown, and the note names the ref it is.
    const tag: MapProgress[] = [];
    await loadRepoMap({ owner: 'o', repo: 'r', ref: 'v1' }, { fetch: limited, cache, onSnapshot: (_m, p) => tag.push(p) });
    expect(tag.at(-1)).toMatchObject({ stale: true, staleRef: 'main' });
    expect(snaps.at(-1)!.staleRef).toBeUndefined();
    // Nothing cached for that repo: the limit is the answer.
    await expect(loadRepoMap({ owner: 'o', repo: 'other', ref: 'main' }, { fetch: limited, cache, onSnapshot: () => undefined })).rejects.toMatchObject({ problem: { kind: 'rate-limited' } });
  });

  it('does not remember a partial read', async () => {
    const cache = memory();
    const flaky = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/git/trees/')) return new Response(JSON.stringify({ sha: 't', tree: [{ path: 'a.ts', type: 'blob', size: 5 }, { path: 'b.ts', type: 'blob', size: 5 }, { path: 'c.ts', type: 'blob', size: 5 }] }), { status: 200 });
      return url.endsWith('/a.ts') ? new Response('x', { status: 404 }) : new Response('export {};\n', { status: 200 });
    }) as typeof fetch;
    await loadRepoMap({ owner: 'o', repo: 'r', ref: 'main' }, { fetch: flaky, cache, onSnapshot: () => undefined });
    expect(await cache.list()).toEqual([]);
  });

  it('samples by folder breadth above 5,000 sources and says how many were read', async () => {
    const repo: Record<string, string> = {};
    for (let i = 0; i < 5200; i++) repo[`d${i % 200}/f${i}.ts`] = 'export {};\n';
    const snaps: MapProgress[] = [];
    const model = await loadRepoMap({ owner: 'o', repo: 'r', ref: 'main' }, { fetch: serve(repo, { raw: 0, tree: 0 }), cache: null, onSnapshot: (_m, p) => snaps.push(p) });
    expect(snaps[0]!.sampled).toEqual({ read: 5000, total: 5200 });
    expect(model.stats.files).toBe(5000);
    expect(new Set(Object.values(model.nodes).filter((n) => n.kind === 'folder' || n.kind === 'part').map((n) => n.name)).size).toBeGreaterThanOrEqual(200);
  }, 60_000);

  const sized = (sources: number, size: number, extra: { truncated?: boolean; missing?: string } = {}) => (async (input: RequestInfo | URL) => {
    const url = String(input);
    const paths = Array.from({ length: sources }, (_, i) => `src/d${i % 5}/f${i}.ts`);
    if (url.includes('/git/trees/')) return new Response(JSON.stringify({ sha: 'big', truncated: extra.truncated ?? false, tree: [{ path: 'tsconfig.json', type: 'blob', size: 2 }, ...paths.map((path) => ({ path, type: 'blob', size }))] }), { status: 200 });
    return extra.missing && url.endsWith(`/${extra.missing}`) ? new Response('nope', { status: 404 }) : new Response(url.endsWith('.json') ? '{}' : 'export const x = 1;\n', { status: 200 });
  }) as typeof fetch;
  const finalProgress = async (fetcher: typeof fetch, cache: CacheStore | null = null) => {
    const snaps: MapProgress[] = [];
    const model = await loadRepoMap({ owner: 'o', repo: 'r', ref: 'main' }, { fetch: fetcher, cache, onSnapshot: (_m, p) => snaps.push(p) });
    return { model, first: snaps[0]!, last: snaps.at(-1)! };
  };

  it('past the 8 MB budget the map is what fits, and says so (no boxes that were never read)', async () => {
    const cache = memory();
    // 60 sources of 200 KB: 40 fit in 8 MB.
    const { model, first, last } = await finalProgress(sized(60, 200 * 1024), cache);
    expect(model.stats.files).toBe(40);
    expect(Object.values(model.nodes).filter((n) => n.kind === 'file').every((n) => n.loc > 0)).toBe(true);
    expect(first.sampled).toEqual({ read: 40, total: 60 });
    expect(last.sampled).toEqual({ read: 40, total: 60 });
    // The same tree gives the same cut, so it is cached, and a revisit says it is partial too.
    const again = await finalProgress(sized(60, 200 * 1024), cache);
    expect(again.last.sampled).toEqual({ read: 40, total: 60 });
  });

  it('counts a file that would not load out of what was read', async () => {
    const { last } = await finalProgress(sized(3, 10, { missing: 'src/d1/f1.ts' }));
    expect(last.sampled).toEqual({ read: 2, total: 3 });
  });

  it('says when GitHub cut the file list short', async () => {
    const { last } = await finalProgress(sized(3, 10, { truncated: true }));
    expect(last.sampled).toEqual({ read: 3, total: 3, truncated: true });
  });

  it('stops when aborted', async () => {
    const controller = new AbortController();
    const counter = { raw: 0, tree: 0 };
    const promise = loadRepoMap({ owner: 'o', repo: 'r', ref: 'main' }, { fetch: serve(repoOf(40), counter), cache: null, signal: controller.signal, onSnapshot: () => controller.abort(new Error('left')) });
    await expect(promise).rejects.toThrow('left');
  });
});

describe('root app and outside services', () => {
  const fakeRepo = (repo: Record<string, string>) => (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/git/trees/')) return new Response(JSON.stringify({ sha: 's', tree: Object.keys(repo).map((path) => ({ path, type: 'blob', size: 80 })) }), { status: 200 });
    const path = Object.keys(repo).find((p) => url.endsWith(`/${p}`));
    return path ? new Response(repo[path]!, { status: 200 }) : new Response('nope', { status: 404 });
  }) as typeof fetch;

  it('makes the root unit the part for src/, and a Worker\'s R2 binding a data link to an Outside services node', async () => {
    const repo = {
      'package.json': '{"name":"webapp","dependencies":{"react":"^19"}}',
      'src/main.ts': 'export {};\n',
      'worker/wrangler.toml': 'name = "share"\nmain = "index.ts"\n\n[[r2_buckets]]\nbinding = "SHARES"\nbucket_name = "shares"\n',
      'worker/index.ts': 'export {};\n',
    };
    const model = await loadRepoMap({ owner: 'o', repo: 'r', ref: 'main' }, { fetch: fakeRepo(repo), cache: null, onSnapshot: () => undefined });
    expect(model.nodes['src']?.kind).toBe('part');
    expect(model.nodes['src']?.name).toBe('webapp');
    const store = model.nodes['ext:shares'];
    expect(store).toMatchObject({ kind: 'external', name: 'shares' });
    expect(store?.desc).toContain('R2');
    const link = model.links.find((l) => l.to === 'ext:shares');
    expect(link).toMatchObject({ from: 'worker', kind: 'data' });
    expect(link?.evidence[0]).toMatchObject({ file: 'worker/wrangler.toml', line: 6 });
  });

  it('draws a compose database as a data link and an API service as a call link', async () => {
    const repo = {
      'docker-compose.yml': 'services:\n  api:\n    build: ./api\n    environment:\n      DATABASE_URL: postgres://db:5432/x\n  db:\n    image: postgres:16\n',
      'api/Dockerfile': 'FROM node:20\n',
      'api/package.json': '{"name":"api","dependencies":{"stripe":"^14"}}',
      'api/index.ts': "import Stripe from 'stripe';\nexport const s = Stripe;\n",
    };
    const model = await loadRepoMap({ owner: 'o', repo: 'r', ref: 'main' }, { fetch: fakeRepo(repo), cache: null, onSnapshot: () => undefined });
    const outside = model.links.filter((l) => l.from === 'api' && l.to.startsWith('ext:'));
    expect(outside.length).toBeGreaterThan(0);
    expect(outside.every((l) => l.evidence.length > 0)).toBe(true);
    expect(new Set(outside.map((l) => l.kind))).toContain('data');
  });
});

describe('browser map equals CLI map', () => {
  it('a cold streamed load ends JSON-equal to factsFromFiles + buildMap over the same files', async () => {
    const repo: Record<string, string> = {
      'package.json': '{"name":"app"}',
      'tsconfig.json': '{"extends":"./config/base.json"}',
      'config/base.json': '{"compilerOptions":{"paths":{"@/*":["../src/*"]}}}',
      'src/types.d.ts': 'export type T = 1;\n',
      'vendor/lib.ts': 'export const v = 1;\n',
      'docs/guide.ts': 'export const g = 1;\n',
      'src/huge.ts': 'export const h = 1;\n',
    };
    for (let i = 0; i < 260; i++) repo[`src/m${i % 13}/f${i}.ts`] = `import { x } from '@/m${(i + 1) % 13}/f${(i + 1) % 260}';\nexport const v${i} = x;\n`;
    const sizes: Record<string, number> = { 'src/huge.ts': 900_000 };
    const get = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/git/trees/')) return new Response(JSON.stringify({ sha: 's', tree: Object.keys(repo).map((path) => ({ path, type: 'blob', size: sizes[path] ?? 60 })) }), { status: 200 });
      const path = Object.keys(repo).find((p) => url.endsWith(`/${p}`));
      return path ? new Response(repo[path]!, { status: 200 }) : new Response('nope', { status: 404 });
    }) as typeof fetch;
    const streamed: MapModel[] = [];
    const model = await loadRepoMap({ owner: 'o', repo: 'r', ref: 'main' }, { fetch: get, cache: null, onSnapshot: (m) => streamed.push(m) });
    expect(streamed.length).toBeGreaterThan(3);
    const selected = Object.keys(repo).filter(selectMapFile);
    const files = selected.filter((p) => (sizes[p] ?? 0) <= 256 * 1024).map((path) => ({ path, content: repo[path]! }));
    const expected = buildMap({ ...factsFromFiles(files, 'r', { paths: selected, listed: selected.filter(isMapSource) }), source: { repo: 'o/r', ref: 'main', sha: 's' } });
    expect(JSON.parse(JSON.stringify(model))).toEqual(JSON.parse(JSON.stringify(expected)));
    // The browser leaks nothing the CLI skips, and keeps the oversize file as a 0-line box.
    expect(model.nodes['src/types.d.ts']).toBeUndefined();
    expect(Object.keys(model.nodes).some((id) => id.startsWith('vendor') || id.startsWith('docs'))).toBe(false);
    expect(model.nodes['src/huge.ts']?.loc).toBe(0);
    expect(model.stats.imports).toBeGreaterThan(200);
  });
});
