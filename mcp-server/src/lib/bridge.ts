// Live bridge server: pairs this MCP server with a local editor window.
//
// Transport is HTTP long-polling over stdlib `http` (no WebSocket dependency):
// the editor parks on `GET /next`, the server hands it one op request at a
// time, and the editor posts the result back. A parked request doubles as the
// liveness signal. Every request is origin-checked and optionally token-gated,
// so a random web page cannot drive the editor.
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import {
  BRIDGE_IDLE_MS, BRIDGE_POLL_SECONDS, BRIDGE_PROTOCOL_VERSION, bridgeTokenHeader,
  isAllowedBridgeOrigin, type BridgeClientInfo, type BridgeHealth, type BridgeRequest,
} from './agent.js';
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from './version.js';

const MAX_BODY_BYTES = 32 * 1024 * 1024;

interface PendingCall {
  readonly resolve: (output: unknown) => void;
  readonly reject: (error: Error) => void;
  readonly timer: NodeJS.Timeout;
}

export interface LiveBridgeOptions {
  readonly port: number;
  /** Required on every request when set (OPENFLOWKIT_BRIDGE_TOKEN). */
  readonly token?: string;
  readonly callTimeoutMs?: number;
  readonly log?: (message: string) => void;
}

export class LiveBridge {
  private server: Server | null = null;
  private client: (BridgeClientInfo & { readonly origin: string | null }) | null = null;
  private lastSeenAt: number | null = null;
  private parked: ServerResponse | null = null;
  private readonly queue: BridgeRequest[] = [];
  private readonly pending = new Map<string, PendingCall>();
  private readonly options: LiveBridgeOptions;

  constructor(options: LiveBridgeOptions) {
    this.options = options;
  }

  get connected(): boolean {
    return this.client !== null && this.lastSeenAt !== null && Date.now() - this.lastSeenAt < BRIDGE_IDLE_MS;
  }

