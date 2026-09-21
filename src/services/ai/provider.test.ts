import { describe, expect, it, vi } from 'vitest';
import { AiProviderError, createProvider } from './provider';

const ok = (body: unknown) => ({ ok: true, status: 200, text: async () => JSON.stringify(body) }) as Response;
const fail = (status: number, body = '{"error":{"message":"bad key"}}') =>
  ({ ok: false, status, text: async () => body }) as Response;

describe('AI providers', () => {
  it('calls Anthropic messages with the key in x-api-key and parses text blocks', async () => {
    const fetchMock = vi.fn(async () => ok({ content: [{ type: 'text', text: 'flowchart\n  A -> B' }] }));
    vi.stubGlobal('fetch', fetchMock);
    const provider = createProvider({ provider: 'anthropic', apiKey: 'sk-ant', model: 'claude-sonnet-4-5' });
    expect(provider.endpoint).toBe('https://api.anthropic.com/v1/messages');

    const text = await provider.complete({ system: 'sys', prompt: 'draw' });
    expect(text).toBe('flowchart\n  A -> B');
    const [url, init] = fetchMock.mock.calls[0]! as unknown as [string, RequestInit];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect((init.headers as Record<string, string>)['x-api-key']).toBe('sk-ant');
    expect((init.headers as Record<string, string>)['anthropic-version']).toBe('2023-06-01');
    expect(JSON.parse(String(init.body))).toMatchObject({
      model: 'claude-sonnet-4-5', system: 'sys', messages: [{ role: 'user', content: 'draw' }],
    });
    vi.unstubAllGlobals();
  });

  it('calls an OpenAI-compatible endpoint and honours a base URL override', async () => {
    const fetchMock = vi.fn(async () => ok({ choices: [{ message: { content: 'flowchart\n  X -> Y' } }] }));
    vi.stubGlobal('fetch', fetchMock);
    const provider = createProvider({
      provider: 'openai', apiKey: 'sk-or', baseUrl: 'http://localhost:11434/', model: 'llama3.1',
    });
    expect(provider.endpoint).toBe('http://localhost:11434/v1/chat/completions');

    const text = await provider.complete({ system: 'sys', prompt: 'draw' });
    expect(text).toBe('flowchart\n  X -> Y');
    const [, init] = fetchMock.mock.calls[0]! as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer sk-or');
    expect(JSON.parse(String(init.body)).messages[0]).toEqual({ role: 'system', content: 'sys' });
    vi.unstubAllGlobals();
  });

  it('explains failures instead of leaking the response body', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => fail(401)));
    const provider = createProvider({ provider: 'openai', apiKey: 'sk-bad' });
    await expect(provider.complete({ system: 's', prompt: 'p' }))
      .rejects.toThrow(/rejected the key/);
    vi.unstubAllGlobals();

    vi.stubGlobal('fetch', vi.fn(async () => fail(429)));
    const rateLimited = createProvider({ provider: 'anthropic', apiKey: 'sk' });
    const error = await rateLimited.complete({ system: 's', prompt: 'p' }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(AiProviderError);
    expect((error as AiProviderError).retryable).toBe(true);
    vi.unstubAllGlobals();

    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('failed to fetch'); }));
    const offline = createProvider({ provider: 'openai', apiKey: 'sk' });
    await expect(offline.complete({ system: 's', prompt: 'p' })).rejects.toThrow(/Could not reach/);
    vi.unstubAllGlobals();
  });

  it('refuses to build a provider without a key', () => {
    expect(() => createProvider({ provider: 'openai', apiKey: '  ' })).toThrow(/API key/);
  });
});
