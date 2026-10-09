import { describe, expect, it, vi } from 'vitest';
import { AI_PROVIDERS, providerById } from './providers';
import { AiProviderError, STALL_MS, createProvider, ollamaContext } from './provider';

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
    expect(body).toMatchObject({ model: 'claude-sonnet-5-5', max_tokens: 16_000, system: [{ type: 'text', text: 'sys', cache_control: { type: 'ephemeral' } }], cache_control: { type: 'ephemeral' }, messages: [{ role: 'user', content: 'draw' }] });
  });

  it('joins multiple text blocks and ignores non-text ones', async () => {
    const { text } = await call('claude', ok({ content: [{ type: 'thinking', thinking: 'hmm' }, { type: 'text', text: 'one' }, { type: 'text', text: 'two' }] }));
    expect(text).toBe('onetwo');
  });
});

describe('anthropic thinking and caching', () => {
  const send = async (model: string, request: { system?: string; thinking?: boolean } = {}) => {
    const fetchMock = vi.fn(async () => ok({ content: [{ type: 'text', text: 'x' }] }));
    vi.stubGlobal('fetch', fetchMock);
    await createProvider({ provider: 'claude', apiKey: KEY, model }).complete({ system: 'sys', prompt: 'draw', ...request });
    const [, init] = fetchMock.mock.calls[0]! as unknown as [string, RequestInit];
    vi.unstubAllGlobals();
    return JSON.parse(String(init.body)) as Record<string, unknown>;
  };

  it.each(['claude-sonnet-5-5', 'claude-opus-5-5', 'claude-fable-5-1', 'claude-opus-4-6', 'claude-opus-4-7', 'claude-opus-4-8', 'claude-sonnet-4-6', 'my-proxy-model'])(
    '%s gets adaptive summarized thinking', async (model) => {
      expect((await send(model, { thinking: true })).thinking).toEqual({ type: 'adaptive', display: 'summarized' });
    });

  it.each(['claude-haiku-4-5', 'claude-sonnet-4-5-20250929', 'claude-opus-4-5', 'claude-opus-4-1-20250805', 'claude-opus-4-20250514', 'claude-sonnet-4', 'claude-3-7-sonnet-20250219'])(
    '%s keeps the budget_tokens form', async (model) => {
      expect((await send(model, { thinking: true })).thinking).toEqual({ type: 'enabled', budget_tokens: 4000 });
    });

  it('sends no thinking key when thinking is off', async () => {
    expect(await send('claude-sonnet-5-5')).not.toHaveProperty('thinking');
  });

  it('caches the system prompt and the growing conversation', async () => {
    const body = await send('claude-sonnet-5-5');
    expect(body.system).toEqual([{ type: 'text', text: 'sys', cache_control: { type: 'ephemeral' } }]);
    expect(body.cache_control).toEqual({ type: 'ephemeral' });
  });

  it('sends no system block when the system prompt is blank', async () => {
    expect(await send('claude-sonnet-5-5', { system: '  ' })).not.toHaveProperty('system');
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
    expect(openaiWired.map(({ id }) => id)).toEqual(['openai', 'groq', 'nvidia', 'cerebras', 'mistral', 'openrouter', 'custom']);
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

  it('lets Ollama run without a key on its native chat API, asking for a context that fits', async () => {
    const fetchMock = vi.fn(async () => ok({ message: { role: 'assistant', content: 'x' }, done: true }));
    vi.stubGlobal('fetch', fetchMock);
    // A base URL saved for the old /v1 shim still reaches the native API.
    for (const baseUrl of [undefined, 'http://localhost:11434/v1']) {
      await createProvider({ provider: 'ollama', apiKey: '', ...(baseUrl ? { baseUrl } : {}) }).complete({ system: 's', prompt: 'p' });
    }
    for (const [url, init] of fetchMock.mock.calls as unknown as [string, RequestInit][]) {
      expect(url).toBe('http://localhost:11434/api/chat');
      expect((init.headers as Record<string, string>).authorization).toBeUndefined();
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      expect(body).toMatchObject({ stream: false, options: { num_ctx: 8192, num_predict: 4096 } });
      expect(body).not.toHaveProperty('think');
    }
    vi.unstubAllGlobals();
  });

  it('sizes the Ollama context to the request in doubling steps, never under 8k', () => {
    expect(ollamaContext({ messages: [{ content: 'hi' }] }, 4096)).toBe(8192);
    expect(ollamaContext({ messages: [{ content: 'x'.repeat(30_000) }] }, 4096)).toBe(16_384);
    expect(ollamaContext({ messages: [{ content: 'x'.repeat(60_000) }] }, 4096)).toBe(32_768);
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

  it('quotes the provider error but never the key, however short', async () => {
    for (const provider of ['openai', 'claude', 'gemini'] as const) {
      vi.stubGlobal('fetch', vi.fn(async () => fail(401, '{"error":{"message":"Incorrect API key provided: sk-x"}}')));
      const error = (await createProvider({ provider, apiKey: 'sk-x' }).complete({ system: 's', prompt: 'p' }).catch((caught: unknown) => caught)) as AiProviderError;
      vi.unstubAllGlobals();
      expect(error.message).toContain('Incorrect API key provided: [key]');
      expect(error.message).not.toContain('sk-x');
    }
  });

  it('tells a closed Ollama port from a CORS refusal with a no-cors probe', async () => {
    const run = async (listening: boolean) => {
      vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.mode === 'no-cors' && listening) return { ok: false, status: 0 } as Response;
        throw new TypeError('Failed to fetch');
      }));
      const provider = createProvider({ provider: 'ollama', apiKey: '' });
      const error = (await provider.complete({ system: 's', prompt: 'p' }).catch((caught: unknown) => caught)) as AiProviderError;
      vi.unstubAllGlobals();
      return error.message;
    };
    expect(await run(false)).toMatch(/Ollama is not running/);
    expect(await run(true)).toMatch(/OLLAMA_ORIGINS=/);
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
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    const provider = createProvider({ provider: 'openai', apiKey: KEY });
    const error = (await provider.complete({ system: 's', prompt: 'p' }).catch((caught: unknown) => caught)) as AiProviderError;
    expect(error.cause).toBe('offline');
    vi.unstubAllGlobals();
    // The override is an own property; deleting it uncovers the prototype's getter again.
    delete (navigator as { onLine?: boolean }).onLine;
  });

  it('treats a timeout as a down endpoint, and passes AbortError through untouched', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new DOMException('The operation timed out.', 'TimeoutError'); }));
    const provider = createProvider({ provider: 'openai', apiKey: KEY });
    const error = (await provider.complete({ system: 's', prompt: 'p' }).catch((caught: unknown) => caught)) as AiProviderError;
    expect(error.cause).toBe('provider-down');
    expect(error.message).toMatch(/in time/);
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

  it('refuses a key with a character no key has, before fetch can throw it as CORS', () => {
    for (const key of ['sk-ant-ab→cd', 'sk-ant-ab\u200bcd', 'sk-ant-ab\ncd', 'sk-ant-ab cd']) {
      expect(() => createProvider({ provider: 'claude', apiKey: key }), JSON.stringify(key)).toThrow(/hidden or unusual character/);
    }
    expect(() => createProvider({ provider: 'claude', apiKey: '  sk-ant-abc\n' })).not.toThrow();
  });

  it('refuses to build a keyed provider without a key, and Ollama without anything', () => {
    const missing = (() => { try { createProvider({ provider: 'openai', apiKey: '  ' }); } catch (error) { return error; } return null; })() as AiProviderError;
    expect(missing).toBeInstanceOf(AiProviderError);
    expect(missing.cause).toBe('not-configured');
    expect(missing.message).toMatch(/API key/);
    expect(() => createProvider({ provider: 'custom', apiKey: KEY })).toThrow(/endpoint URL/);
    expect(createProvider({ provider: 'ollama', apiKey: '' }).endpoint).toBe('http://localhost:11434/api/chat');
  });
});

