// Against the real stub server, not a fetch stub: a 401, a closed port and each wire's list shape.
import type { AddressInfo, Server } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createStubProviderServer } from '../../../e2e/stubProviderServer.mjs';
import { listModels } from './provider';

let server: Server;
let base = '';
beforeAll(async () => {
  server = createStubProviderServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

describe('listModels', () => {
  it('reads each wire’s list and keeps only chat models', async () => {
    expect(await listModels({ provider: 'custom', apiKey: 'sk-ok', baseUrl: `${base}/v1` })).toEqual(['stub-chat']);
    expect(await listModels({ provider: 'claude', apiKey: 'sk-ok', baseUrl: base })).toEqual(['claude-stub-1']);
    expect(await listModels({ provider: 'gemini', apiKey: 'sk-ok', baseUrl: base })).toEqual(['gemini-stub']);
  });

  it('rejects on a wrong key and on a closed port, so the caller keeps its suggestions', async () => {
    await expect(listModels({ provider: 'openai', apiKey: 'sk-bad', baseUrl: `${base}/v1` })).rejects.toThrow();
    await expect(listModels({ provider: 'ollama', apiKey: '', baseUrl: 'http://127.0.0.1:1/v1' })).rejects.toThrow();
  });
});
