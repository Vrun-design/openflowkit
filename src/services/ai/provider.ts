// BYOK provider clients. Three wire formats cover all ten catalogue entries
// (providers.ts): Anthropic messages, OpenAI chat completions, Google
// generateContent. Provider differences are read from the catalogue, not
// branched on here. Keys never leave this module's request headers: nothing is
// logged, stored or echoed — including provider error bodies, which can quote
// a key back at us.
import { providerById, type AiProviderDefinition, type AiProviderId } from './providers';
import { RETRYABLE, classifyStatus, describeCause, originOf, type AiFailureCause } from './diagnosis';

export interface AiProviderConfig {
  readonly provider: AiProviderId;
  readonly apiKey: string;
  /** Base URL override; the provider default applies when absent. */
  readonly baseUrl?: string;
  readonly model?: string;
}

export interface AiCompletionRequest {
  readonly system: string;
  readonly prompt: string;
  readonly maxTokens?: number;
  readonly signal?: AbortSignal;
}

export interface AiProvider {
  readonly id: AiProviderId;
  readonly model: string;
  readonly endpoint: string;
  complete(request: AiCompletionRequest): Promise<string>;
}

export class AiProviderError extends Error {
  /** Why it failed; drives `retryable` and the sentence the user reads. */
  readonly cause: AiFailureCause;
  readonly status: number | null;
  readonly retryable: boolean;
  /** The origin a CSP or CORS failure names, when known. */
  readonly origin?: string;

  constructor(message: string, details: { readonly cause: AiFailureCause; readonly status?: number | null; readonly origin?: string }) {
    super(message);
    this.name = 'AiProviderError';
    this.cause = details.cause;
    this.status = details.status ?? null;
    this.retryable = RETRYABLE[details.cause];
    if (details.origin) this.origin = details.origin;
  }
}

const trimSlash = (value: string): string => value.replace(/\/+$/, '');

const pageOrigin = (): string | undefined =>
  typeof location === 'undefined' ? undefined : location.origin;

const isOffline = (): boolean =>
  typeof navigator !== 'undefined' && navigator.onLine === false;

/**
 * A rejected cross-origin POST is almost always CORS or CSP, and the console
 * shows the same TypeError for both. A CSP block also fires
 * securitypolicyviolation, which the provider's CORS policy never does — that
 * event is the discriminator.
 */
function watchCspViolations(): { blocked: (url: string) => string | null; stop: () => void } {
  if (typeof document === 'undefined') return { blocked: () => null, stop: () => undefined };
  const violations: string[] = [];
  const record = (event: Event) => {
    const details = event as Partial<SecurityPolicyViolationEvent>;
    if (!String(details.effectiveDirective ?? '').startsWith('connect-src')) return;
    const blocked = String(details.blockedURI ?? '');
    if (blocked) violations.push(blocked);
  };
  document.addEventListener('securitypolicyviolation', record);
  return {
    blocked: (url) => violations.find((blockedUri) => originOf(blockedUri) === originOf(url)) ?? null,
    stop: () => document.removeEventListener('securitypolicyviolation', record),
  };
}

interface WireCall {
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly body: unknown;
  readonly definition: AiProviderDefinition;
  readonly model: string;
  readonly signal?: AbortSignal;
}

