// AI settings: the picked provider, and a key, base URL and model per provider.
// Local only — written to localStorage on this machine, and a key is sent only
// to the provider it was entered for: switching providers never carries it over.
import { useCallback, useEffect, useState } from 'react';
import { getIndexedDbFactory } from '../../../services/storage/indexedDbHelpers';
import { readV1AiSettings, type V1AiSettingsRaw } from '../../../services/storage/v2/v1Import';
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

// v1 masked its key with the page origin and user agent (main `aiSettingsPersistence.ts`);
// the same browser on the same origin unmasks it. A user agent that changed since gives noise.
// ponytail: a lucky noise key that looks valid fails at the provider with the usual diagnosis.
function unmaskV1Key(payload: string | null, seed: string): string | null {
  const [version, encoded] = (payload ?? '').split(':', 2);
  if (version !== 'v1' || !encoded) return null;
  try {
    const masked = decodeURIComponent(escape(atob(encoded)));
    const key = Array.from(masked, (char, index) => String.fromCharCode(char.charCodeAt(0) ^ seed.charCodeAt(index % seed.length))).join('');
    // Provider keys are [A-Za-z0-9._-]; noise from the wrong seed almost never is.
    return /^[\w.-]{8,}$/.test(key) ? key : null;
  } catch {
    return null;
  }
}

/**
 * v1's BYOK into v2, only where v2 has no key for that provider yet (12.7). `fresh` = v2 never
 * saved AI settings, so v1's provider becomes the picked one too.
 */
export function carryOverV1Ai(settings: V2AiSettings, fresh: boolean, v1: V1AiSettingsRaw, seed: string): V2AiSettings {
  let stored: Record<string, unknown>;
  try { stored = JSON.parse(v1.settings ?? 'null') ?? {}; } catch { return settings; }
  const provider = AI_PROVIDERS.find(({ id }) => id === stored.provider)?.id;
  // v1's local-first runtime kept the whole settings object, key included, in IndexedDB and
  // cleared the masked copy; the masked localStorage key is what older or fallback builds left.
  const apiKey = stored.storageMode === 'session' ? null : text(stored.apiKey).trim() || unmaskV1Key(v1.secret, seed);
  if (!provider || !apiKey || settings.connections[provider]?.apiKey) return settings;
  const current = settings.connections[provider] ?? EMPTY;
  return {
    provider: fresh ? provider : settings.provider,
    connections: {
      ...settings.connections,
      [provider]: { apiKey, baseUrl: current.baseUrl || text(stored.customBaseUrl), model: current.model || text(stored.model) },
    },
  };
}

const V1_CARRIED_KEY = 'ofk.v1AiCarried';

export function useV2AiSettings() {
  const [settings, setSettings] = useState(() => {
    try { return parseAiSettings(localStorage.getItem(KEY)); } catch { return DEFAULTS; }
  });
  const save = useCallback((next: V2AiSettings) => {
    setSettings(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* session-only then */ }
  }, []);
  // Once per browser, so a key removed in v2 never comes back from v1.
  useEffect(() => {
    const factory = getIndexedDbFactory();
    try { if (!factory || localStorage.getItem(V1_CARRIED_KEY)) return; } catch { return; }
    let live = true;
    readV1AiSettings(factory, localStorage).then((v1) => {
      if (!live) return;
      localStorage.setItem(V1_CARRIED_KEY, new Date().toISOString());
      const raw = localStorage.getItem(KEY);
      const current = parseAiSettings(raw);
      const carried = carryOverV1Ai(current, raw === null, v1, `${window.location.origin}:${navigator.userAgent}:openflowkit-ai-settings-secret`);
      if (carried !== current) save(carried);
    }).catch(() => undefined); // storage full or blocked: v1's key simply stays behind
    return () => { live = false; };
  }, [save]);
  return {
    settings,
    save,
    configured: isConfigured(providerById(settings.provider), activeConnection(settings)),
  };
}
