// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDocument, createTestNode } from '../src/opencanvas/testing/builders/documentBuilder';
import { decryptDocument, encryptDocument } from '../src/services/share/shareCrypto';
import { FakeBucket } from './fakeBucket';
import { handle, MAX_BODY_BYTES, type Env } from './index';

/** Cloudflare's documented siteverify shapes. */
const TURNSTILE_OK = { success: true, 'error-codes': [], challenge_ts: '2026-10-07T00:00:00Z', hostname: 'app.openflowkit.com' };
const TURNSTILE_BAD = { success: false, 'error-codes': ['invalid-input-response'] };

const siteverify = (result: unknown): typeof fetch => async (input, init) => {
  expect(String(input)).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
  const form = init?.body as URLSearchParams;
  expect(form.get('secret')).toBe('secret');
  return Response.json(result);
};

let bucket: FakeBucket;
let env: Env;
beforeEach(() => {
  bucket = new FakeBucket();
  env = { SHARES: bucket, TURNSTILE_SECRET: 'secret' };
});

const post = (body: Uint8Array | string, headers: Record<string, string> = {}) =>
  new Request('https://share.openflowkit.com/s', { method: 'POST', body, headers: { 'X-Turnstile-Token': 'tok', ...headers } });
/** Our envelope's shape: version byte 1, then at least IV + tag. */
const envelope = (length = 40, fill = 7): Uint8Array => { const bytes = new Uint8Array(length).fill(fill); bytes[0] = 1; return bytes; };
const upload = async (body: Uint8Array | string = envelope()) => {
  const response = await handle(post(body), env, siteverify(TURNSTILE_OK));
  return { response, ...(response.status === 201 ? await response.json() as { id: string; deleteToken: string } : { id: '', deleteToken: '' }) };
};
const url = (id: string) => `https://share.openflowkit.com/s/${id}`;