async function postJson({ url, headers, body, definition, model, signal }: WireCall): Promise<unknown> {
  const csp = watchCspViolations();
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      ...(signal ? { signal } : {}),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') { csp.stop(); throw error; }
    // The violation report is queued as a task, so give it one before reading.
    await new Promise((resolve) => setTimeout(resolve, 0));
    const blockedOrigin = csp.blocked(url);
    csp.stop();
    const timedOut = error instanceof DOMException && error.name === 'TimeoutError';
    const cause: AiFailureCause = blockedOrigin ? 'blocked-by-browser'
      : timedOut ? 'provider-down'
        : isOffline() ? 'offline'
          : 'blocked-by-browser';
    throw new AiProviderError(describeCause(cause, {
      definition, endpoint: url, model, status: null,
      ...(blockedOrigin ? { blockedOrigin } : {}),
      ...(timedOut ? { timedOut: true } : {}),
      ...(pageOrigin() ? { pageOrigin: pageOrigin()! } : {}),
    }), { cause, ...(blockedOrigin ? { origin: blockedOrigin } : {}) });
  }
  csp.stop();
  const text = await response.text();
  if (!response.ok) {
    const cause = classifyStatus(response.status, text);
    throw new AiProviderError(describeCause(cause, {
      definition, endpoint: url, model, status: response.status,
      ...(pageOrigin() ? { pageOrigin: pageOrigin()! } : {}),
    }), { cause, status: response.status });
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new AiProviderError(describeCause('bad-response', { definition, endpoint: url, model, status: response.status }), { cause: 'bad-response', status: response.status });
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function requireText(text: string, definition: AiProviderDefinition): string {
  if (text.trim()) return text;
  throw new AiProviderError(
    definition.wire === 'google'
      ? 'Gemini returned no text — it may have blocked the prompt. Rephrase it, or choose another model.'
      : 'The provider returned no text. Try again, or choose another model.',
    { cause: 'bad-response' },
  );
}

function createAnthropicProvider(definition: AiProviderDefinition, baseUrl: string, model: string, apiKey: string): AiProvider {
  const endpoint = `${baseUrl}/v1/messages`;
  return {
    id: definition.id, model, endpoint,
    async complete({ system, prompt, maxTokens = 4096, signal }) {
      const payload = await postJson({
        url: endpoint, definition, model, signal,
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: { model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: prompt }] },
      });
      const blocks = asRecord(payload).content;
      return requireText(Array.isArray(blocks)
        ? blocks.map((block) => (asRecord(block).type === 'text' ? String(asRecord(block).text ?? '') : '')).join('')
        : '', definition);
    },
  };
}

function createOpenAiProvider(definition: AiProviderDefinition, baseUrl: string, model: string, apiKey: string): AiProvider {
  const endpoint = `${baseUrl}/chat/completions`;
  const headers: Record<string, string> = { ...definition.extraHeaders };
  if (definition.needsKey) headers.authorization = `Bearer ${apiKey}`;
  const maxTokensParam = definition.maxTokensParam ?? 'max_tokens';
  return {
    id: definition.id, model, endpoint,
    async complete({ system, prompt, maxTokens = 4096, signal }) {
      const payload = await postJson({
        url: endpoint, definition, model, signal,
        headers,
        body: {
          model, [maxTokensParam]: maxTokens,
          messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
        },
      });
      const choices = asRecord(payload).choices;
      return requireText(Array.isArray(choices) ? String(asRecord(asRecord(choices[0]).message).content ?? '') : '', definition);
    },
  };
}

function createGoogleProvider(definition: AiProviderDefinition, baseUrl: string, model: string, apiKey: string): AiProvider {
  // ponytail: model ids with slashes are encoded; tuned-model resource names would need the full path — the override field is the escape hatch.
  const endpoint = `${baseUrl}/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  return {
    id: definition.id, model, endpoint,
    async complete({ system, prompt, maxTokens = 4096, signal }) {
      const payload = await postJson({
        url: endpoint, definition, model, signal,
        headers: { 'x-goog-api-key': apiKey },
        body: {
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: maxTokens },
        },
      });
      const candidates = asRecord(payload).candidates;
      const parts = Array.isArray(candidates) ? asRecord(asRecord(candidates[0]).content).parts : [];
      return requireText(Array.isArray(parts)
        ? parts.map((part) => String(asRecord(part).text ?? '')).join('')
        : '', definition);
    },
  };
}

export function createProvider(config: AiProviderConfig): AiProvider {
  const definition = providerById(config.provider);
  const baseUrl = trimSlash(config.baseUrl?.trim() || definition.defaultBaseUrl);
  const model = config.model?.trim() || definition.defaultModel;
  const apiKey = config.apiKey.trim();
  if (definition.needsKey && !apiKey) {
    throw new AiProviderError('Add an API key in the provider settings.', { cause: 'not-configured' });
  }
  if (!baseUrl) throw new AiProviderError('Add the endpoint URL for this provider.', { cause: 'not-configured' });
  if (!model) throw new AiProviderError('Add a model id for this provider.', { cause: 'not-configured' });

  if (definition.wire === 'anthropic') return createAnthropicProvider(definition, baseUrl, model, apiKey);
  if (definition.wire === 'google') return createGoogleProvider(definition, baseUrl, model, apiKey);
  return createOpenAiProvider(definition, baseUrl, model, apiKey);
}
