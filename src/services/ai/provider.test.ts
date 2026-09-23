import { describe, expect, it, vi } from 'vitest';
import { AI_PROVIDERS, providerById } from './providers';
import { AiProviderError, createProvider } from './provider';

const ok = (body: unknown) => ({ ok: true, status: 200, text: async () => JSON.stringify(body) }) as Response;
const fail = (status: number, body = '{"error":{"message":"bad key"}}') =>
  ({ ok: false, status, text: async () => body }) as Response;

const KEY = 'sk-secret-should-never-echo';
const call = async (id: Parameters<typeof createProvider>[0]['provider'], reply: Response, overrides: Record<string, string> = {}) => {
  const fetchMock = vi.fn(async () => reply);
  vi.stubGlobal('fetch', fetchMock);
  const provider = createProvider({ provider: id, apiKey: KEY, ...overrides });
  const text = await provider.complete({ system: 'sys', prompt: 'draw' });
  const [url, init] = fetchMock.mock.calls[0]! as unknown as [string, RequestInit];
  vi.unstubAllGlobals();
  return { provider, text, url, init, headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) as Record<string, unknown> };
};

describe('anthropic wire', () => {
  it('calls messages with the key in x-api-key and parses text blocks', async () => {
    const { provider, text, url, headers, body } = await call('claude', ok({ content: [{ type: 'text', text: 'flowchart\n  A -> B' }] }));
    expect(provider.endpoint).toBe('https://api.anthropic.com/v1/messages');
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(headers['x-api-key']).toBe(KEY);
    expect(headers['anthropic-version']).toBe('2023-06-01');
    expect(headers['anthropic-dangerous-direct-browser-access']).toBe('true');
    expect(text).toBe('flowchart\n  A -> B');
    expect(body).toMatchObject({ model: 'claude-opus-5', max_tokens: 16_000, system: 'sys', messages: [{ role: 'user', content: 'draw' }] });
  });

  it('joins multiple text blocks and ignores non-text ones', async () => {
    const { text } = await call('claude', ok({ content: [{ type: 'thinking', thinking: 'hmm' }, { type: 'text', text: 'one' }, { type: 'text', text: 'two' }] }));
    expect(text).toBe('onetwo');
  });
});

describe('google wire', () => {
  it('calls generateContent with the key in x-goog-api-key, never the URL', async () => {
    const { provider, text, url, headers, body } = await call('gemini', ok({
      candidates: [{ content: { parts: [{ text: 'flowchart\n  A -> B' }] } }],
    }));
    expect(provider.endpoint).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent');
    expect(url).toBe(provider.endpoint);
    expect(headers['x-goog-api-key']).toBe(KEY);
    expect(url).not.toContain(KEY);
    expect(body).toMatchObject({
      systemInstruction: { parts: [{ text: 'sys' }] },
      contents: [{ role: 'user', parts: [{ text: 'draw' }] }],
      generationConfig: { maxOutputTokens: providerById('gemini').maxOutputTokens },
    });
    expect(text).toBe('flowchart\n  A -> B');
  });
});

