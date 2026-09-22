import { describe, expect, it } from 'vitest';
import { providerById } from './providers';
import { RETRYABLE, classifyStatus, describeCause, originOf, type FailureContext } from './diagnosis';

const context = (overrides: Partial<FailureContext> = {}): FailureContext => ({
  definition: providerById('openai'),
  endpoint: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-5-mini',
  status: null,
  ...overrides,
});

describe('failure causes', () => {
  it('classifies every status the wire can return', () => {
    expect(classifyStatus(401, '')).toBe('bad-key');
    expect(classifyStatus(403, '')).toBe('bad-key');
    expect(classifyStatus(404, 'model not found')).toBe('bad-model');
    expect(classifyStatus(429, '')).toBe('rate-limited');
    expect(classifyStatus(500, '')).toBe('provider-down');
    expect(classifyStatus(529, '')).toBe('provider-down');
    expect(classifyStatus(400, '{"error":{"status":"API_KEY_INVALID"}}')).toBe('bad-key');
    expect(classifyStatus(400, 'invalid model id')).toBe('bad-model');
    expect(classifyStatus(400, 'malformed field')).toBe('bad-response');
    expect(classifyStatus(418, '')).toBe('bad-response');
  });

  it('marks only transient causes retryable', () => {
    expect(RETRYABLE['rate-limited']).toBe(true);
    expect(RETRYABLE['provider-down']).toBe(true);
    expect(RETRYABLE.offline).toBe(true);
    expect(RETRYABLE['bad-response']).toBe(true);
    for (const cause of ['bad-key', 'bad-model', 'blocked-by-browser', 'not-configured'] as const) {
      expect(RETRYABLE[cause], cause).toBe(false);
    }
  });

  it('sends a bad key to the right console, and never quotes a body', () => {
    const message = describeCause('bad-key', context({ status: 401 }));
    expect(message).toMatch(/rejected the key \(401\)/);
    expect(message).toContain('https://platform.openai.com/api-keys');
    expect(describeCause('bad-model', context({ status: 404 }))).toMatch(/did not find the model "gpt-5-mini"/);
    expect(describeCause('rate-limited', context({ status: 429 }))).toMatch(/429/);
    expect(describeCause('provider-down', context({ status: 502 }))).toMatch(/server error \(502\)/);
    expect(describeCause('bad-response', context({ status: 200 }))).toMatch(/could not read/);
    expect(describeCause('not-configured', context())).toMatch(/settings/);
  });

  it('tells the browser-refused story differently per provider risk', () => {
    const proxy = describeCause('blocked-by-browser', context({ definition: providerById('groq'), endpoint: 'https://api.groq.com/openai/v1/chat/completions' }));
    expect(proxy).toMatch(/does not accept browser calls/);
    expect(proxy).toMatch(/Gemini, OpenRouter/);

    const mixed = describeCause('blocked-by-browser', context({ definition: providerById('claude'), endpoint: 'https://api.anthropic.com/v1/messages' }));
    expect(mixed).toMatch(/CORS\) or the address is wrong/);

    const friendly = describeCause('blocked-by-browser', context({ definition: providerById('gemini'), endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/x:generateContent' }));
    expect(friendly).toMatch(/address looks wrong/);

    const custom = describeCause('blocked-by-browser', context({ definition: providerById('custom'), endpoint: 'https://proxy.example/v1/chat/completions' }));
    expect(custom).toContain('https://proxy.example');
    expect(custom).toMatch(/Access-Control-Allow-Origin/);
  });

  it('names the origin our own CSP blocked, and says what to change', () => {
    const message = describeCause('blocked-by-browser', context({ blockedOrigin: 'http://intranet.example' }));
    expect(message).toMatch(/security policy blocked http:\/\/intranet\.example/);
    expect(message).toMatch(/https:\/\//);
  });

  it('gives Ollama the exact OLLAMA_ORIGINS command', () => {
    const message = describeCause('blocked-by-browser', context({
      definition: providerById('ollama'), endpoint: 'http://localhost:11434/v1/chat/completions', pageOrigin: 'http://localhost:4173',
    }));
    expect(message).toContain("OLLAMA_ORIGINS='http://localhost:4173' ollama serve");
  });

  it('covers the last two causes with a next action', () => {
    expect(describeCause('offline', context())).toMatch(/offline/);
    expect(describeCause('provider-down', context({ timedOut: true }))).toMatch(/30 seconds/);
  });

  it('extracts the origin from whatever the browser reported', () => {
    expect(originOf('https://api.openai.com/v1/chat/completions')).toBe('https://api.openai.com');
    expect(originOf('not a url')).toBe('not a url');
  });
});
