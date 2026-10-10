// Real HTTP server on an ephemeral port, driven by the SDK's own client: no stubs.
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, request, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHttpServer, type HttpOptions } from '../src/http.js';
import { deterministicLayout } from '../src/lib/agent.js';
import { decodeDslPayload } from '../src/lib/openLink.js';

const VIEWER = readFileSync(new URL('./fixtures/viewer/viewer.html', import.meta.url), 'utf8');
const FLOW = 'Start -> Check\nCheck -> Done\n';
const MERMAID = 'flowchart TD\n  A[Start] --> B{Ok?}\n  B -->|yes| C[Done]\n';

let server: Server;
let port: number;

beforeAll(async () => {
  server = createHttpServer({ viewerHtml: VIEWER, appOrigin: 'https://app.test' });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  port = (server.address() as AddressInfo).port;
});
afterAll(() => new Promise<void>((done) => server.close(() => done())));

async function connect(): Promise<Client> {
  const client = new Client({ name: 'test', version: '0' });
  await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`)));
  return client;
}

/** Raw request, so the Host header and body size are exactly what the test says. */
function raw(options: { method?: string; path?: string; host?: string; body?: string; headers?: Record<string, string>; port?: number }): Promise<{ status: number; text: string; headers: IncomingHttpHeaders }> {
  return new Promise((done, fail) => {
    const req = request({
      host: '127.0.0.1', port: options.port ?? port, method: options.method ?? 'POST', path: options.path ?? '/mcp',
      headers: { ...(options.host ? { host: options.host } : {}), 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...options.headers },
    }, (res) => {
      let text = '';
      res.on('data', (chunk) => { text += chunk; });
      res.on('end', () => done({ status: res.statusCode ?? 0, text, headers: res.headers }));
    });
    req.on('error', (error) => ((error as NodeJS.ErrnoException).code === 'EPIPE' || (error as NodeJS.ErrnoException).code === 'ECONNRESET' ? done({ status: 413, text: '', headers: {} }) : fail(error)));
    req.end(options.body);
  });
}

describe('remote MCP endpoint', () => {
  it('lists exactly render_diagram and get_syntax, with the ui meta', async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(['get_syntax', 'render_diagram']);
    const render = tools.find((t) => t.name === 'render_diagram')!;
    expect(render._meta).toEqual({ ui: { resourceUri: 'ui://openflowkit/viewer.html' } });
    await client.close();
  });

  it('draws a flowchart: svg, counts, and a link that decodes back to the DSL', async () => {
    const client = await connect();
    const result = await client.callTool({ name: 'render_diagram', arguments: { source: FLOW, title: 'Login' } });
    expect(result.isError).toBeFalsy();
    const out = result.structuredContent as { title: string; svg: string; dsl: string; openUrl: string; nodes: number; connectors: number; diagnostics: unknown[]; losses: string[] };
    expect(out.svg.startsWith('<svg')).toBe(true);
    expect(out.nodes).toBe(3);
    expect(out.connectors).toBe(2);
    expect(out.title).toBe('Login');
    expect(out.openUrl.startsWith('https://app.test/#/from/dsl?d=')).toBe(true);
    expect(decodeDslPayload(out.openUrl.split('?d=')[1]!)).toBe(out.dsl);
    expect(out.dsl).toBe(FLOW);
    // structuredContent never reaches the model: the text carries the summary and the canonical DSL, not the SVG.
    const text = (result.content as { text: string }[])[0]!.text;
    expect(text).toBe(`Login: 3 nodes, 2 connectors, 0 warnings\n\`\`\`\n${FLOW.trimEnd()}\n\`\`\``);
    expect(text).not.toContain('<svg');
    await client.close();
  });

  it('draws Mermaid and returns the converted DSL', async () => {
    const client = await connect();
    const result = await client.callTool({ name: 'render_diagram', arguments: { source: MERMAID, theme: 'dark' } });
    expect(result.isError).toBeFalsy();
    const out = result.structuredContent as { svg: string; dsl: string; nodes: number; connectors: number; losses: string[] };
    expect(out.svg.startsWith('<svg')).toBe(true);
    expect(out.nodes).toBe(3);
    expect(out.connectors).toBe(2);
    expect(out.dsl).not.toContain('flowchart TD');
    expect(Array.isArray(out.losses)).toBe(true);
    await client.close();
  });

  it('returns isError with diagnostics for invalid DSL', async () => {
    const client = await connect();
    const result = await client.callTool({ name: 'render_diagram', arguments: { source: 'flowchart TD\n  A[[[ --> \n' } });
    expect(result.isError).toBe(true);
    const out = result.structuredContent as { diagnostics: { severity: string; line: number; message: string }[] };
    expect(out.diagnostics.length).toBeGreaterThan(0);
    expect(out.diagnostics.some((d) => d.severity === 'error')).toBe(true);
    await client.close();
  });

  it('rejects a 150 KB source', async () => {
    const client = await connect();
    const result = await client.callTool({ name: 'render_diagram', arguments: { source: 'A -> B\n'.repeat(25_000) } }).catch((e: Error) => ({ isError: true, thrown: e.message }));
    expect(result.isError).toBe(true);
    await client.close();
  });

  it('answers 413 to a 600 KB body', async () => {
    const res = await raw({ body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping', params: { pad: 'x'.repeat(600 * 1024) } }) });
    expect(res.status).toBe(413);
  });

  it('serves the viewer resource with the MCP Apps mimeType', async () => {
    const client = await connect();
    const { contents } = await client.readResource({ uri: 'ui://openflowkit/viewer.html' });
    expect(contents[0]!.mimeType).toBe('text/html;profile=mcp-app');
    expect(contents[0]!.text).toBe(VIEWER);
    await client.close();
  });

  it('get_syntax returns grammar text', async () => {
    const client = await connect();
    const result = await client.callTool({ name: 'get_syntax', arguments: {} });
    expect(result.isError).toBeFalsy();
    expect((result.content as { text: string }[])[0]!.text.length).toBeGreaterThan(50);
    const unknown = await client.callTool({ name: 'get_syntax', arguments: { family: 'flowchrt' } });
    expect(unknown.isError).toBe(true);
    expect((unknown.content as { text: string }[])[0]!.text).toContain('flowchart');
    const cased = await client.callTool({ name: 'get_syntax', arguments: { family: 'Flowchart' } });
    expect(cased.isError).toBeFalsy();
    await client.close();
  });

  it('rejects a Host header that is not allowed, and answers /healthz', async () => {
    const bad = await raw({ host: 'evil.example.com', body: '{}' });
    expect(bad.status).toBe(403);
    expect((await raw({ method: 'GET', path: '/healthz' })).status).toBe(200);
    expect((await raw({ method: 'GET', path: '/healthz', host: 'evil.example.com' })).status).toBe(200);
  });

  it('answers 405 to GET and DELETE on /mcp instead of opening a stream', async () => {
    for (const method of ['GET', 'DELETE']) {
      const res = await raw({ method, headers: { accept: 'text/event-stream' } });
      expect(res.status).toBe(405);
    }
  });

  it('answers 413 to a chunked body over the cap', async () => {
    const res = await new Promise<number>((done, fail) => {
      const req = request({ host: '127.0.0.1', port, method: 'POST', path: '/mcp', headers: { 'content-type': 'application/json', 'transfer-encoding': 'chunked' } }, (r) => { r.resume(); done(r.statusCode ?? 0); });
      // The server destroys the socket as soon as the cap is passed, so the client sees the 413 or, racing it, a reset.
      req.on('error', (error) => ((error as NodeJS.ErrnoException).code === 'EPIPE' || (error as NodeJS.ErrnoException).code === 'ECONNRESET' ? done(413) : fail(error)));
      const chunk = 'x'.repeat(64 * 1024);
      let sent = 0;
      const pump = () => { while (sent < 10 && req.write(chunk)) sent += 1; if (sent < 10) req.once('drain', pump); else req.end(); };
      pump();
    });
    expect(res).toBe(413);
  });

  it('keeps no state between parallel calls', async () => {
    const [a, b] = await Promise.all([connect(), connect()]);
    const [ra, rb] = await Promise.all([
      a.callTool({ name: 'render_diagram', arguments: { source: 'A -> B\n', title: 'One' } }),
      b.callTool({ name: 'render_diagram', arguments: { source: 'X -> Y\nY -> Z\n', title: 'Two' } }),
    ]);
    const sa = ra.structuredContent as { dsl: string; nodes: number; svg: string };
    const sb = rb.structuredContent as { dsl: string; nodes: number; svg: string };
    expect([sa.nodes, sb.nodes]).toEqual([2, 3]);
    expect(sa.dsl).toContain('A -> B');
    expect(sb.dsl).toContain('X -> Y');
    expect(sa.svg).not.toContain('>Z<');
    await Promise.all([a.close(), b.close()]);
  });

  it('lays out only the first of many views, and finishes fast', async () => {
    const elements = Array.from({ length: 30 }, (_, i) => `    container C${i}\n`).join('');
    const relations = Array.from({ length: 29 }, (_, i) => `  C${i} -> C${i + 1}\n`).join('');
    const views = Array.from({ length: 20 }, (_, i) => `  view custom "V${i}" { include * }\n`).join('');
    const source = `model {\n  system S {\n${elements}  }\n${relations}}\nviews {\n${views}}\n`;
    let runs = 0;
    const counting: HttpOptions['layout'] = { run: (graph, signal) => { runs += 1; return deterministicLayout.run(graph as never, signal); } };
    const local = await listen({ layout: counting });
    const started = Date.now();
    const res = await local.call('render_diagram', { source });
    expect(Date.now() - started).toBeLessThan(5000);
    expect(runs).toBe(1);
    expect(res.isError ? (res.content as { text: string }[])[0]!.text : (res.structuredContent as { svg: string }).svg.slice(0, 4)).toMatch(/^(<svg|.*)/);
    await local.close();
  });

  it('refuses a diagram over the total cap before laying anything out', async () => {
    const source = Array.from({ length: 1100 }, (_, i) => `N${i} -> N${i + 1}`).join('\n');
    const result = await (await listen()).callThenClose('render_diagram', { source });
    expect(result.isError).toBe(true);
    expect((result.content as { text: string }[])[0]!.text).toMatch(/limit is 1000 shapes/);
  });

  it('gives up with "took too long" at the deadline', async () => {
    const never: HttpOptions['layout'] = { run: () => new Promise(() => {}) };
    const result = await (await listen({ layout: never, deadlineMs: 200 })).callThenClose('render_diagram', { source: 'A -> B' });
    expect(result.isError).toBe(true);
    expect((result.content as { text: string }[])[0]!.text).toMatch(/took too long/);
  });

  it('answers 503 with Retry-After to a 5th parallel render while 4 are held', async () => {
    let release!: () => void;
    const gate = new Promise<void>((done) => { release = done; });
    const held: HttpOptions['layout'] = { run: async (graph, signal) => { await gate; return deterministicLayout.run(graph as never, signal); } };
    const local = await listen({ layout: held, deadlineMs: 30_000 });
    const call = (id: number) => raw({ port: local.port, body: JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: 'render_diagram', arguments: { source: 'A -> B' } } }) });
    const four = [1, 2, 3, 4].map(call);
    await new Promise((done) => setTimeout(done, 300));
    const fifth = await call(5);
    expect(fifth.status).toBe(503);
    expect(fifth.headers['retry-after']).toBeDefined();
    release();
    for (const res of await Promise.all(four)) expect(res.status).toBe(200);
    expect((await call(6)).status).toBe(200);
    await local.close();
  });
});

