// BYOK provider clients. Three wire formats cover all ten catalogue entries
// (providers.ts): Anthropic messages, OpenAI chat completions, Google
// generateContent. Provider differences are read from the catalogue, not
// branched on here. Keys never leave this module's request headers: nothing is
// logged, stored or echoed — including provider error bodies, which can quote
// a key back at us.
import { providerById, type AiProviderDefinition, type AiProviderId } from './providers';

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
  readonly status: number | null;
  readonly retryable: boolean;

  constructor(message: string, status: number | null, retryable: boolean) {
    super(message);
    this.name = 'AiProviderError';
    this.status = status;
    this.retryable = retryable;
  }
}

const trimSlash = (value: string): string => value.replace(/\/+$/, '');

/** Answers the question users actually have when a call fails. Never includes the provider's raw body. */
function describeStatus(status: number): { message: string; retryable: boolean } {
  if (status === 401 || status === 403) return { message: 'The provider rejected the key. Check the provider settings.', retryable: false };
  if (status === 404) return { message: 'The provider did not find that model or endpoint.', retryable: false };
  if (status === 429) return { message: 'Rate limited by the provider. Try again in a moment.', retryable: true };
  if (status >= 500) return { message: `The provider had a server error (${status}).`, retryable: true };
  return { message: `The provider answered ${status}.`, retryable: false };
}

async function postJson(url: string, headers: Record<string, string>, body: unknown, signal?: AbortSignal): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      ...(signal ? { signal } : {}),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new AiProviderError('Could not reach the provider. Check your network and the base URL.', null, true);
  }
  const text = await response.text();
  if (!response.ok) {
    const { message, retryable } = describeStatus(response.status);
    throw new AiProviderError(message, response.status, retryable);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new AiProviderError('The provider returned a non-JSON response.', response.status, true);
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

const requireText = (text: string): string => {
  if (!text.trim()) throw new AiProviderError('The provider returned no text.', null, true);
  return text;
};

function createAnthropicProvider(definition: AiProviderDefinition, baseUrl: string, model: string, apiKey: string): AiProvider {
  const endpoint = `${baseUrl}/v1/messages`;
  return {
    id: definition.id, model, endpoint,
    async complete({ system, prompt, maxTokens = 4096, signal }) {
      const payload = await postJson(endpoint, {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      }, { model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: prompt }] }, signal);
      const blocks = asRecord(payload).content;
      return requireText(Array.isArray(blocks)
        ? blocks.map((block) => (asRecord(block).type === 'text' ? String(asRecord(block).text ?? '') : '')).join('')
        : '');
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
      const payload = await postJson(endpoint, headers, {
        model, [maxTokensParam]: maxTokens,
        messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
      }, signal);
      const choices = asRecord(payload).choices;
      return requireText(Array.isArray(choices) ? String(asRecord(asRecord(choices[0]).message).content ?? '') : '');
    },
  };
}

function createGoogleProvider(definition: AiProviderDefinition, baseUrl: string, model: string, apiKey: string): AiProvider {
  // ponytail: model ids with slashes are encoded; tuned-model resource names would need the full path — the override field is the escape hatch.
  const endpoint = `${baseUrl}/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  return {
    id: definition.id, model, endpoint,
    async complete({ system, prompt, maxTokens = 4096, signal }) {
      const payload = await postJson(endpoint, { 'x-goog-api-key': apiKey }, {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      }, signal);
      const candidates = asRecord(payload).candidates;
      const parts = Array.isArray(candidates) ? asRecord(asRecord(candidates[0]).content).parts : [];
      return requireText(Array.isArray(parts)
        ? parts.map((part) => String(asRecord(part).text ?? '')).join('')
        : '');
    },
  };
}

export function createProvider(config: AiProviderConfig): AiProvider {
  const definition = providerById(config.provider);
  const baseUrl = trimSlash(config.baseUrl?.trim() || definition.defaultBaseUrl);
  const model = config.model?.trim() || definition.defaultModel;
  const apiKey = config.apiKey.trim();
  if (definition.needsKey && !apiKey) throw new AiProviderError('Add an API key in AI settings first.', null, false);
  if (!baseUrl) throw new AiProviderError('Add the endpoint URL for this provider.', null, false);
  if (!model) throw new AiProviderError('Add a model id for this provider.', null, false);

  if (definition.wire === 'anthropic') return createAnthropicProvider(definition, baseUrl, model, apiKey);
  if (definition.wire === 'google') return createGoogleProvider(definition, baseUrl, model, apiKey);
  return createOpenAiProvider(definition, baseUrl, model, apiKey);
}
