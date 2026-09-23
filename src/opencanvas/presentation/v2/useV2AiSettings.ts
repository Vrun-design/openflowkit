// AI settings: the picked provider, and a key, base URL and model per provider.
// Local only — written to localStorage on this machine, and a key is sent only
// to the provider it was entered for: switching providers never carries it over.
import { useCallback, useState } from 'react';
import { AI_PROVIDERS, isConfigured, providerById, type AiProviderId } from '../../../services/ai/providers';

export interface V2AiConnection {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly model: string;
}

export interface V2AiSettings {
  readonly provider: AiProviderId;
  readonly connections: Readonly<Partial<Record<AiProviderId, V2AiConnection>>>;
}

const KEY = 'openflowkit-v2-ai';
const EMPTY: V2AiConnection = { apiKey: '', baseUrl: '', model: '' };
const DEFAULTS: V2AiSettings = { provider: 'claude', connections: {} };

/** The picked provider's key, base URL and model (empty strings when unset). */
export function activeConnection(settings: V2AiSettings): V2AiConnection {
  return settings.connections[settings.provider] ?? EMPTY;
}

/** Settings with the picked provider's connection patched. */
export function withConnection(settings: V2AiSettings, patch: Partial<V2AiConnection>): V2AiSettings {
  return {
    ...settings,
    connections: { ...settings.connections, [settings.provider]: { ...activeConnection(settings), ...patch } },
  };
}

/** Every provider's key removed; endpoints and models stay. */
export function withoutKeys(settings: V2AiSettings): V2AiSettings {
  const connections: Partial<Record<AiProviderId, V2AiConnection>> = {};
  for (const [id, connection] of Object.entries(settings.connections) as [AiProviderId, V2AiConnection][]) {
    connections[id] = { ...connection, apiKey: '' };
  }
  return { ...settings, connections };
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

function connectionFrom(value: unknown): V2AiConnection {
  const record = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  return { apiKey: text(record.apiKey), baseUrl: text(record.baseUrl), model: text(record.model) };
}

/** Reads the stored settings; the pre-2026-09-23 single-key shape becomes the picked provider's connection. */
export function parseAiSettings(raw: string | null): V2AiSettings {
  try {
    const value = JSON.parse(raw ?? 'null') as Record<string, unknown> | null;
    if (!value) return DEFAULTS;
    const provider = AI_PROVIDERS.some(({ id }) => id === value.provider) ? value.provider as AiProviderId : DEFAULTS.provider;
    if (!value.connections || typeof value.connections !== 'object') {
      const legacy = connectionFrom(value);
      return { provider, connections: legacy.apiKey || legacy.baseUrl || legacy.model ? { [provider]: legacy } : {} };
    }
    const connections: Partial<Record<AiProviderId, V2AiConnection>> = {};
    for (const { id } of AI_PROVIDERS) {
      const stored = (value.connections as Record<string, unknown>)[id];
      if (stored) connections[id] = connectionFrom(stored);
    }
    return { provider, connections };
  } catch {
    return DEFAULTS;
  }
}

export function useV2AiSettings() {
  const [settings, setSettings] = useState(() => {
    try { return parseAiSettings(localStorage.getItem(KEY)); } catch { return DEFAULTS; }
  });
  const save = useCallback((next: V2AiSettings) => {
    setSettings(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* session-only then */ }
  }, []);
  return {
    settings,
    save,
    configured: isConfigured(providerById(settings.provider), activeConnection(settings)),
  };
}
