import { z } from 'zod';
import type { AIProvider, AISettingsStorageMode } from './types';

export const aiProviderSchema = z.enum([
  'gemini',
  'openai',
  'claude',
  'groq',
  'nvidia',
  'cerebras',
  'mistral',
  'openrouter',
  'custom',
] satisfies [AIProvider, ...AIProvider[]]);

export const aiSettingsStorageModeSchema = z.enum([
  'local',
  'session',
] satisfies [AISettingsStorageMode, ...AISettingsStorageMode[]]);

export const persistedAISettingsSchema = z
  .object({
    provider: aiProviderSchema,
    storageMode: aiSettingsStorageModeSchema,
    apiKey: z.string(),
    model: z.string(),
    customBaseUrl: z.string(),
    customHeaders: z.array(
      z.object({
        key: z.string(),
        value: z.string(),
        enabled: z.boolean().optional(),
      })
    ),
  })
  .partial();

export function parsePersistedAISettings(
  value: unknown
): Partial<Record<string, unknown>> | undefined {
  const parsed = persistedAISettingsSchema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }

  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const nextValue: Record<string, unknown> = {};
  for (const [key, schema] of Object.entries(persistedAISettingsSchema.shape)) {
    const fieldResult = schema.safeParse(
      (value as Record<string, unknown>)[key]
    );
    if (fieldResult.success) {
      nextValue[key] = fieldResult.data;
    }
  }

  return nextValue;
}

export function parsePersistedAISettingsJson(
  serialized: string | null
): Partial<Record<string, unknown>> | undefined {
  if (!serialized) {
    return undefined;
  }

  try {
    return parsePersistedAISettings(JSON.parse(serialized));
  } catch {
    return undefined;
  }
}