  /** Starts listening; resolves with the bound port (or rejects on EADDRINUSE). */
  async start(): Promise<number> {
    if (this.server) return this.options.port;
    const server = createServer((request, response) => { void this.handle(request, response); });
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(this.options.port, '127.0.0.1', () => resolve());
    });
    this.server = server;
    return (server.address() as { port: number }).port;
  }

  async stop(): Promise<void> {
    for (const [, call] of this.pending) { clearTimeout(call.timer); call.reject(new Error('Bridge stopped.')); }
    this.pending.clear();
    if (this.parked) this.respond(this.parked, 204, null);
    this.parked = null;
    const server = this.server;
    this.server = null;
    this.client = null;
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  health(): BridgeHealth {
    return {
      ok: true,
      protocol: BRIDGE_PROTOCOL_VERSION,
      name: MCP_SERVER_NAME,
      version: MCP_SERVER_VERSION,
      connected: this.connected,
      documentId: this.client?.documentId ?? null,
      documentName: this.client?.name ?? null,
      pageId: this.connected ? this.client?.pageId ?? null : null,
      pages: this.connected ? this.client?.pages ?? [] : [],
      lastSeenMs: this.lastSeenAt === null ? null : Date.now() - this.lastSeenAt,
    };
  }

  /** How long an op may wait: a parked editor replies instantly. */
  private get callTimeoutMs(): number {
    return this.options.callTimeoutMs ?? (BRIDGE_POLL_SECONDS + 20) * 1000;
  }

  /** Sends one op to the paired editor and waits for its result. */
  async call(op: string, input: unknown, pageId?: string): Promise<unknown> {
    if (!this.connected) {
      throw new Error('No editor is connected. Open the app and click "Connect agent" (or start the MCP server from the editor).');
    }
    const request: BridgeRequest = { id: randomUUID(), op, input, ...(pageId ? { pageId } : {}) };
    const promise = new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(request.id);
        reject(new Error(`The editor did not answer "${op}" in ${Math.round(this.callTimeoutMs / 1000)}s.`));
      }, this.callTimeoutMs);
      this.pending.set(request.id, { resolve, reject, timer });
    });
    this.queue.push(request);
    this.flush();
    return promise;
  }

  /** Hands the next queued request to the parked poll, if both are waiting. */
  private flush(): void {
    if (!this.parked || this.queue.length === 0) return;
    const response = this.parked;
    this.parked = null;
    const request = this.queue.shift()!;
    this.respond(response, 200, request);
  }

  // Every reply, including the empty 204 that closes a poll, carries the CORS
  // headers: without them the browser rejects the fetch and the editor flaps
  // between "connected" and "unavailable" every poll window.
  private respond(response: ServerResponse, status: number, body: unknown): void {
    response.writeHead(status, {
      ...(status === 204 ? {} : { 'content-type': 'application/json;charset=utf-8' }),
      'cache-control': 'no-store',
      'access-control-allow-origin': response.req.headers.origin ?? '*',
      'access-control-allow-headers': `content-type, ${bridgeTokenHeader}`,
    });
    response.end(status === 204 ? undefined : JSON.stringify(body));
  }

  private reject401(response: ServerResponse, request: IncomingMessage): boolean {
    const origin = request.headers.origin;
    if (!isAllowedBridgeOrigin(origin)) {
      this.respond(response, 403, { error: 'Origin not allowed. The bridge is local-only.' });
      return true;
    }
    if (!this.options.token) return false;
    if (request.headers[bridgeTokenHeader] === this.options.token) return false;
    this.respond(response, 401, { error: `Missing or wrong ${bridgeTokenHeader}.` });
    return true;
  }

  private async body(request: IncomingMessage): Promise<unknown> {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of request) {
      size += (chunk as Buffer).length;
      if (size > MAX_BODY_BYTES) throw new Error('Request body too large.');
      chunks.push(chunk as Buffer);
    }
    if (chunks.length === 0) return null;
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }

  private async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    try {
      if (this.reject401(response, request)) return;
      if (request.method === 'GET' && url.pathname === '/health') { this.respond(response, 200, this.health()); return; }
      if (request.method === 'POST' && url.pathname === '/hello') {
        const payload = await this.body(request) as { document?: BridgeClientInfo } | null;
        const document = payload?.document;
        if (!document || typeof document.documentId !== 'string') {
          this.respond(response, 400, { error: 'hello needs a document summary.' });
          return;
        }
        const wasConnected = this.connected;
        this.client = { ...document, origin: request.headers.origin ?? null };
        this.lastSeenAt = Date.now();
        this.options.log?.(`Editor connected: "${document.name}" (${document.pages.length} page(s))${wasConnected ? ' [replaced]' : ''}`);
        this.respond(response, 200, { ok: true, protocol: BRIDGE_PROTOCOL_VERSION });
        return;
      }
      if (request.method === 'GET' && url.pathname === '/next') { this.next(response, url); return; }
      if (request.method === 'POST' && url.pathname === '/result') {
        const payload = await this.body(request) as { id?: string; ok?: boolean; output?: unknown; error?: string } | null;
        const call = payload?.id ? this.pending.get(payload.id) : undefined;
        if (!call || !payload) { this.respond(response, 200, { ok: false, error: 'No such request.' }); return; }
        clearTimeout(call.timer);
        this.pending.delete(payload.id!);
        this.lastSeenAt = Date.now();
        if (payload.ok) call.resolve(payload.output);
        else call.reject(new Error(payload.error ?? 'The editor reported an error.'));
        this.respond(response, 200, { ok: true });
        return;
      }
      this.respond(response, 404, { error: `Unknown bridge route ${request.method} ${url.pathname}.` });
    } catch (error) {
      this.respond(response, 500, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  private next(response: ServerResponse, url: URL): void {
    this.lastSeenAt = Date.now();
    if (this.parked) { this.respond(this.parked, 204, null); this.parked = null; }
    if (this.queue.length > 0) {
      this.respond(response, 200, this.queue.shift());
      return;
    }
    const waitSeconds = Math.min(60, Math.max(1, Number(url.searchParams.get('wait')) || BRIDGE_POLL_SECONDS));
    // Headers are deliberately not sent while parked: the poll stays pending
    // until there is a request (200) or the window closes (204).
    this.parked = response;
    const timer = setTimeout(() => {
      if (this.parked === response) {
        this.parked = null;
        this.respond(response, 204, null);
      }
    }, waitSeconds * 1000);
    response.on('close', () => { clearTimeout(timer); if (this.parked === response) this.parked = null; });
  }
}
