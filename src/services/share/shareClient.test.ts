// @vitest-environment node
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { FakeBucket } from '../../../worker/fakeBucket';
import { handle, type Env } from '../../../worker/index';
import { createTestDocument, createTestNode } from '../../opencanvas/testing/builders/documentBuilder';
import {
  browserStorage, createShareLink, deleteShare, forgetShare, latestShareFor, loadSharedDocument, rememberShare, ShareError,
} from './shareClient';
import { encryptDocument } from './shareCrypto';

// Real HTTP, real sockets: the Worker's handler behind a Node server, and a port nobody listens on.
const bucket = new FakeBucket();
const env: Env = { SHARES: bucket, TURNSTILE_SECRET: 's' };
const passing: typeof fetch = async () => Response.json({ success: true, 'error-codes': [] });
let server: Server;
let origin: string;
let deadOrigin: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const method = req.method ?? 'GET';
      const request = new Request(`http://${req.headers.host}${req.url}`, {
        method, headers: req.headers as Record<string, string>, ...(method === 'GET' || method === 'DELETE' ? {} : { body: Buffer.concat(chunks) }),
      });
      void handle(request, env, passing).then(async (response) => {
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(Buffer.from(await response.arrayBuffer()));
      });
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const closed = createServer();
  await new Promise<void>((resolve) => closed.listen(0, '127.0.0.1', resolve));
  deadOrigin = `http://127.0.0.1:${(closed.address() as AddressInfo).port}`;
  await new Promise((resolve) => closed.close(resolve));
  return () => server.close();
});
afterEach(() => bucket.objects.clear());

