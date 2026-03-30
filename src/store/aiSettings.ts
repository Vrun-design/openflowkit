import type { AIProvider, AISettings, AISettingsStorageMode, CustomHeaderConfig } from './types';

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

function isAISettingsStorageMode(value: unknown): value is AISettingsStorageMode {
  return value === 'local' || value === 'session';
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
    storageMode: isAISettingsStorageMode(input?.storageMode) ? input.storageMode : fallback.storageMode,
    apiKey: isNonEmptyString(input?.apiKey) ? input.apiKey.trim() : undefined,
    model: isNonEmptyString(input?.model) ? input.model.trim() : undefined,
    customBaseUrl: isNonEmptyString(input?.customBaseUrl) ? input.customBaseUrl.trim() : undefined,
    customHeaders: sanitizeCustomHeaders(input?.customHeaders),
    temperature: typeof input?.temperature === 'number' && input.temperature >= 0.1 && input.temperature <= 1.0
      ? Math.round(input.temperature * 10) / 10
      : undefined,
  };
}