describe('start:http entry', () => {
  it('starts when invoked through a symlink, the way npm installs bins', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'openflowkit-http-bin-'));
    const bin = join(dir, 'openflowkit-http');
    symlinkSync(new URL('../src/http.ts', import.meta.url).pathname, bin);
    const free = createServer();
    await new Promise<void>((done) => free.listen(0, '127.0.0.1', done));
    const freePort = (free.address() as AddressInfo).port;
    await new Promise<void>((done) => free.close(() => done()));
    const child = spawn(process.execPath, ['--import', 'tsx', bin], {
      cwd: new URL('..', import.meta.url).pathname, env: { ...process.env, PORT: String(freePort) },
    });
    try {
      const stderr = await new Promise<string>((done) => {
        let text = '';
        const timer = setTimeout(() => done(text), 8000);
        child.stderr.on('data', (chunk) => { text += chunk; if (text.includes('listening')) { clearTimeout(timer); done(text); } });
        child.on('exit', () => { clearTimeout(timer); done(text); });
      });
      expect(stderr).toContain(`listening on http://127.0.0.1:${freePort}/mcp`);
    } finally {
      child.kill();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/** Another server with its own options, for the tests that inject a layout. */
async function listen(options: Partial<HttpOptions> = {}) {
  const local = createHttpServer({ viewerHtml: VIEWER, ...options });
  await new Promise<void>((done) => local.listen(0, '127.0.0.1', done));
  const localPort = (local.address() as AddressInfo).port;
  const close = () => new Promise<void>((done) => { local.closeAllConnections(); local.close(() => done()); });
  const call = async (name: string, args: Record<string, unknown>) => {
    const client = new Client({ name: 'test', version: '0' });
    await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${localPort}/mcp`)));
    try { return await client.callTool({ name, arguments: args }); } finally { await client.close(); }
  };
  return { port: localPort, close, call, callThenClose: async (name: string, args: Record<string, unknown>) => { try { return await call(name, args); } finally { await close(); } } };
}