describe('share worker', () => {
  it('POST stores the body and GET streams it back', async () => {
    const sent = envelope(64, 9);
    const { response, id } = await upload(sent);
    expect(response.status).toBe(201);
    expect(id).toMatch(/^[0-9a-f]{32}$/);
    const got = await handle(new Request(url(id)), env);
    expect(got.status).toBe(200);
    expect(new Uint8Array(await got.arrayBuffer())).toEqual(sent);
    expect(got.headers.get('Cache-Control')).toBe('no-store');
    // Ciphertext is never rendered by a browser, whatever it looks like.
    expect(got.headers.get('Content-Type')).toBe('application/octet-stream');
    expect(got.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(got.headers.get('Content-Disposition')).toBe('attachment');
    expect(got.headers.get('Content-Security-Policy')).toBe("sandbox; default-src 'none'");
  });

  it('stores only ciphertext: no plaintext label, and only a hash of the delete token', async () => {
    const label = 'Confidential acquisition target';
    const { body } = await encryptDocument(createTestDocument({ nodes: [createTestNode('a', { content: { label } })] }));
    const { id, deleteToken } = await upload(body);
    const stored = bucket.objects.get(id)!;
    expect(new TextDecoder('latin1').decode(stored.bytes)).not.toContain(label);
    expect(stored.customMetadata.deleteHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(stored.customMetadata)).not.toContain(deleteToken);
  });

  it('a stored body decrypts with the key the browser kept', async () => {
    const doc = createTestDocument({ nodes: [createTestNode('a')] });
    const { body, key } = await encryptDocument(doc);
    const { id } = await upload(body);
    const got = new Uint8Array(await (await handle(new Request(url(id)), env)).arrayBuffer());
    expect(await decryptDocument(got, key)).toEqual(doc);
  });

  it('413 over 1 MiB, by Content-Length and by streamed bytes; exactly 1 MiB passes', async () => {
    const big = envelope(MAX_BODY_BYTES + 1);
    expect((await handle(post(big), env, siteverify(TURNSTILE_OK))).status).toBe(413);
    const chunked = new Request('https://share.openflowkit.com/s', {
      method: 'POST', headers: { 'X-Turnstile-Token': 'tok' }, duplex: 'half',
      body: new ReadableStream<Uint8Array>({ start(c) { c.enqueue(big.slice(0, 600_000)); c.enqueue(big.slice(0, 600_000)); c.close(); } }),
    } as RequestInit);
    expect((await handle(chunked, env, siteverify(TURNSTILE_OK))).status).toBe(413);
    expect(bucket.objects.size).toBe(0);
    expect((await upload(envelope(MAX_BODY_BYTES))).response.status).toBe(201);
  });

  it('413 on a declared Content-Length over 1 MiB, before the body is read or Turnstile asked', async () => {
    const neverCalled: typeof fetch = async () => { throw new Error('siteverify should not run'); };
    const response = await handle(post(envelope(), { 'Content-Length': String(MAX_BODY_BYTES + 1) }), env, neverCalled);
    expect(response.status).toBe(413);
  });

  it('400 for a body that is not our envelope (wrong version byte, or too short)', async () => {
    const wrongVersion = envelope(); wrongVersion[0] = 2;
    for (const body of [wrongVersion, envelope(28), new Uint8Array([1]), new TextEncoder().encode('{"hello":"plaintext json"}')]) {
      expect((await handle(post(body), env, siteverify(TURNSTILE_OK))).status).toBe(400);
    }
    expect(bucket.objects.size).toBe(0);
    expect((await upload(envelope(29))).response.status).toBe(201);
  });

  it('500 JSON with CORS headers when R2 fails, on every route', async () => {
    const { id, deleteToken } = await upload();
    const boom = async () => { throw new Error('R2 is down'); };
    Object.assign(bucket, { put: boom, get: boom, head: boom, delete: boom });
    const origin = { Origin: 'http://localhost:3000' };
    const responses = await Promise.all([
      handle(post(envelope(), origin), env, siteverify(TURNSTILE_OK)),
      handle(new Request(url(id), { headers: origin }), env),
      handle(new Request(url(id), { method: 'DELETE', headers: { ...origin, Authorization: `Bearer ${deleteToken}` } }), env),
    ]);
    for (const response of responses) {
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'storage-error' });
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    }
  });

  it('403 when Turnstile rejects the token, and nothing is stored', async () => {
    const response = await handle(post(envelope()), env, siteverify(TURNSTILE_BAD));
    expect(response.status).toBe(403);
    expect(bucket.objects.size).toBe(0);
  });

  it('503 when Turnstile cannot be reached', async () => {
    const down: typeof fetch = async () => { throw new TypeError('fetch failed'); };
    expect((await handle(post(envelope()), env, down)).status).toBe(503);
  });

  it('429 when the rate limiter says no, keyed by IP, before Turnstile is asked', async () => {
    const keys: string[] = [];
    env.RATE_LIMITER = { limit: async ({ key }) => { keys.push(key); return { success: false }; } };
    const neverCalled: typeof fetch = async () => { throw new Error('siteverify should not run'); };
    const response = await handle(post(envelope(), { 'CF-Connecting-IP': '203.0.113.7' }), env, neverCalled);
    expect(response.status).toBe(429);
    expect(keys).toEqual(['203.0.113.7']);
  });

  it('400 on an empty body', async () => {
    expect((await handle(post(new Uint8Array()), env, siteverify(TURNSTILE_OK))).status).toBe(400);
  });

  it('404 for an unknown id and for a path that is not an id', async () => {
    expect((await handle(new Request(url('0'.repeat(32))), env)).status).toBe(404);
    expect((await handle(new Request(url('nope')), env)).status).toBe(404);
    expect((await handle(new Request(url('0'.repeat(32)), { method: 'DELETE' }), env)).status).toBe(404);
  });

  it('403 for a wrong or missing delete token, and the object survives', async () => {
    const { id } = await upload();
    for (const headers of [{ Authorization: 'Bearer wrong' }, {}] as Record<string, string>[]) {
      expect((await handle(new Request(url(id), { method: 'DELETE', headers }), env)).status).toBe(403);
    }
    expect(bucket.objects.has(id)).toBe(true);
  });

  it('204 on delete with the right token, then 404', async () => {
    const { id, deleteToken } = await upload();
    const removed = await handle(new Request(url(id), { method: 'DELETE', headers: { Authorization: `Bearer ${deleteToken}` } }), env);
    expect(removed.status).toBe(204);
    expect((await handle(new Request(url(id)), env)).status).toBe(404);
  });

  it('CORS origins come from ALLOWED_ORIGINS (default: the app), localhost always', async () => {
    const allowed = async (origin: string, vars: Partial<Env> = {}) => (await handle(new Request(url('0'.repeat(32)), {
      method: 'OPTIONS', headers: { Origin: origin },
    }), { ...env, ...vars })).headers.get('Access-Control-Allow-Origin');
    expect(await allowed('https://app.openflowkit.com')).toBe('https://app.openflowkit.com');
    expect(await allowed('https://staging.example.com')).toBeNull();
    const vars = { ALLOWED_ORIGINS: 'https://staging.example.com, https://app.example.org' };
    expect(await allowed('https://staging.example.com', vars)).toBe('https://staging.example.com');
    expect(await allowed('https://app.example.org', vars)).toBe('https://app.example.org');
    expect(await allowed('https://app.openflowkit.com', vars)).toBeNull();
    expect(await allowed('http://localhost:5173', vars)).toBe('http://localhost:5173');
  });

  it('CORS: allows the app and localhost, not other origins', async () => {
    const preflight = (origin: string) => handle(new Request(url('0'.repeat(32)), {
      method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST' },
    }), env);
    for (const origin of ['https://app.openflowkit.com', 'http://localhost:3000', 'http://127.0.0.1:4173']) {
      const response = await preflight(origin);
      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, DELETE, OPTIONS');
    }
    expect((await preflight('https://evil.example')).headers.get('Access-Control-Allow-Origin')).toBeNull();
    const { response } = await upload();
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});
