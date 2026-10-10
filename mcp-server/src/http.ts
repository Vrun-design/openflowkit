#!/usr/bin/env node
// Remote MCP over Streamable HTTP: stateless, no login, stores nothing. One server and transport per request.
import { readFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createRemoteServer } from './remote/server.js';
import { DEFAULT_APP_ORIGIN } from './lib/openLink.js';
import type { RemoteServerOptions } from './remote/server.js';
import { isMain } from './lib/isMain.js';

export const MAX_BODY_BYTES = 512 * 1024;
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

export interface HttpOptions extends Pick<RemoteServerOptions, 'deadlineMs' | 'layout'> {
  readonly viewerHtml: string;
  /** Renders in flight at once; the next gets 503 + Retry-After. Default 4. */
  readonly maxRenders?: number;
  readonly appOrigin?: string;
  /** Hostnames (no port) a request's Host header may carry; DNS-rebinding protection. */
  readonly allowedHosts?: readonly string[];
}

function json(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
  res.writeHead(status, { 'content-type': 'application/json', ...headers }).end(JSON.stringify(body));
}

const rpcError = (res: ServerResponse, status: number, message: string, headers?: Record<string, string>) =>
  json(res, status, { jsonrpc: '2.0', error: { code: -32000, message }, id: null }, headers);

function hostname(header: string | undefined): string | null {
  if (!header) return null;
  try { return new URL(`http://${header}`).hostname; } catch { return null; }
}

/** The body as a string, or null once it passes the cap: reading stops there and the caller answers 413, then destroys the request. */
function readBody(req: IncomingMessage): Promise<string | null> {
  return new Promise((done, fail) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) { req.pause(); req.removeAllListeners('data'); done(null); } else chunks.push(chunk);
    });
    req.on('end', () => done(Buffer.concat(chunks).toString('utf8')));
    req.on('error', fail);
  });
}

function tooBig(req: IncomingMessage, res: ServerResponse): void {
  res.writeHead(413, { 'content-type': 'application/json', connection: 'close' })
    .end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Request body over 512 KB' }, id: null }), () => req.destroy());
}

const isRender = (message: unknown): boolean => {
  const call = message as { method?: string; params?: { name?: string } } | null;
  return call?.method === 'tools/call' && call.params?.name === 'render_diagram';
};

export function createHttpServer({ viewerHtml, appOrigin = DEFAULT_APP_ORIGIN, allowedHosts = LOCAL_HOSTS, maxRenders = 4, ...tool }: HttpOptions): Server {
  let renders = 0;
  return createServer(async (req, res) => {
    try {
      const path = new URL(req.url ?? '/', 'http://x').pathname;
      if (path === '/healthz') return void res.writeHead(200, { 'content-type': 'text/plain' }).end('ok');
      const host = hostname(req.headers.host);
      if (!host || !allowedHosts.includes(host)) return rpcError(res, 403, `Invalid Host: ${req.headers.host ?? 'missing'}`);
      if (path !== '/mcp') return rpcError(res, 404, 'Not found');
      // Stateless: no session to resume (GET would hold an SSE stream open forever) or end (DELETE).
      if (req.method !== 'POST') return rpcError(res, 405, 'Method not allowed', { allow: 'POST' });
      if (Number(req.headers['content-length'] ?? 0) > MAX_BODY_BYTES) return tooBig(req, res);

      const body = await readBody(req);
      if (body === null) return tooBig(req, res);
      let parsed: unknown;
      try { parsed = JSON.parse(body); } catch { return rpcError(res, 400, 'Body is not JSON'); }
      if (Array.isArray(parsed) ? parsed.some(isRender) : isRender(parsed)) {
        if (renders >= maxRenders) return rpcError(res, 503, 'Too many diagrams rendering; retry shortly', { 'retry-after': '2' });
        renders += 1;
        res.once('close', () => { renders -= 1; });
      }
      const server = createRemoteServer({ viewerHtml, appOrigin, ...tool });
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      res.on('close', () => { void transport.close(); void server.close(); });
      await server.connect(transport);
      await transport.handleRequest(req, res, parsed);
    } catch (error) {
      console.error('openflowkit-http:', error);
      if (!res.headersSent) rpcError(res, 500, 'Internal error');
    }
  });
}

/** OPENFLOWKIT_ALLOWED_HOSTS: comma-separated hostnames. HOST decides the bind address; unset means localhost only. */
function main(): void {
  const port = Number.parseInt(process.env.PORT ?? '', 10) || 8787;
  const bind = process.env.HOST ?? '127.0.0.1';
  const extra = (process.env.OPENFLOWKIT_ALLOWED_HOSTS ?? '').split(',').map((h) => h.trim()).filter(Boolean);
  const local = ['127.0.0.1', 'localhost', '::1'].includes(bind);
  if (!local && extra.length === 0) throw new Error('HOST is not localhost: set OPENFLOWKIT_ALLOWED_HOSTS to the hostnames this server answers to');
  const viewerPath = resolve(fileURLToPath(new URL('.', import.meta.url)), 'viewer', 'viewer.html');
  const viewerHtml = readFileSync(viewerPath, 'utf8');
  const server = createHttpServer({
    viewerHtml,
    appOrigin: process.env.APP_ORIGIN || DEFAULT_APP_ORIGIN,
    allowedHosts: local ? [...LOCAL_HOSTS, ...extra] : extra,
  });
  server.listen(port, bind, () => console.error(`openflowkit-http: listening on http://${bind}:${port}/mcp`));
}

if (isMain(import.meta.url)) main();
