import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import { RepoError, fetchRepoFiles, githubEvidenceLink, parseRepoPath } from './githubRepo';

// Responses recorded from api.github.com and raw.githubusercontent.com on 2026-10-07
// (status, the headers the code reads, and the body as GitHub sent it).
const RATE_LIMITED = {
  status: 403,
  headers: { 'content-type': 'application/json; charset=utf-8', 'x-ratelimit-limit': '60', 'x-ratelimit-remaining': '0', 'x-ratelimit-used': '60', 'x-ratelimit-resource': 'core', 'x-ratelimit-reset': '1791396922' },
  body: '{"message":"API rate limit exceeded for 49.37.181.99. (But here\'s the good news: Authenticated requests get a higher rate limit. Check out the documentation for more details.)","documentation_url":"https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting"}',
};
const NOT_FOUND = {
  status: 404,
  headers: { 'content-type': 'application/json; charset=utf-8', 'x-ratelimit-remaining': '57' },
  body: '{"message":"Not Found","documentation_url":"https://docs.github.com/rest/git/trees#get-a-tree","status":"404"}',
};

function tree(paths: readonly string[], truncated = false, size = 120) {
  return {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      sha: '7fd1a60b01f91b314f59955a4e4d4e80d8edf11d',
      tree: paths.map((path) => ({ path, mode: '100644', type: 'blob', sha: '980a0d5f19a64b4b30a87d4206aade58726b60e3', size })),
      truncated,
    }),
  };
}

type Recorded = { status: number; headers: Record<string, string>; body: string };

function fakeGitHub(routes: Record<string, Recorded>, requested: string[] = []): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    requested.push(url);
    const hit = Object.entries(routes).find(([prefix]) => url.startsWith(prefix))?.[1];
    if (!hit) return new Response('404: Not Found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
    return new Response(hit.body, { status: hit.status, headers: hit.headers });
  }) as typeof fetch;
}

