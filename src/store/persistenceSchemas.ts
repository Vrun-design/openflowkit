import { z } from 'zod';
import type { ViewSettings } from './types';
import { parsePersistedAISettings, persistedAISettingsSchema } from './aiSettingsSchemas';

export const persistedLayerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  visible: z.boolean(),
  locked: z.boolean(),
});

export const persistedViewSettingsSchema = z
  .object({
    showGrid: z.boolean(),
    snapToGrid: z.boolean(),
    alignmentGuidesEnabled: z.boolean(),
    isShortcutsHelpOpen: z.boolean(),
    defaultIconsEnabled: z.boolean(),
    smartRoutingEnabled: z.boolean(),
    smartRoutingProfile: z.enum(['standard', 'infrastructure']),
    smartRoutingBundlingEnabled: z.boolean(),
    architectureStrictMode: z.boolean(),
    largeGraphSafetyMode: z.enum(['auto', 'on', 'off']),
    largeGraphSafetyProfile: z.enum(['performance', 'balanced', 'quality']),
    exportSerializationMode: z.enum(['deterministic', 'legacy']),
    language: z.string(),
    lintRules: z.string(),
  })
  .partial() satisfies z.ZodType<Partial<ViewSettings>>;

export const persistedTabBaseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  diagramType: z.string().optional(),
  updatedAt: z.string().optional(),
  nodes: z.array(z.unknown()).optional(),
  edges: z.array(z.unknown()).optional(),
  playback: z.unknown().optional(),
  history: z.unknown().optional(),
});

export const persistedFlowHydrationSchema = z.object({
  documents: z.array(z.unknown()).optional(),
  activeDocumentId: z.string().optional(),
  tabs: z.array(z.unknown()).optional(),
  activeTabId: z.string().optional(),
  layers: z.array(z.unknown()).optional(),
  activeLayerId: z.string().optional(),
  viewSettings: z.unknown().optional(),
  aiSettings: z.unknown().optional(),
});

export function parsePersistedViewSettings(
  value: unknown
): Partial<ViewSettings> {
  const parsed = persistedViewSettingsSchema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }

  if (!value || typeof value !== 'object') {
    return {};
  }

  const nextValue: Partial<ViewSettings> = {};
  for (const [key, schema] of Object.entries(persistedViewSettingsSchema.shape)) {
    const fieldResult = schema.safeParse(
      (value as Record<string, unknown>)[key]
    );
    if (fieldResult.success) {
      (nextValue as Record<string, unknown>)[key] = fieldResult.data;
    }
  }

  return nextValue;
}

export { parsePersistedAISettings, persistedAISettingsSchema };