describe('streaming and conversation', () => {
  const sse = (...events: unknown[]) => {
    const text = events.map((event) => `data: ${typeof event === 'string' ? event : JSON.stringify(event)}\n\n`).join('');
    const bytes = new TextEncoder().encode(text);
    // Split mid-event so the reader has to buffer across chunks.
    const body = new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(bytes.slice(0, 17)); controller.enqueue(bytes.slice(17)); controller.close(); },
    });
    return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
  };
  const stream = async (id: Parameters<typeof createProvider>[0]['provider'], reply: Response) => {
    const fetchMock = vi.fn(async () => reply);
    vi.stubGlobal('fetch', fetchMock);
    const deltas: { text?: string; thinking?: string }[] = [];
    const text = await createProvider({ provider: id, apiKey: KEY }).complete({
      system: 's', thinking: true, onDelta: (delta) => deltas.push(delta),
      messages: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'Hello' }, { role: 'user', content: 'draw' }],
    });
    const [url, init] = fetchMock.mock.calls[0]! as unknown as [string, RequestInit];
    vi.unstubAllGlobals();
    return { text, deltas, url, body: JSON.parse(String(init.body)) as Record<string, unknown> };
  };

  it('streams Claude text and thinking, and sends the whole conversation', async () => {
    const { text, deltas, body } = await stream('claude', sse(
      { type: 'content_block_delta', delta: { type: 'thinking_delta', thinking: 'Plan.' } },
      { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hel' } },
      { type: 'content_block_delta', delta: { type: 'text_delta', text: 'lo' } },
      { type: 'message_stop' },
    ));
    expect(text).toBe('Hello');
    expect(deltas).toEqual([{ thinking: 'Plan.' }, { text: 'Hel' }, { text: 'lo' }]);
    expect(body).toMatchObject({ stream: true, thinking: { type: 'adaptive', display: 'summarized' } });
    expect((body.messages as unknown[]).length).toBe(3);
  });

  it('streams Gemini from the SSE endpoint and marks thought parts as thinking', async () => {
    const { text, deltas, url, body } = await stream('gemini', sse(
      { candidates: [{ content: { parts: [{ text: 'Hmm', thought: true }] } }] },
      { candidates: [{ content: { parts: [{ text: 'Hi' }] } }] },
    ));
    expect(url).toContain(':streamGenerateContent?alt=sse');
    expect(text).toBe('Hi');
    expect(deltas).toEqual([{ thinking: 'Hmm' }, { text: 'Hi' }]);
    expect(body).toMatchObject({
      contents: [{ role: 'user' }, { role: 'model', parts: [{ text: 'Hello' }] }, { role: 'user' }],
      generationConfig: { thinkingConfig: { includeThoughts: true } },
    });
  });

  it('streams OpenAI-wire content and whichever reasoning field the server names', async () => {
    const { text, deltas, body } = await stream('openrouter', sse(
      { choices: [{ delta: { reasoning: 'Think' } }] },
      { choices: [{ delta: { reasoning_content: ' more' } }] },
      { choices: [{ delta: { content: 'Done' } }] },
      '[DONE]',
    ));
    expect(text).toBe('Done');
    expect(deltas).toEqual([{ thinking: 'Think', text: '' }, { thinking: ' more', text: '' }, { thinking: '', text: 'Done' }]);
    expect(body).toMatchObject({ stream: true, messages: [{ role: 'system' }, { role: 'user' }, { role: 'assistant' }, { role: 'user' }] });
  });

  it('turns an error sent inside a 200 stream into a provider failure, on every wire', async () => {
    const overloaded = await stream('claude', sse(
      { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Half' } },
      { type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } },
    )).catch((error: unknown) => error);
    expect(overloaded).toBeInstanceOf(AiProviderError);
    expect(overloaded).toMatchObject({ cause: 'provider-down', status: 529, retryable: true });
    expect((overloaded as Error).message).toMatch(/overloaded right now \(529\).*Claude said: “Overloaded”/);
    const limited = await stream('openrouter', sse({ error: { message: 'Slow down', code: 429 } })).catch((error: unknown) => error);
    expect(limited).toMatchObject({ cause: 'rate-limited', status: 429 });
  });

  it('says the reply hit the output limit instead of passing on half of it', async () => {
    const cut = [
      stream('claude', sse(
        { type: 'content_block_delta', delta: { type: 'text_delta', text: '```openflow\nflowchart\n  A ->' } },
        { type: 'message_delta', delta: { stop_reason: 'max_tokens' } },
      )),
      stream('claude', ok({ content: [{ type: 'text', text: 'flowchart' }], stop_reason: 'max_tokens' })),
      stream('openrouter', sse({ choices: [{ delta: { content: 'A' }, finish_reason: 'length' }] })),
      stream('gemini', sse({ candidates: [{ content: { parts: [{ text: 'A' }] }, finishReason: 'MAX_TOKENS' }] })),
    ];
    for (const result of await Promise.all(cut.map((reply) => reply.catch((error: unknown) => error)))) {
      expect(result).toBeInstanceOf(AiProviderError);
      expect(result).toMatchObject({ cause: 'too-long', retryable: false });
      expect((result as Error).message).toMatch(/output limit/);
    }
  });

  it('names a connection that drops mid-reply, not a bare TypeError', async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hi"}}\n\n'));
        controller.error(new TypeError('network error'));
      },
    });
    const dropped = await stream('claude', new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } }))
      .catch((error: unknown) => error);
    expect(dropped).toBeInstanceOf(AiProviderError);
    expect(dropped).toMatchObject({ cause: 'provider-down', retryable: true });
    expect((dropped as Error).message).toBe('The connection to Claude dropped mid-reply. Try again.');
  });

  it('gives up on a stream that goes quiet, but leaves Stop an AbortError', async () => {
    // Like a real fetch: aborting the request errors the body mid-read.
    const quiet = vi.fn(async (_url: string, init: RequestInit) => new Response(new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hi"}}\n\n'));
        init.signal!.addEventListener('abort', () => controller.error(new DOMException('aborted', 'AbortError')));
      },
    }), { status: 200, headers: { 'content-type': 'text/event-stream' } }));
    vi.useFakeTimers();
    vi.stubGlobal('fetch', quiet);
    const provider = createProvider({ provider: 'claude', apiKey: KEY });
    const stalled = provider.complete({ system: 's', prompt: 'p', onDelta: () => undefined }).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(STALL_MS - 1000);
    const stop = new AbortController();
    const stopped = provider.complete({ system: 's', prompt: 'p', onDelta: () => undefined, signal: stop.signal }).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(1000);
    expect(await stalled).toMatchObject({ cause: 'provider-down', message: 'Claude went quiet for 2 minutes mid-reply. Try again.' });
    stop.abort();
    expect(await stopped).toMatchObject({ name: 'AbortError' });
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('streams Ollama NDJSON: thinking, text and whole tool calls; a cut reply and an error line fail loudly', async () => {
    const ndjson = (...lines: unknown[]) => new Response(lines.map((line) => `${JSON.stringify(line)}\n`).join(''),
      { status: 200, headers: { 'content-type': 'application/x-ndjson' } });
    const fetchMock = vi.fn(async () => ndjson(
      { message: { role: 'assistant', content: '', thinking: 'Plan.' }, done: false },
      { message: { role: 'assistant', content: 'Drawing.' }, done: false },
      { message: { role: 'assistant', content: '', tool_calls: [{ function: { name: 'add_diagram', arguments: { dsl: 'flowchart\nA -> B' } } }] }, done: false },
      { message: { role: 'assistant', content: '', tool_calls: [{ function: { name: 'list_diagrams', arguments: {} } }] }, done: false },
      { message: { role: 'assistant', content: '' }, done: true, done_reason: 'stop' },
    ));
    vi.stubGlobal('fetch', fetchMock);
    const deltas: unknown[] = [];
    const provider = createProvider({ provider: 'ollama', apiKey: '' });
    const turn = await provider.respond({
      system: 's', onDelta: (delta) => deltas.push(delta),
      tools: [{ name: 'add_diagram', description: 'd', parameters: { type: 'object' } }],
      messages: [
        { role: 'user', content: 'draw', images: [{ mediaType: 'image/png', data: 'AAAA' }] },
        { role: 'assistant', content: '', toolCalls: [{ id: 'c0', name: 'list_diagrams', input: {} }] },
        { role: 'tool', results: [{ callId: 'c0', name: 'list_diagrams', content: '[]' }] },
      ],
    });
    expect(turn.text).toBe('Drawing.');
    expect(deltas).toContainEqual({ thinking: 'Plan.', text: '' });
    expect(turn.toolCalls).toEqual([
      { id: 'call_0', name: 'add_diagram', input: { dsl: 'flowchart\nA -> B' } },
      { id: 'call_1', name: 'list_diagrams', input: {} },
    ]);
    const body = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body)) as { messages: unknown[]; stream: boolean };
    expect(body.stream).toBe(true);
    // Ollama's own shapes: images as bare base64, tool arguments as objects, results named by tool.
    expect(body.messages).toEqual([
      { role: 'system', content: 's' },
      { role: 'user', content: 'draw', images: ['AAAA'] },
      { role: 'assistant', content: '', tool_calls: [{ function: { name: 'list_diagrams', arguments: {} } }] },
      { role: 'tool', tool_name: 'list_diagrams', content: '[]' },
    ]);
    vi.stubGlobal('fetch', vi.fn(async () => ndjson({ message: { content: 'flowchart' }, done: true, done_reason: 'length' })));
    await expect(provider.complete({ system: 's', prompt: 'p', onDelta: () => undefined })).rejects.toMatchObject({ cause: 'too-long' });
    vi.stubGlobal('fetch', vi.fn(async () => ndjson({ error: 'model runner has unexpectedly stopped' })));
    await expect(provider.complete({ system: 's', prompt: 'p', onDelta: () => undefined }))
      .rejects.toThrow(/Ollama said: “model runner has unexpectedly stopped”/);
    vi.unstubAllGlobals();
  });

  it('reads a JSON reply whole when a streamed request is not answered with SSE', async () => {
    const { text, deltas } = await stream('claude', ok({ content: [{ type: 'text', text: 'flowchart\n  A -> B' }] }));
    expect(text).toBe('flowchart\n  A -> B');
    expect(deltas).toEqual([{ text: 'flowchart\n  A -> B' }]);
  });
});

