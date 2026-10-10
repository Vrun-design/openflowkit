import { spawn } from 'node:child_process';
import { createServer as createNetServer } from 'node:net';
import { describe, expect, it } from 'vitest';
import { createServer } from '../src/server.js';
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from '../src/lib/version.js';

async function freePort(): Promise<number> {
  const probe = createNetServer();
  await new Promise<void>((done) => probe.listen(0, '127.0.0.1', done));
  const { port } = probe.address() as { port: number };
  await new Promise<void>((done) => probe.close(() => done()));
  return port;
}

describe('createServer', () => {
  it('initialises with the expected name and version', () => {
    const server = createServer();
    // The server.server exposes the underlying low-level server. The version
    // is mirrored on the protocol-level instance.
    expect(MCP_SERVER_NAME).toBe('openflowkit');
    expect(MCP_SERVER_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    // Basic shape assertion — instantiation must not throw and must expose tool registration.
    expect(typeof (server as unknown as { registerTool: unknown }).registerTool).toBe('function');
  });
});

describe('stdio entry', () => {
  it('exits and frees the bridge port when its client goes away', async () => {
    const port = await freePort();
    const child = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
      cwd: new URL('..', import.meta.url).pathname, env: { ...process.env, OPENFLOWKIT_BRIDGE_PORT: String(port) },
    });
    try {
      await new Promise<void>((done) => child.stderr.on('data', (chunk) => { if (String(chunk).includes('listening')) done(); }));
      const exited = new Promise<number | null>((done) => child.on('exit', (code) => done(code)));
      child.stdin.end();
      const code = await Promise.race([exited, new Promise<string>((done) => setTimeout(() => done('still running'), 5000))]);
      expect(code).toBe(0);
      expect(await new Promise<boolean>((done) => {
        const probe = createNetServer().once('error', () => done(false));
        probe.listen(port, '127.0.0.1', () => probe.close(() => done(true)));
      })).toBe(true);
    } finally {
      child.kill();
    }
  });
  it('answers a one-shot piped session before it exits', async () => {
    const port = await freePort();
    const child = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
      cwd: new URL('..', import.meta.url).pathname, env: { ...process.env, OPENFLOWKIT_BRIDGE_PORT: String(port) },
    });
    let stdout = '';
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    const exited = new Promise<number | null>((done) => child.on('exit', (code) => done(code)));
    const message = (id: number, method: string, params: object) => `${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`;
    child.stdin.end(message(1, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'pipe', version: '0' } })
      + message(2, 'tools/call', { name: 'get_syntax', arguments: { family: 'flowchart' } }));
    try {
      expect(await Promise.race([exited, new Promise<string>((done) => setTimeout(() => done('still running'), 15_000))])).toBe(0);
      const replies = stdout.trim().split('\n').map((line) => JSON.parse(line) as { id: number; result?: { content?: { text: string }[] } });
      expect(replies.map(({ id }) => id)).toEqual([1, 2]);
      expect(replies[1]!.result!.content![0]!.text).toContain('flowchart');
    } finally {
      child.kill();
    }
  }, 20_000);
});
