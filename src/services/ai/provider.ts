// BYOK provider clients. Two wire formats cover the field: Anthropic's
// messages API and every OpenAI-compatible endpoint (OpenAI, OpenRouter,
// Groq, Together, Ollama, LM Studio, vLLM…). Keys never leave this module's
// request headers: nothing is logged, stored or echoed.
export type AiProviderId = 'anthropic' | 'openai';

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

export const AI_PROVIDERS: readonly { readonly id: AiProviderId; readonly label: string; readonly defaultBaseUrl: string; readonly defaultModel: string; readonly hint: string }[] = [
  {
    id: 'anthropic', label: 'Anthropic', defaultBaseUrl: 'https://api.anthropic.com', defaultModel: 'claude-sonnet-4-5',
    hint: 'Key from console.anthropic.com',
  },
  {
    id: 'openai', label: 'OpenAI-compatible', defaultBaseUrl: 'https://api.openai.com', defaultModel: 'gpt-4o-mini',
    hint: 'Any /v1/chat/completions endpoint: OpenAI, OpenRouter, Groq, Ollama…',
  },
];

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

/** Answers the question users actually have when a call fails. */
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
    throw new AiProviderError(`${message} ${firstLine(text)}`.trim(), response.status, retryable);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new AiProviderError('The provider returned a non-JSON response.', response.status, true);
  }
}

const firstLine = (text: string): string => {
  const trimmed = text.trim();
  if (!trimmed) return '';
  const parsed = /"message"\s*:\s*"([^"]+)"/.exec(trimmed);
  return parsed ? `(${parsed[1]})` : '';
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

export function createProvider(config: AiProviderConfig): AiProvider {
  const definition = AI_PROVIDERS.find(({ id }) => id === config.provider) ?? AI_PROVIDERS[1]!;
  const baseUrl = trimSlash(config.baseUrl?.trim() || definition.defaultBaseUrl);
  const model = config.model?.trim() || definition.defaultModel;
  const apiKey = config.apiKey.trim();
  if (!apiKey) throw new AiProviderError('Add an API key in AI settings first.', null, false);

  if (definition.id === 'anthropic') {
    const endpoint = `${baseUrl}/v1/messages`;
    return {
      id: 'anthropic', model, endpoint,
      async complete({ system, prompt, maxTokens = 4096, signal }) {
        const payload = await postJson(endpoint, {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        }, { model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: prompt }] }, signal);
        const blocks = asRecord(payload).content;
        const text = Array.isArray(blocks)
          ? blocks.map((block) => (asRecord(block).type === 'text' ? String(asRecord(block).text ?? '') : '')).join('')
          : '';
        if (!text.trim()) throw new AiProviderError('The provider returned no text.', null, true);
        return text;
      },
    };
  }

  const endpoint = `${baseUrl}/v1/chat/completions`;
  return {
    id: 'openai', model, endpoint,
    async complete({ system, prompt, maxTokens = 4096, signal }) {
      const payload = await postJson(endpoint, { authorization: `Bearer ${apiKey}` }, {
        model, max_tokens: maxTokens,
        messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
      }, signal);
      const choices = asRecord(payload).choices;
      const text = Array.isArray(choices) ? String(asRecord(asRecord(choices[0]).message).content ?? '') : '';
      if (!text.trim()) throw new AiProviderError('The provider returned no text.', null, true);
      return text;
    },
  };
}