describe('tool calls and images', () => {
  const sse = (...events: unknown[]) => new Response(
    events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(''),
    { status: 200, headers: { 'content-type': 'text/event-stream' } },
  );
  const TOOLS = [{ name: 'read_diagram', description: 'Read one.', parameters: { type: 'object', properties: { frame_id: { type: 'string' } } } }];
  const IMAGE = { mediaType: 'image/png', data: 'iVBORw0' };
  /** Round one returns `reply`; round two replays the call and its result. */
  const loop = async (id: Parameters<typeof createProvider>[0]['provider'], reply: Response) => {
    const fetchMock = vi.fn(async () => reply);
    vi.stubGlobal('fetch', fetchMock);
    const provider = createProvider({ provider: id, apiKey: KEY });
    const user = { role: 'user' as const, content: 'look', images: [IMAGE] };
    const turn = await provider.respond({ system: 's', tools: TOOLS, messages: [user], onDelta: () => undefined });
    fetchMock.mockResolvedValueOnce(ok({}));
    await provider.respond({
      system: 's', tools: TOOLS,
      messages: [user, { role: 'assistant', content: turn.text, toolCalls: turn.toolCalls, replay: turn.replay },
        { role: 'tool', results: turn.toolCalls.map(({ id: callId, name }) => ({ callId, name, content: 'flowchart\n  A -> B' })) }],
    }).catch(() => undefined);
    const bodies = fetchMock.mock.calls.map((call) => JSON.parse(String((call as unknown as [string, RequestInit])[1].body)) as Record<string, unknown>);
    vi.unstubAllGlobals();
    return { turn, first: bodies[0]!, second: bodies[1]! };
  };

  it('Claude: tool_use input streams as JSON fragments; thinking and its signature replay', async () => {
    const { turn, first, second } = await loop('claude', sse(
      { type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'Read it.' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'signature_delta', signature: 'sig' } },
      { type: 'content_block_start', index: 1, content_block: { type: 'tool_use', id: 'toolu_1', name: 'read_diagram', input: {} } },
      { type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '{"frame_' } },
      { type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: 'id":"f1"}' } },
    ));
    expect(turn.toolCalls).toEqual([{ id: 'toolu_1', name: 'read_diagram', input: { frame_id: 'f1' } }]);
    expect(first).toMatchObject({
      tools: [{ name: 'read_diagram', input_schema: TOOLS[0]!.parameters }],
      messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'iVBORw0' } }, { type: 'text', text: 'look' }] }],
    });
    expect(second.messages).toMatchObject([{ role: 'user' },
      { role: 'assistant', content: [{ type: 'thinking', thinking: 'Read it.', signature: 'sig' }, { type: 'tool_use', id: 'toolu_1', input: { frame_id: 'f1' } }] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'flowchart\n  A -> B' }] }]);
  });

  it('OpenAI wire: tool_calls stream by index; results go back as tool messages', async () => {
    const { turn, first, second } = await loop('openai', sse(
      { choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_a', type: 'function', function: { name: 'read_diagram', arguments: '{"frame' } }] } }] },
      { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '_id":"f1"}' } }] } }] },
    ));
    expect(turn).toMatchObject({ text: '', toolCalls: [{ id: 'call_a', name: 'read_diagram', input: { frame_id: 'f1' } }] });
    expect(first).toMatchObject({
      tools: [{ type: 'function', function: { name: 'read_diagram', parameters: TOOLS[0]!.parameters } }],
      messages: [{ role: 'system' }, { role: 'user', content: [{ type: 'text', text: 'look' }, { type: 'image_url', image_url: { url: 'data:image/png;base64,iVBORw0' } }] }],
    });
    expect(second.messages).toMatchObject([{ role: 'system' }, { role: 'user' },
      { role: 'assistant', content: null, tool_calls: [{ id: 'call_a', type: 'function', function: { name: 'read_diagram', arguments: '{"frame_id":"f1"}' } }] },
      { role: 'tool', tool_call_id: 'call_a', content: 'flowchart\n  A -> B' }]);
  });

  it('Gemini: a function call replays with its thoughtSignature; minted ids never go back', async () => {
    const { turn, first, second } = await loop('gemini', sse(
      { candidates: [{ content: { parts: [{ text: 'Planning', thought: true }] } }] },
      { candidates: [{ content: { parts: [{ functionCall: { name: 'read_diagram', args: { frame_id: 'f1' } }, thoughtSignature: 'sig' }] } }] },
    ));
    expect(turn.toolCalls).toEqual([{ id: 'gemini-call-0', name: 'read_diagram', input: { frame_id: 'f1' } }]);
    expect(first).toMatchObject({
      tools: [{ functionDeclarations: [{ name: 'read_diagram' }] }],
      contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'image/png', data: 'iVBORw0' } }, { text: 'look' }] }],
    });
    expect(second.contents).toEqual([expect.anything(),
      { role: 'model', parts: [{ functionCall: { name: 'read_diagram', args: { frame_id: 'f1' } }, thoughtSignature: 'sig' }] },
      { role: 'user', parts: [{ functionResponse: { name: 'read_diagram', response: { result: 'flowchart\n  A -> B' } } }] }]);
  });

  it('a turn with tool calls and no text is not an empty reply', async () => {
    const { turn } = await loop('openai', ok({ choices: [{ message: { content: null, tool_calls: [{ id: 'c', function: { name: 'read_diagram', arguments: '{}' } }] } }] }));
    expect(turn.toolCalls).toHaveLength(1);
  });
});