describe('openai wire', () => {
  const openaiWired = AI_PROVIDERS.filter(({ wire }) => wire === 'openai');

  it('covers eight providers with one client', () => {
    expect(openaiWired.map(({ id }) => id)).toEqual(['openai', 'groq', 'nvidia', 'cerebras', 'mistral', 'openrouter', 'ollama', 'custom']);
  });

  it.each(openaiWired.map((definition) => [definition.id, definition] as const))(
    'builds the documented URL and auth for %s',
    async (id, definition) => {
      const fetchMock = vi.fn(async () => ok({ choices: [{ message: { content: 'x' } }] }));
      vi.stubGlobal('fetch', fetchMock);
      const provider = createProvider({ provider: id, apiKey: KEY, ...(id === 'custom' ? { baseUrl: 'https://proxy.example/v1/', model: 'm' } : {}) });
      await provider.complete({ system: 's', prompt: 'p' });
      const [url, init] = fetchMock.mock.calls[0]! as unknown as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      const expectedBase = id === 'custom' ? 'https://proxy.example/v1' : definition.defaultBaseUrl;
      expect(url).toBe(`${expectedBase}/chat/completions`);
      if (definition.needsKey) expect(headers.authorization).toBe(`Bearer ${KEY}`);
      else expect(headers.authorization).toBeUndefined();
      expect(url).not.toContain(KEY);
      expect(String(init.body)).not.toContain(KEY);
      const body = JSON.parse(String(init.body)) as { model: string; max_tokens?: number; max_completion_tokens?: number };
      expect(body.model).toBe(id === 'custom' ? 'm' : definition.defaultModel);
      if (definition.maxTokensParam === 'max_completion_tokens') {
        expect(body.max_completion_tokens).toBe(definition.maxOutputTokens);
        expect(body.max_tokens).toBeUndefined();
      } else {
        expect(body.max_tokens).toBe(definition.maxOutputTokens);
      }
      vi.unstubAllGlobals();
    },
  );

  it('adds attribution headers for OpenRouter only', async () => {
    const { headers } = await call('openrouter', ok({ choices: [{ message: { content: 'x' } }] }));
    expect(headers['HTTP-Referer']).toBe('https://openflowkit.com');
    expect(headers['X-Title']).toBe('OpenFlowKit');

    const { headers: plain } = await call('groq', ok({ choices: [{ message: { content: 'x' } }] }));
    expect(plain['HTTP-Referer']).toBeUndefined();
  });

  it('lets Ollama run without a key and send no auth header', async () => {
    const fetchMock = vi.fn(async () => ok({ choices: [{ message: { content: 'x' } }] }));
    vi.stubGlobal('fetch', fetchMock);
    const provider = createProvider({ provider: 'ollama', apiKey: '' });
    await provider.complete({ system: 's', prompt: 'p' });
    const [url, init] = fetchMock.mock.calls[0]! as unknown as [string, RequestInit];
    expect(url).toBe('http://localhost:11434/v1/chat/completions');
    expect((init.headers as Record<string, string>).authorization).toBeUndefined();
    vi.unstubAllGlobals();
  });
});

