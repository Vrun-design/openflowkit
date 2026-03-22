import type { AIProvider, AISettings, CustomHeaderConfig } from './types';

export const AI_PROVIDERS = [
  'gemini',
  'openai',
  'claude',
  'groq',
  'nvidia',
  'cerebras',
  'mistral',
  'openrouter',
  'custom',
] as const satisfies readonly AIProvider[];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function sanitizeCustomHeaders(value: unknown): CustomHeaderConfig[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => entry as Record<string, unknown>)
    .filter((entry) => isNonEmptyString(entry.key) && isNonEmptyString(entry.value))
    .map((entry) => {
      const key = String(entry.key).trim();
      const headerValue = String(entry.value).trim();

      return {
        key,
        value: headerValue,
        enabled: typeof entry.enabled === 'boolean' ? entry.enabled : undefined,
      };
    });
}

export function isAIProvider(value: unknown): value is AIProvider {
  return typeof value === 'string' && AI_PROVIDERS.includes(value as AIProvider);
}

export function sanitizeAISettings(
  input: Partial<AISettings> | undefined,
  fallback: AISettings
): AISettings {
  return {
    provider: isAIProvider(input?.provider) ? input.provider : fallback.provider,
    apiKey: isNonEmptyString(input?.apiKey) ? input.apiKey.trim() : undefined,
    model: isNonEmptyString(input?.model) ? input.model.trim() : undefined,
    customBaseUrl: isNonEmptyString(input?.customBaseUrl) ? input.customBaseUrl.trim() : undefined,
    customHeaders: sanitizeCustomHeaders(input?.customHeaders),
  };
}
