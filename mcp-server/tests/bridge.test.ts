import { afterEach, describe, expect, it } from 'vitest';
import { LiveBridge } from '../src/lib/bridge.js';
import {
  bridgeTokenHeader, bridgeUrls, type BridgeRequest,
} from '../src/lib/agent.js';

// A real HTTP server on an ephemeral port with a scripted editor client, so the
// protocol (parking, routing, results, origin and token gates) is exercised
// end to end rather than mocked.

interface FakeEditor {
  readonly port: number;
  readonly stop: () => Promise<void>;
  /** Runs until one request arrives; resolves with it. */
  next(): Promise<BridgeRequest>;
  result(id: string, output: unknown): Promise<void>;
  hello(name?: string): Promise<void>;
  health(): Promise<{ connected: boolean; documentName: string | null }>;
}

async function startEditor(bridgePort: number, options: { token?: string; origin?: string } = {}): Promise<FakeEditor> {
  const urls = bridgeUrls(bridgePort);
  const headers: Record<string, string> = { 'content-type': 'text/plain;charset=UTF-8' };
  if (options.token) headers[bridgeTokenHeader] = options.token;
  if (options.origin) headers.origin = options.origin;
  let polls = 0;
  return {
    port: bridgePort,
    async hello(name = 'Editor doc') {
      await fetch(urls.hello, {
        method: 'POST', headers,
        body: JSON.stringify({ document: { documentId: 'doc-live', name, revision: 1, pageId: 'p1', pages: [{ pageId: 'p1', name: 'Page 1', nodes: 3, connectors: 2 }], app: 'test-editor' } }),
      });
    },
    async next() {
      polls += 1;
      const response = await fetch(`${urls.next}?wait=2`, { headers });
      if (response.status !== 200) throw new Error(`poll ${polls} answered ${response.status}`);
      return await response.json() as BridgeRequest;
    },
    async result(id, output) {
      await fetch(urls.result, { method: 'POST', headers, body: JSON.stringify({ id, ok: true, output }) });
    },
    async health() {
      const response = await fetch(urls.health, { headers });
      return await response.json() as { connected: boolean; documentName: string | null };
    },
    async stop() { /* the bridge owns the socket; nothing to close here */ },
  };
}

let bridge: LiveBridge | null = null;
afterEach(async () => { await bridge?.stop(); bridge = null; });

describe('live bridge', () => {
  it('pairs an editor, reports health and routes one op round trip', async () => {
    bridge = new LiveBridge({ port: 0, log: () => undefined });
    const port = await bridge.start();
    expect(bridge.connected).toBe(false);
    expect(bridge.health()).toMatchObject({ ok: true, protocol: 1, connected: false });

    const editor = await startEditor(port);
    await editor.hello('Checkout flow');
    expect(bridge.health()).toMatchObject({ connected: true, documentId: 'doc-live', documentName: 'Checkout flow' });
    expect(bridge.health().pages).toHaveLength(1);

    // The editor parks; the call wakes it and the result comes back.
    const parked = editor.next();
    const call = bridge.call('create_diagram', { dsl: 'flowchart\n A -> B' });
    const request = await parked;
    expect(request).toMatchObject({ op: 'create_diagram' });
    expect(request.input).toEqual({ dsl: 'flowchart\n A -> B' });
    await editor.result(request.id, { frameId: 'dsl-abc', nodes: 2 });
    await expect(call).resolves.toEqual({ frameId: 'dsl-abc', nodes: 2 });
  });

  it('surfaces editor errors as rejections and refuses calls with no editor', async () => {
    bridge = new LiveBridge({ port: 0, callTimeoutMs: 1500 });
    const port = await bridge.start();
    await expect(bridge.call('get_diagram', {})).rejects.toThrow(/No editor is connected/);

    const editor = await startEditor(port);
    await editor.hello();
    const parked = editor.next();
    // Attach the rejection expectation before awaiting the round trip so the
    // promise is never momentarily unhandled.
    const rejected = expect(bridge.call('get_diagram', {})).rejects.toThrow(/no diagram frames/);
    const request = await parked;
    await fetch(bridgeUrls(port).result, {
      method: 'POST', headers: { 'content-type': 'text/plain' },
      body: JSON.stringify({ id: request.id, ok: false, error: 'no diagram frames' }),
    });
    await rejected;
  });

  it('answers 204 when the editor has nothing to do, and times out a lost result', async () => {
    bridge = new LiveBridge({ port: 0, callTimeoutMs: 900 });
    const port = await bridge.start();
    const editor = await startEditor(port);
    await editor.hello();
    const origin = 'http://127.0.0.1:5173';
    const empty = await fetch(`${bridgeUrls(port).next}?wait=1`, { headers: { origin } });
    expect(empty.status).toBe(204);
    // A browser drops a cross-origin reply without this header — the editor would flap.
    expect(empty.headers.get('access-control-allow-origin')).toBe(origin);
    const superseded = fetch(`${bridgeUrls(port).next}?wait=5`, { headers: { origin } });
    await new Promise((resolve) => setTimeout(resolve, 30));
    const replacement = fetch(`${bridgeUrls(port).next}?wait=1`, { headers: { origin } });
    const closed = await superseded;
    expect(closed.status).toBe(204);
    expect(closed.headers.get('access-control-allow-origin')).toBe(origin);
    await replacement;

    const parked = editor.next();
    const timedOut = expect(bridge.call('get_document', {})).rejects.toThrow(/did not answer/);
    await parked;
    await timedOut;
  });

  it('rejects foreign origins and demands the token when configured', async () => {
    bridge = new LiveBridge({ port: 0, token: 'secret-token' });
    const port = await bridge.start();
    const foreign = await fetch(bridgeUrls(port).health, { headers: { origin: 'https://evil.example' } });
    expect(foreign.status).toBe(403);

    const missingToken = await fetch(bridgeUrls(port).health, { headers: { origin: 'http://localhost:5173' } });
    expect(missingToken.status).toBe(401);

    const allowed = await fetch(bridgeUrls(port).health, {
      headers: { origin: 'http://localhost:5173', [bridgeTokenHeader]: 'secret-token' },
    });
    expect(allowed.status).toBe(200);
    expect(await allowed.json()).toMatchObject({ ok: true, connected: false });
  });
});