const doc = () => createTestDocument({ nodes: [createTestNode('a', { content: { label: 'Auth service' } })] });
const share = () => createShareLink(doc(), { appUrl: 'https://app.openflowkit.com/#/d/xyz', getTurnstileToken: async () => 't', origin });
const idKey = (url: string) => { const [, id, key] = /#\/s\/([0-9a-f]{32})\/([\w-]{43})$/.exec(url)!; return { id: id!, key: key! }; };

describe('share client against a real server', () => {
  it('create → open round-trips; the key is only in the fragment', async () => {
    const { url } = await share();
    expect(url).toMatch(/^https:\/\/app\.openflowkit\.com\/#\/s\/[0-9a-f]{32}\/[\w-]{43}$/);
    const { id, key } = idKey(url);
    expect(await loadSharedDocument(id, key, origin)).toEqual({ document: doc() });
  });

  it('a link with its key stripped says so, without a request', async () => {
    const { id } = idKey((await share()).url);
    const result = await loadSharedDocument(id, undefined, deadOrigin);
    expect(result).toMatchObject({ problem: { title: expect.stringMatching(/missing its key/) } });
  });

  it('a cut-short key is reported as incomplete', async () => {
    const { id, key } = idKey((await share()).url);
    expect(await loadSharedDocument(id, key.slice(0, 30), origin)).toMatchObject({ problem: { title: expect.stringMatching(/incomplete/) } });
  });

  it('a deleted link says deleted', async () => {
    const link = await share();
    const { id, key } = idKey(link.url);
    await deleteShare(id, link.deleteToken, origin);
    expect(await loadSharedDocument(id, key, origin)).toMatchObject({ problem: { title: expect.stringMatching(/deleted/), retry: false } });
  });

  it('delete with a wrong token fails and the link still opens', async () => {
    const link = await share();
    const { id, key } = idKey(link.url);
    await expect(deleteShare(id, 'nope', origin)).rejects.toMatchObject({ code: 'forbidden' });
    expect(await loadSharedDocument(id, key, origin)).toHaveProperty('document');
  });

  it('opened with no connection: offline, retryable (a port nobody listens on)', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    try {
      const result = await loadSharedDocument('0'.repeat(32), 'k'.repeat(43), deadOrigin);
      expect(result).toMatchObject({ problem: { title: 'You’re offline.', retry: true } });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('sharing with no connection: a readable offline error', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    try {
      await expect(createShareLink(doc(), { appUrl: 'x', getTurnstileToken: async () => 't', origin: deadOrigin }))
        .rejects.toMatchObject({ code: 'offline', message: expect.stringMatching(/Check your connection/) });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('online but the service is down: blames the service, not the connection', async () => {
    vi.stubGlobal('navigator', { onLine: true });
    try {
      await expect(createShareLink(doc(), { appUrl: 'x', getTurnstileToken: async () => 't', origin: deadOrigin }))
        .rejects.toMatchObject({ code: 'unreachable', message: 'The share service isn’t reachable right now.' });
      expect(await loadSharedDocument('0'.repeat(32), 'k'.repeat(43), deadOrigin))
        .toMatchObject({ problem: { title: 'The share service isn’t reachable right now.', retry: true } });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('an old link whose envelope version is unknown names the version problem', async () => {
    const { body, key } = await encryptDocument(doc());
    body[0] = 99;
    // An old or future client's body: the Worker only accepts today's version, so it is placed directly.
    const id = 'a'.repeat(32);
    await bucket.put(id, body);
    expect(await loadSharedDocument(id, key, origin)).toMatchObject({ problem: { title: 'This link needs a different version.' } });
  });

  it('a wrong key is a decrypt failure, not a crash', async () => {
    const { id } = idKey((await share()).url);
    const other = idKey((await share()).url).key;
    expect(await loadSharedDocument(id, other, origin)).toMatchObject({ problem: { title: 'This link couldn’t be opened.' } });
  });

  it('over 1 MB: refused before any request (dead origin proves none was made)', async () => {
    const big = createTestDocument({ nodes: [createTestNode('a', { content: { label: 'x'.repeat(1_100_000) } })] });
    await expect(createShareLink(big, { appUrl: 'x', getTurnstileToken: async () => { throw new Error('no turnstile'); }, origin: deadOrigin }))
      .rejects.toSatisfy((error: unknown) => error instanceof ShareError && error.code === 'too-large');
  });
});

describe('delete tokens kept in the browser', () => {
  const storage = (): Storage => { const map = new Map<string, string>(); return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) } as Storage; };
  it('remembers per document and forgets on delete', () => {
    const s = storage();
    rememberShare(s, 'doc-1', 'id-1', 'tok-1');
    rememberShare(s, 'doc-2', 'id-2', 'tok-2');
    expect(latestShareFor(s, 'doc-1')).toEqual({ id: 'id-1', deleteToken: 'tok-1' });
    forgetShare(s, 'id-1');
    expect(latestShareFor(s, 'doc-1')).toBeNull();
    expect(latestShareFor(s, 'doc-2')).not.toBeNull();
  });
  it('the newest link of a document is the one offered for deletion', () => {
    const s = storage();
    rememberShare(s, 'doc-1', 'old', 'tok-old');
    rememberShare(s, 'doc-1', 'new', 'tok-new');
    expect(latestShareFor(s, 'doc-1')).toEqual({ id: 'new', deleteToken: 'tok-new' });
  });
  it.each(['{not json', 'null', '[]', '"text"', '{"a":1}', '{"a":{"docId":1}}'])('survives corrupt storage %s', (value) => {
    const s = storage();
    s.setItem('ofk-shares', value);
    expect(latestShareFor(s, 'doc-1')).toBeNull();
    rememberShare(s, 'doc-1', 'id', 'tok');
    expect(latestShareFor(s, 'doc-1')).toEqual({ id: 'id', deleteToken: 'tok' });
  });
  it('blocked storage (SecurityError on access or use) reads as no links and never throws', () => {
    const blocked = { getItem: () => { throw new DOMException('denied', 'SecurityError'); }, setItem: () => { throw new DOMException('denied', 'SecurityError'); } } as unknown as Storage;
    expect(latestShareFor(blocked, 'doc-1')).toBeNull();
    expect(() => rememberShare(blocked, 'doc-1', 'id', 'tok')).not.toThrow();
    expect(latestShareFor(null, 'doc-1')).toBeNull();
    expect(browserStorage({ get localStorage(): Storage { throw new DOMException('denied', 'SecurityError'); } })).toBeNull();
  });
  it('a 403 on delete is its own error, so the caller can drop the token', async () => {
    const link = await share();
    await expect(deleteShare(idKey(link.url).id, 'wrong', origin)).rejects.toMatchObject({ code: 'forbidden' });
  });
});