const raw = (body: string): Recorded => ({ status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' }, body });

describe('parseRepoPath', () => {
  it('reads owner/repo, a github.com URL and a /tree/ branch with slashes', () => {
    expect(parseRepoPath('octocat/Hello-World')).toEqual({ owner: 'octocat', repo: 'Hello-World', ref: 'HEAD' });
    expect(parseRepoPath('https://github.com/GoogleCloudPlatform/microservices-demo.git')).toEqual({ owner: 'GoogleCloudPlatform', repo: 'microservices-demo', ref: 'HEAD' });
    expect(parseRepoPath('github.com/acme/shop/tree/release/2.0/')).toBeNull();
    expect(parseRepoPath('https://github.com/acme/shop/tree/release%2F2.0')).toEqual({ owner: 'acme', repo: 'shop', ref: 'release/2.0' });
    expect(parseRepoPath('https://gitlab.com/acme/shop')).toBeNull();
    expect(parseRepoPath('acme')).toBeNull();
  });

  it('rejects dot segments, which could climb out of the repo path', () => {
    for (const bad of ['./shop', '../shop', 'acme/.', 'acme/..', 'acme/.github', 'acme/shop/tree/..', 'acme/shop/tree/.hidden', 'acme/shop/tree/a%2F..%2Fb', 'acme/shop/tree/%2E%2E', 'acme/shop/tree/%zz']) {
      expect(parseRepoPath(bad), bad).toBeNull();
    }
  });

  it('drops ?query, #hash, a trailing slash and .git before reading the name', () => {
    const want = { owner: 'acme', repo: 'shop', ref: 'HEAD' };
    expect(parseRepoPath('https://github.com/acme/shop.git?tab=readme#top')).toEqual(want);
    expect(parseRepoPath('https://github.com/acme/shop/#readme')).toEqual(want);
    expect(parseRepoPath('acme/shop.git/')).toEqual(want);
    expect(parseRepoPath('https://github.com/acme/shop/tree/release.git')).toEqual({ ...want, ref: 'release.git' });
    expect(parseRepoPath('https://github.com/acme/shop/tree/main?x=1#y')).toEqual({ ...want, ref: 'main' });
  });

  it('takes the first segment after tree/ as the ref and ignores a pasted subfolder', () => {
    expect(parseRepoPath('https://github.com/acme/shop/tree/main/services/api')).toEqual({ owner: 'acme', repo: 'shop', ref: 'main' });
    expect(parseRepoPath('https://github.com/acme/shop/tree/main//api')).toBeNull();
  });
});

describe('githubEvidenceLink', () => {
  it('points at the line, with every segment encoded', () => {
    const link = githubEvidenceLink({ owner: 'acme', repo: 'shop', ref: 'feat/a#b' });
    expect(link({ file: 'web app/package.json', line: 7 })).toBe('https://github.com/acme/shop/blob/feat/a%23b/web%20app/package.json#L7');
  });
});

describe('fetchRepoFiles', () => {
  it('reads only the files discovery uses, deploy manifests first, and stops at the cap', async () => {
    const requested: string[] = [];
    const get = fakeGitHub({
      'https://api.github.com/repos/acme/shop/git/trees/HEAD?recursive=1': tree([
        'README.md', 'docs/logo.png', 'src/web/app.ts', 'src/web/app.test.ts', 'k8s/web.yaml', 'src/web/package.json', 'e2e/flow.spec.ts',
      ]),
      'https://raw.githubusercontent.com/acme/shop/HEAD/k8s/web.yaml': raw('kind: Deployment\n'),
      'https://raw.githubusercontent.com/acme/shop/HEAD/src/web/package.json': raw('{"name":"web"}'),
      'https://raw.githubusercontent.com/acme/shop/HEAD/src/web/app.ts': raw("import x from 'y';\n"),
    }, requested);
    const result = await fetchRepoFiles({ owner: 'acme', repo: 'shop', ref: 'HEAD' }, { fetch: get, maxFiles: 2 });
    expect(result.wanted).toBe(3);
    expect(result.files.map((file) => file.path)).toEqual(['k8s/web.yaml', 'src/web/package.json']);
    expect(requested.filter((url) => url.includes('raw.githubusercontent.com'))).toHaveLength(2);
  });

  it('reads a branch with a slash in its name', async () => {
    const requested: string[] = [];
    const get = fakeGitHub({
      'https://api.github.com/repos/acme/shop/git/trees/release%2F2.0?recursive=1': tree(['Dockerfile']),
      'https://raw.githubusercontent.com/acme/shop/release/2.0/Dockerfile': raw('FROM node:20\n'),
    }, requested);
    const result = await fetchRepoFiles({ owner: 'acme', repo: 'shop', ref: 'release/2.0' }, { fetch: get });
    expect(result.files).toEqual([{ path: 'Dockerfile', content: 'FROM node:20\n' }]);
  });

  it('says when GitHub cut the listing short', async () => {
    const get = fakeGitHub({ 'https://api.github.com/': tree(['Dockerfile'], true), 'https://raw.githubusercontent.com/': raw('FROM node:20\n') });
    expect((await fetchRepoFiles({ owner: 'acme', repo: 'big', ref: 'HEAD' }, { fetch: get })).truncated).toBe(true);
  });

  it('turns the rate limit into its reset time', async () => {
    const error = await fetchRepoFiles({ owner: 'acme', repo: 'shop', ref: 'HEAD' }, { fetch: fakeGitHub({ 'https://api.github.com/': RATE_LIMITED }) }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(RepoError);
    expect((error as RepoError).problem).toEqual({ kind: 'rate-limited', resetAt: new Date(1791396922 * 1000) });
    expect((error as RepoError).message).toMatch(/60 repo reads an hour.*resets at .*CLI/);
  });

  it('says a 404 may be a private repo, and points at the CLI', async () => {
    const error = await fetchRepoFiles({ owner: 'acme', repo: 'secret', ref: 'HEAD' }, { fetch: fakeGitHub({ 'https://api.github.com/': NOT_FOUND }) }).catch((caught: unknown) => caught) as RepoError;
    expect(error.problem).toEqual({ kind: 'not-found' });
    expect(error.message).toMatch(/acme\/secret wasn't found\. Private repos need the CLI/);
  });

  it('reports offline when the network itself fails', async () => {
    const offline = (async () => { throw new TypeError('Failed to fetch'); }) as typeof fetch;
    const error = await fetchRepoFiles({ owner: 'acme', repo: 'shop', ref: 'HEAD' }, { fetch: offline }).catch((caught: unknown) => caught) as RepoError;
    expect(error.problem).toEqual({ kind: 'offline' });
  });

  it('skips a file that will not load instead of failing the scan', async () => {
    const get = fakeGitHub({
      'https://api.github.com/': tree(['Dockerfile', 'web/package.json']),
      'https://raw.githubusercontent.com/acme/shop/HEAD/Dockerfile': raw('FROM node:20\n'),
    });
    expect((await fetchRepoFiles({ owner: 'acme', repo: 'shop', ref: 'HEAD' }, { fetch: get })).files.map((file) => file.path)).toEqual(['Dockerfile']);
  });

  it('counts the files that would not load', async () => {
    const get = fakeGitHub({
      'https://api.github.com/': tree(['Dockerfile', 'a/Dockerfile', 'b/Dockerfile']),
      'https://raw.githubusercontent.com/acme/shop/HEAD/Dockerfile': raw('FROM node:20\n'),
      'https://raw.githubusercontent.com/acme/shop/HEAD/a/Dockerfile': raw('FROM node:20\n'),
      'https://raw.githubusercontent.com/acme/shop/HEAD/b/Dockerfile': { status: 429, headers: { 'retry-after': '60' }, body: 'slow down' },
    });
    const result = await fetchRepoFiles({ owner: 'acme', repo: 'shop', ref: 'HEAD' }, { fetch: get });
    expect(result.files).toHaveLength(2);
    expect(result.failed).toBe(1);
  });

  it('throws rate-limited when most raw files fail with 429', async () => {
    const get = fakeGitHub({
      'https://api.github.com/': tree(['Dockerfile', 'a/Dockerfile', 'b/Dockerfile']),
      'https://raw.githubusercontent.com/acme/shop/HEAD/Dockerfile': raw('FROM node:20\n'),
      'https://raw.githubusercontent.com/': { status: 429, headers: {}, body: 'slow down' },
    });
    const error = await fetchRepoFiles({ owner: 'acme', repo: 'shop', ref: 'HEAD' }, { fetch: get }).catch((caught: unknown) => caught) as RepoError;
    expect(error.problem.kind).toBe('rate-limited');
  });

  it('throws http when most raw files fail with a server error', async () => {
    const get = fakeGitHub({
      'https://api.github.com/': tree(['Dockerfile', 'a/Dockerfile']),
      'https://raw.githubusercontent.com/': { status: 503, headers: {}, body: '' },
    });
    const error = await fetchRepoFiles({ owner: 'acme', repo: 'shop', ref: 'HEAD' }, { fetch: get }).catch((caught: unknown) => caught) as RepoError;
    expect(error.problem).toEqual({ kind: 'http', status: 503 });
  });

  it('counts a body that fails to read as a failed file, not a rejected scan', async () => {
    const broken = new Response('x');
    broken.text = () => Promise.reject(new TypeError('terminated'));
    const get = (async (input: RequestInfo | URL) => String(input).includes('/git/trees/') ? new Response(tree(['Dockerfile', 'a/Dockerfile', 'b/Dockerfile', 'c/Dockerfile']).body)
      : String(input).endsWith('/c/Dockerfile') ? broken : new Response('FROM node:20\n')) as typeof fetch;
    const result = await fetchRepoFiles({ owner: 'acme', repo: 'shop', ref: 'HEAD' }, { fetch: get });
    expect(result.files).toHaveLength(3);
    expect(result.failed).toBe(1);
  });

  it('answers 409 as an empty repo', async () => {
    const error = await fetchRepoFiles({ owner: 'acme', repo: 'new', ref: 'HEAD' }, { fetch: fakeGitHub({ 'https://api.github.com/': { status: 409, headers: {}, body: '{"message":"Git Repository is empty."}' } }) }).catch((caught: unknown) => caught) as RepoError;
    expect(error.problem).toEqual({ kind: 'empty' });
  });

  it('reads 403 and 429 with retry-after (a secondary limit) as rate-limited', async () => {
    for (const status of [403, 429]) {
      const get = fakeGitHub({ 'https://api.github.com/': { status, headers: { 'retry-after': '60', 'x-ratelimit-remaining': '12' }, body: '{"message":"secondary rate limit"}' } });
      const error = await fetchRepoFiles({ owner: 'acme', repo: 'shop', ref: 'HEAD' }, { fetch: get }).catch((caught: unknown) => caught) as RepoError;
      expect(error.problem.kind, String(status)).toBe('rate-limited');
    }
  });

  it('skips a file over 256 KB without fetching it', async () => {
    const requested: string[] = [];
    const get = fakeGitHub({ 'https://api.github.com/': tree(['Dockerfile'], false, 300 * 1024), 'https://raw.githubusercontent.com/': raw('FROM node:20\n') }, requested);
    const result = await fetchRepoFiles({ owner: 'acme', repo: 'shop', ref: 'HEAD' }, { fetch: get });
    expect(result.files).toEqual([]);
    expect(requested.filter((url) => url.includes('raw.'))).toEqual([]);
  });

  it('stops at an 8 MB total and counts what it skipped', async () => {
    const paths = Array.from({ length: 50 }, (_, i) => `s${i}/Dockerfile`);
    const requested: string[] = [];
    const get = fakeGitHub({ 'https://api.github.com/': tree(paths, false, 200 * 1024), 'https://raw.githubusercontent.com/': raw('FROM node:20\n') }, requested);
    const result = await fetchRepoFiles({ owner: 'acme', repo: 'shop', ref: 'HEAD' }, { fetch: get });
    expect(result.files).toHaveLength(40);
    expect(result.skipped).toBe(10);
    expect(requested.filter((url) => url.includes('raw.'))).toHaveLength(40);
  });

  it('puts every owner, repo, ref and path segment through encodeURIComponent', async () => {
    const requested: string[] = [];
    const get = fakeGitHub({
      'https://api.github.com/': tree(['dir with #/a?b%2F.yaml', 'x/Dockerfile']),
      'https://raw.githubusercontent.com/': raw('FROM node:20\n'),
    }, requested);
    await fetchRepoFiles({ owner: 'acme', repo: 'sh op', ref: 'feat/a#b?c' }, { fetch: get });
    expect(requested[0]).toBe('https://api.github.com/repos/acme/sh%20op/git/trees/feat%2Fa%23b%3Fc?recursive=1');
    expect(requested.slice(1).sort()).toEqual([
      'https://raw.githubusercontent.com/acme/sh%20op/feat/a%23b%3Fc/dir%20with%20%23/a%3Fb%252F.yaml',
      'https://raw.githubusercontent.com/acme/sh%20op/feat/a%23b%3Fc/x/Dockerfile',
    ]);
  });

  it('stops fetching the rest once the network is gone, and fails offline', async () => {
    let raws = 0;
    const get = (async (input: RequestInfo | URL) => {
      if (String(input).includes('/git/trees/')) return new Response(tree(Array.from({ length: 100 }, (_, i) => `s${i}/Dockerfile`)).body);
      raws++;
      throw new TypeError('Failed to fetch');
    }) as typeof fetch;
    const error = await fetchRepoFiles({ owner: 'acme', repo: 'shop', ref: 'HEAD' }, { fetch: get }).catch((caught: unknown) => caught) as RepoError;
    expect(error.problem).toEqual({ kind: 'offline' });
    expect(raws).toBeLessThanOrEqual(8);
  });

  it('reports offline for a real closed port', async () => {
    const server = createServer();
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    await new Promise<void>((resolve) => server.close(() => resolve()));
    const error = await fetchRepoFiles({ owner: 'acme', repo: 'shop', ref: 'HEAD' }, { hosts: { api: url, raw: url } }).catch((caught: unknown) => caught) as RepoError;
    expect(error.problem).toEqual({ kind: 'offline' });
  });

  it('stops when the caller aborts, and says so with the abort, not as offline', async () => {
    const controller = new AbortController();
    const get = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('/git/trees/')) return new Response(tree(['Dockerfile', 'a/Dockerfile']).body);
      controller.abort();
      return init?.signal?.aborted ? Promise.reject(init.signal.reason) : new Response('x');
    }) as typeof fetch;
    const error = await fetchRepoFiles({ owner: 'acme', repo: 'shop', ref: 'HEAD' }, { fetch: get, signal: controller.signal }).catch((caught: unknown) => caught);
    expect(error).not.toBeInstanceOf(RepoError);
    expect((error as Error).name).toBe('AbortError');
  });

  it('counts the files cut by maxFiles as unread', async () => {
    const get = fakeGitHub({ 'https://api.github.com/': tree(['Dockerfile', 'a/Dockerfile', 'b/Dockerfile']), 'https://raw.githubusercontent.com/': raw('FROM node:20\n') });
    const result = await fetchRepoFiles({ owner: 'acme', repo: 'shop', ref: 'HEAD' }, { fetch: get, maxFiles: 1 });
    expect(result.unread).toBe(2);
    expect(result.wanted).toBe(3);
  });

  it('drops tree entries with dot or empty segments before fetching them', async () => {
    const requested: string[] = [];
    const get = fakeGitHub({ 'https://api.github.com/': tree(['../../evil/repo/HEAD/Dockerfile', 'a/../Dockerfile', './Dockerfile', 'a//Dockerfile', 'ok/Dockerfile']), 'https://raw.githubusercontent.com/': raw('FROM node:20\n') }, requested);
    const result = await fetchRepoFiles({ owner: 'acme', repo: 'shop', ref: 'HEAD' }, { fetch: get });
    expect(result.files.map((file) => file.path)).toEqual(['ok/Dockerfile']);
    expect(requested.filter((url) => url.includes('raw.'))).toHaveLength(1);
  });

  it('reports a request that never answers as offline', async () => {
    const hang = ((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal!.reason));
    })) as typeof fetch;
    const error = await fetchRepoFiles({ owner: 'acme', repo: 'shop', ref: 'HEAD' }, { fetch: hang, timeoutMs: 20 }).catch((caught: unknown) => caught) as RepoError;
    expect(error.problem).toEqual({ kind: 'offline' });
  });

  it('makes all-bodies-failed an error, not an empty result', async () => {
    const broken = () => { const response = new Response('x'); response.text = () => Promise.reject(new TypeError('terminated')); return response; };
    const get = (async (input: RequestInfo | URL) => String(input).includes('/git/trees/') ? new Response(tree(['Dockerfile', 'a/Dockerfile']).body) : broken()) as typeof fetch;
    const error = await fetchRepoFiles({ owner: 'acme', repo: 'shop', ref: 'HEAD' }, { fetch: get }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(RepoError);
  });

  it('words a raw 429 without the API hourly limit', async () => {
    const get = fakeGitHub({ 'https://api.github.com/': tree(['Dockerfile']), 'https://raw.githubusercontent.com/': { status: 429, headers: {}, body: '' } });
    const error = await fetchRepoFiles({ owner: 'acme', repo: 'shop', ref: 'HEAD' }, { fetch: get }).catch((caught: unknown) => caught) as RepoError;
    expect(error.problem.kind).toBe('rate-limited');
    expect(error.message).not.toMatch(/60 repo reads/);
  });

  it('reads a 422 from the API as not found', async () => {
    const error = await fetchRepoFiles({ owner: 'acme', repo: 'shop', ref: 'bad' }, { fetch: fakeGitHub({ 'https://api.github.com/': { status: 422, headers: {}, body: '{}' } }) }).catch((caught: unknown) => caught) as RepoError;
    expect(error.problem).toEqual({ kind: 'not-found' });
  });

  it('reports no progress after the scan has stopped', async () => {
    const seen: number[] = [];
    let calls = 0;
    const get = (async (input: RequestInfo | URL) => {
      if (String(input).includes('/git/trees/')) return new Response(tree(Array.from({ length: 30 }, (_, i) => `s${i}/Dockerfile`)).body);
      if (++calls === 1) throw new TypeError('Failed to fetch');
      await new Promise((resolve) => setTimeout(resolve, 20));
      return new Response('FROM node:20\n');
    }) as typeof fetch;
    await fetchRepoFiles({ owner: 'acme', repo: 'shop', ref: 'HEAD' }, { fetch: get, onProgress: (done) => seen.push(done) }).catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(seen).toEqual([]);
  });
});
