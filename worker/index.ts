// Share-link store: an encrypted blob in R2 under a random id. The Worker never sees a key or a
// plaintext (the key lives in the link's #fragment, which browsers do not send).
//   POST   /s      body = ciphertext, X-Turnstile-Token header → 201 { id, deleteToken }
//   GET    /s/:id  → the ciphertext, 404 when unknown or deleted
//   DELETE /s/:id  Authorization: Bearer <deleteToken> → 204
// Types are the minimum this file uses from Workers; no @cloudflare/workers-types dependency.

export interface R2ObjectLike {
  readonly size: number;
  readonly customMetadata?: Record<string, string>;
}
export interface R2ObjectBodyLike extends R2ObjectLike {
  readonly body: ReadableStream<Uint8Array>;
}
export interface R2BucketLike {
  put(key: string, value: ArrayBuffer | Uint8Array, options?: { customMetadata?: Record<string, string> }): Promise<unknown>;
  get(key: string): Promise<R2ObjectBodyLike | null>;
  head(key: string): Promise<R2ObjectLike | null>;
  delete(key: string): Promise<void>;
}
export interface RateLimiterLike {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}
export interface Env {
  SHARES: R2BucketLike;
  TURNSTILE_SECRET: string;
  /** Cloudflare Rate Limiting binding; absent means no limit (local dev). */
  RATE_LIMITER?: RateLimiterLike;
  /** Comma-separated app origins allowed by CORS. Default: https://app.openflowkit.com. localhost and 127.0.0.1 are always allowed (dev). */
  ALLOWED_ORIGINS?: string;
}

export const MAX_BODY_BYTES = 1_048_576;
const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const ID_PATTERN = /^\/s\/([0-9a-f]{32})$/;
const DEV_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const DEFAULT_ORIGINS = 'https://app.openflowkit.com';
// The browser's envelope (src/services/share/shareCrypto.ts): version byte 1, 12-byte IV, ciphertext + 16-byte tag.
const ENVELOPE_VERSION = 1;
const MIN_ENVELOPE_BYTES = 1 + 12 + 16;

const hex = (bytes: Uint8Array): string => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
const randomHex = (bytes: number): string => hex(crypto.getRandomValues(new Uint8Array(bytes)));
const sha256Hex = async (text: string): Promise<string> =>
  hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))));

/** Equal-length strings only (both are SHA-256 hex); no early exit on the first difference. */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin');
  const allowed = (env.ALLOWED_ORIGINS ?? DEFAULT_ORIGINS).split(',').map((entry) => entry.trim());
  if (!origin || !(DEV_ORIGIN.test(origin) || allowed.includes(origin))) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Turnstile-Token, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

/** Reads at most `limit` bytes; null when the body is larger (chunked uploads have no Content-Length to trust). */
async function readCapped(request: Request, limit: number): Promise<Uint8Array | null> {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
  return body;
}

async function turnstilePasses(token: string, ip: string, env: Env, fetcher: typeof fetch): Promise<boolean | 'unavailable'> {
  try {
    const response = await fetcher(SITEVERIFY, {
      method: 'POST',
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip }),
    });
    const result = await response.json() as { success?: boolean };
    return result.success === true;
  } catch {
    return 'unavailable';
  }
}

async function create(request: Request, env: Env, fetcher: typeof fetch): Promise<Response> {
  const declared = Number(request.headers.get('Content-Length') ?? 0);
  if (declared > MAX_BODY_BYTES) return json(413, { error: 'too-large' });
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  // ponytail: Cloudflare's binding counts per colo and is eventually consistent, so the ceiling is
  // per-location and soft — enough to stop a script, not a distributed flood. Upgrade: a Durable Object counter.
  if (env.RATE_LIMITER && !(await env.RATE_LIMITER.limit({ key: ip })).success) return json(429, { error: 'rate-limited' });
  const verdict = await turnstilePasses(request.headers.get('X-Turnstile-Token') ?? '', ip, env, fetcher);
  if (verdict === 'unavailable') return json(503, { error: 'turnstile-unavailable' });
  if (!verdict) return json(403, { error: 'turnstile-failed' });
  const body = await readCapped(request, MAX_BODY_BYTES);
  if (!body) return json(413, { error: 'too-large' });
  // Only our own envelope is stored: this is not general file hosting.
  if (body.length < MIN_ENVELOPE_BYTES || body[0] !== ENVELOPE_VERSION) return json(400, { error: 'not-an-envelope' });
  const id = randomHex(16);
  const deleteToken = randomHex(32);
  await env.SHARES.put(id, body, { customMetadata: { deleteHash: await sha256Hex(deleteToken) } });
  return json(201, { id, deleteToken });
}

async function read(id: string, env: Env): Promise<Response> {
  const object = await env.SHARES.get(id);
  if (!object) return json(404, { error: 'not-found' });
  // no-store: a deleted link must stop opening, not linger in a cache.
  // Opaque bytes, never a page: nosniff + attachment + a sandboxing CSP keep a browser from rendering them.
  return new Response(object.body, { headers: {
    'Content-Type': 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': 'attachment', 'Content-Security-Policy': "sandbox; default-src 'none'",
  } });
}

async function remove(id: string, request: Request, env: Env): Promise<Response> {
  const object = await env.SHARES.head(id);
  if (!object) return json(404, { error: 'not-found' });
  const token = /^Bearer (.+)$/.exec(request.headers.get('Authorization') ?? '')?.[1] ?? '';
  const matches = constantTimeEqual(await sha256Hex(token), object.customMetadata?.deleteHash ?? '');
  if (!matches) return json(403, { error: 'bad-delete-token' });
  await env.SHARES.delete(id);
  return new Response(null, { status: 204 });
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function handle(request: Request, env: Env, fetcher: typeof fetch = fetch): Promise<Response> {
  const cors = corsHeaders(request, env);
  const respond = (response: Response): Response => {
    for (const [name, value] of Object.entries(cors)) response.headers.set(name, value);
    return response;
  };
  if (request.method === 'OPTIONS') return respond(new Response(null, { status: 204 }));
  const { pathname } = new URL(request.url);
  const id = ID_PATTERN.exec(pathname)?.[1];
  try {
    if (pathname === '/s' && request.method === 'POST') return respond(await create(request, env, fetcher));
    if (id && request.method === 'GET') return respond(await read(id, env));
    if (id && request.method === 'DELETE') return respond(await remove(id, request, env));
  } catch {
    // R2 failed: say so with CORS headers, so the browser reads a server error, not "offline".
    return respond(json(500, { error: 'storage-error' }));
  }
  return respond(json(id || pathname === '/s' ? 405 : 404, { error: id || pathname === '/s' ? 'method-not-allowed' : 'not-found' }));
}

export default {
  fetch: (request: Request, env: Env): Promise<Response> => handle(request, env),
};
