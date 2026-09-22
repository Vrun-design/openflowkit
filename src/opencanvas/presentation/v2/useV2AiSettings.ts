// AI settings: provider, key, base URL and model. Local only — written to
// localStorage on this machine, sent only to the provider the user picked.
import { useCallback, useState } from 'react';
import { AI_PROVIDERS, isConfigured, providerById, type AiProviderId } from '../../../services/ai/providers';

export interface V2AiSettings {
  provider: AiProviderId;
  apiKey: string;
  baseUrl: string;
  model: string;
}

const KEY = 'openflowkit-v2-ai';
const DEFAULTS: V2AiSettings = { provider: 'claude', apiKey: '', baseUrl: '', model: '' };

function read(): V2AiSettings {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<V2AiSettings> | null;
    const provider = AI_PROVIDERS.some(({ id }) => id === value?.provider) ? value!.provider! : DEFAULTS.provider;
    return {
      provider,
      apiKey: typeof value?.apiKey === 'string' ? value.apiKey : '',
      baseUrl: typeof value?.baseUrl === 'string' ? value.baseUrl : '',
      model: typeof value?.model === 'string' ? value.model : '',
    };
  } catch {
    return DEFAULTS;
  }
}

export function useV2AiSettings() {
  const [settings, setSettings] = useState(read);
  const update = useCallback((patch: Partial<V2AiSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* session-only then */ }
      return next;
    });
  }, []);
  return { settings, update, configured: isConfigured(providerById(settings.provider), settings) };
}