describe('failures and secrets', () => {
  it('maps the statuses that matter and never repeats the provider body', async () => {
    const cases: [number, RegExp, string][] = [
      [401, /rejected the key/, 'bad-key'],
      [403, /rejected the key/, 'bad-key'],
      [404, /did not find the model/, 'bad-model'],
      [429, /rate limiting this key/, 'rate-limited'],
      [503, /server error \(503\)/, 'provider-down'],
    ];
    for (const [status, pattern, cause] of cases) {
      vi.stubGlobal('fetch', vi.fn(async () => fail(status, JSON.stringify({ error: { message: `Incorrect API key provided: ${KEY}` } }))));
      const provider = createProvider({ provider: 'openai', apiKey: KEY });
      const error = (await provider.complete({ system: 's', prompt: 'p' }).catch((caught: unknown) => caught)) as AiProviderError;
      expect(error.message, String(status)).toMatch(pattern);
      expect(error.cause, String(status)).toBe(cause);
      expect(error.message, String(status)).not.toContain(KEY);
      expect(error.message, String(status)).not.toContain('sk-secret');
      vi.unstubAllGlobals();
    }
  });

  it('doctors a Gemini API_KEY_INVALID 400 into a bad key', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => fail(400, JSON.stringify({ error: { code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' } }))));
    const provider = createProvider({ provider: 'gemini', apiKey: 'sk-bad' });
    const error = (await provider.complete({ system: 's', prompt: 'p' }).catch((caught: unknown) => caught)) as AiProviderError;
    expect(error.cause).toBe('bad-key');
    expect(error.message).toContain('https://aistudio.google.com/app/apikey');
    vi.unstubAllGlobals();
  });

  it('turns a rejected fetch into a browser-refused diagnosis, not a TypeError', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError(`failed to fetch ${KEY}`); }));
    const provider = createProvider({ provider: 'openai', apiKey: KEY });
    const error = (await provider.complete({ system: 's', prompt: 'p' }).catch((caught: unknown) => caught)) as AiProviderError;
    expect(error).toBeInstanceOf(AiProviderError);
    expect(error.cause).toBe('blocked-by-browser');
    expect(error.message).not.toContain(KEY);
    vi.unstubAllGlobals();
  });

  it('reports our own CSP when a connect-src violation fires, and names the origin', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      const violation = Object.assign(new Event('securitypolicyviolation'), {
        effectiveDirective: 'connect-src', blockedURI: 'https://api.openai.com',
      });
      document.dispatchEvent(violation);
      throw new TypeError('Failed to fetch');
    }));
    const provider = createProvider({ provider: 'openai', apiKey: KEY });
    const error = (await provider.complete({ system: 's', prompt: 'p' }).catch((caught: unknown) => caught)) as AiProviderError;
    expect(error.cause).toBe('blocked-by-browser');
    expect(error.origin).toBe('https://api.openai.com');
    expect(error.message).toContain('security policy blocked https://api.openai.com');
    vi.unstubAllGlobals();
  });

  it('reports offline when the browser knows it is offline', async () => {
    const onLine = Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine');
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    const provider = createProvider({ provider: 'openai', apiKey: KEY });
    const error = (await provider.complete({ system: 's', prompt: 'p' }).catch((caught: unknown) => caught)) as AiProviderError;
    expect(error.cause).toBe('offline');
    vi.unstubAllGlobals();
    if (onLine) Object.defineProperty(Navigator.prototype, 'onLine', onLine);
  });

  it('treats a timeout as a down endpoint, and passes AbortError through untouched', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new DOMException('The operation timed out.', 'TimeoutError'); }));
    const provider = createProvider({ provider: 'openai', apiKey: KEY });
    const error = (await provider.complete({ system: 's', prompt: 'p' }).catch((caught: unknown) => caught)) as AiProviderError;
    expect(error.cause).toBe('provider-down');
    expect(error.message).toMatch(/30 seconds/);
    vi.unstubAllGlobals();

    const abort = new DOMException('aborted', 'AbortError');
    vi.stubGlobal('fetch', vi.fn(async () => { throw abort; }));
    await expect(provider.complete({ system: 's', prompt: 'p' })).rejects.toBe(abort);
    vi.unstubAllGlobals();
  });

  it('never logs the key, on success or failure', async () => {
    const spies = [vi.spyOn(console, 'log'), vi.spyOn(console, 'warn'), vi.spyOn(console, 'error'), vi.spyOn(console, 'info')];
    vi.stubGlobal('fetch', vi.fn(async () => ok({ choices: [{ message: { content: 'x' } }] })));
    await createProvider({ provider: 'openai', apiKey: KEY }).complete({ system: 's', prompt: 'p' });
    vi.stubGlobal('fetch', vi.fn(async () => fail(401, JSON.stringify({ error: { message: `bad key ${KEY}` } }))));
    await createProvider({ provider: 'openai', apiKey: KEY }).complete({ system: 's', prompt: 'p' }).catch(() => undefined);
    for (const spy of spies) {
      const written = spy.mock.calls.flat().map(String).join(' ');
      expect(written).not.toContain(KEY);
      expect(written).not.toContain('sk-secret');
    }
    for (const spy of spies) spy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('refuses to build a keyed provider without a key, and Ollama without anything', () => {
    const missing = (() => { try { createProvider({ provider: 'openai', apiKey: '  ' }); } catch (error) { return error; } return null; })() as AiProviderError;
    expect(missing).toBeInstanceOf(AiProviderError);
    expect(missing.cause).toBe('not-configured');
    expect(missing.message).toMatch(/API key/);
    expect(() => createProvider({ provider: 'custom', apiKey: KEY })).toThrow(/endpoint URL/);
    expect(createProvider({ provider: 'ollama', apiKey: '' }).endpoint).toBe('http://localhost:11434/v1/chat/completions');
  });
});
