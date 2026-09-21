// Local pairing protocol between the editor and an MCP server on the same
// machine. The editor polls `GET /next` (long-poll) and posts results back, so
// no WebSocket server dependency is needed and every hop is a simple request
// that can be origin-checked. Pure types + guards: the editor, the MCP server
// and their tests all decode the same way.
export const BRIDGE_PROTOCOL_VERSION = 1;
export const BRIDGE_DEFAULT_PORT = 43119;
/** Long-poll window; a parked request means "the editor is alive". */
export const BRIDGE_POLL_SECONDS = 25;
/** No poll for this long → the editor is gone. */
export const BRIDGE_IDLE_MS = 40_000;

export interface BridgePageSummary {
  readonly pageId: string;
  readonly name: string;
  readonly nodes: number;
  readonly connectors: number;
}

export interface BridgeClientInfo {
  readonly documentId: string;
  readonly name: string;
  readonly revision: number;
  readonly pageId: string;
  readonly pages: readonly BridgePageSummary[];
  readonly app: string;
}

export interface BridgeRequest {
  readonly id: string;
  readonly op: string;
  readonly input: unknown;
  readonly pageId?: string;
}

export type BridgeResult =
  | { readonly id: string; readonly ok: true; readonly output: unknown }
  | { readonly id: string; readonly ok: false; readonly error: string };

export interface BridgeHealth {
  readonly ok: true;
  readonly protocol: number;
  readonly name: string;
  readonly version: string;
  readonly connected: boolean;
  readonly documentId: string | null;
  readonly documentName: string | null;
  readonly pageId: string | null;
  readonly pages: readonly BridgePageSummary[];
  readonly lastSeenMs: number | null;
}

export const bridgeTokenHeader = 'x-openflowkit-token';

/** Browsers only: a present Origin must be the app or a local dev server. */
export function isAllowedBridgeOrigin(origin: string | undefined | null): boolean {
  if (!origin) return true;
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== 'http:' && protocol !== 'https:') return false;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
      || hostname === 'app.openflowkit.com';
  } catch {
    return false;
  }
}

export interface BridgeUrls {
  readonly base: string;
  readonly health: string;
  readonly hello: string;
  readonly next: string;
  readonly result: string;
}

export function bridgeUrls(port: number, host = '127.0.0.1'): BridgeUrls {
  const base = `http://${host}:${port}`;
  return { base, health: `${base}/health`, hello: `${base}/hello`, next: `${base}/next`, result: `${base}/result` };
}

export function isBridgeRequest(value: unknown): value is BridgeRequest {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string' && typeof record.op === 'string' && 'input' in record;
}

