import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import { RepoError } from '../discovery/githubRepo';
import { loadRepoMap, mapPriority, selectMapFile, type MapProgress } from './loadRepoMap';
import type { MapModel } from '../../dsl/map/types';

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
