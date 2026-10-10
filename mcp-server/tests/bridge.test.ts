import { request } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { LiveBridge } from '../src/lib/bridge.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServerWithDeps } from '../src/server.js';
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

    const inQuery = await fetch(`${bridgeUrls(port).health}?token=secret-token`, { headers: { origin: 'http://localhost:5173' } });
    expect(inQuery.status).toBe(200);
    const wrongQuery = await fetch(`${bridgeUrls(port).health}?token=nope`, { headers: { origin: 'http://localhost:5173' } });
    expect(wrongQuery.status).toBe(401);
  });

  it('answers a browser preflight for the token header without needing the token', async () => {
    bridge = new LiveBridge({ port: 0, token: 'secret-token' });
    const port = await bridge.start();
    const origin = 'http://localhost:5173';
    const preflight = await fetch(bridgeUrls(port).hello, {
      method: 'OPTIONS',
      headers: {
        origin, 'access-control-request-method': 'POST',
        'access-control-request-headers': `content-type, ${bridgeTokenHeader}`,
        'access-control-request-private-network': 'true',
      },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-origin')).toBe(origin);
    expect(preflight.headers.get('access-control-allow-headers')).toContain(bridgeTokenHeader);
    expect(preflight.headers.get('access-control-allow-methods')).toContain('POST');
    expect(preflight.headers.get('access-control-allow-private-network')).toBe('true');

    const foreign = await fetch(bridgeUrls(port).hello, { method: 'OPTIONS', headers: { origin: 'https://evil.example' } });
    expect(foreign.status).toBe(403);
  });
  it('refuses a request whose Host is not this machine (DNS rebinding)', async () => {
    bridge = new LiveBridge({ port: 0 });
    const port = await bridge.start();
    // fetch may not set Host, so a raw request says exactly what a rebound page would send.
    const statusFor = (host: string) => new Promise<number>((done, fail) => {
      request({ host: '127.0.0.1', port, path: '/health', headers: { host } }, (res) => { res.resume(); done(res.statusCode ?? 0); })
        .on('error', fail).end();
    });
    for (const host of [`evil.example:${port}`, 'localhost.evil.example', `127.0.0.1.nip.io:${port}`]) expect(await statusFor(host), host).toBe(403);
    // Only the name matters: an SSH or devcontainer forward arrives as localhost on its own port.
    for (const host of [`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`, 'LOCALHOST:9000', 'localhost']) expect(await statusFor(host), host).toBe(200);
  });

  it('refuses a malformed hello instead of pairing a phantom editor', async () => {
    bridge = new LiveBridge({ port: 0, log: () => undefined });
    const port = await bridge.start();
    for (const document of [{ documentId: 'x' }, { documentId: 'x', name: 'n', revision: 1, pageId: 'p', pages: 'none', app: 'a' }]) {
      const response = await fetch(bridgeUrls(port).hello, { method: 'POST', body: JSON.stringify({ document }) });
      expect(response.status).toBe(400);
    }
    expect(bridge.connected).toBe(false);
    expect(bridge.health()).toMatchObject({ connected: false, documentId: null });
  });
  it('says at once that the editor tab went away, instead of waiting out the call', async () => {
    bridge = new LiveBridge({ port: 0, log: () => undefined });
    const port = await bridge.start();
    const editor = await startEditor(port);
    await editor.hello();
    const tab = new AbortController();
    const parked = fetch(`${bridgeUrls(port).next}?wait=20`, { signal: tab.signal }).catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 50));
    tab.abort();
    await parked;
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(bridge.connected).toBe(false);
    const started = Date.now();
    await expect(bridge.call('get_document', {})).rejects.toThrow('The editor tab was closed or reloaded. Reopen it and press Connect.');
    expect(Date.now() - started).toBeLessThan(500);
    // Pairing again clears it.
    await editor.hello();
    expect(bridge.connected).toBe(true);
  });
  it('a second server on a taken port says so in whoami, server_info and its errors', async () => {
    bridge = new LiveBridge({ port: 0, log: () => undefined });
    const port = await bridge.start();
    expect(bridge.status()).toEqual({ port, state: 'listening' });
    const second = new LiveBridge({ port, log: () => undefined });
    await expect(second.start()).rejects.toThrow(/EADDRINUSE/);
    expect(second.status()).toEqual({ port, state: 'port-in-use' });

    const { server } = createServerWithDeps({ bridge: second, log: () => undefined });
    const client = new Client({ name: 'test', version: '0' });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(b), client.connect(a)]);
    const json = async (name: string, args = {}) => {
      const result = await client.callTool({ name, arguments: args });
      return { isError: result.isError, text: (result.content as { text: string }[])[0]!.text };
    };
    expect(JSON.parse((await json('whoami')).text)).toMatchObject({ bridge: { port, state: 'port-in-use' } });
    expect(JSON.parse((await json('server_info')).text)).toMatchObject({ bridge: { port, state: 'port-in-use' } });
    expect(await json('list_pages')).toEqual({
      isError: true, text: `Another OpenFlowKit MCP server already owns port ${port}; this one can only edit files (openflow_open).`,
    });

    const editor = await startEditor(port);
    await editor.hello();
    expect(bridge.status()).toEqual({ port, state: 'paired' });
  });
});
