// BYOK settings for the assistant: provider, key, endpoint, model. The key is
// stored locally (localStorage) and only ever sent to the chosen provider.
import { useState } from 'react';
import { AI_PROVIDERS } from '../../../services/ai/provider';
import { Button, Field, Segmented } from '../design-system';
import type { V2AiSettings } from './useV2AiSettings';

export interface V2AiProviderFormProps {
  readonly settings: V2AiSettings;
  readonly configured: boolean;
  readonly lastModel: string;
  readonly onChange: (patch: Partial<V2AiSettings>) => void;
  readonly onClearKey: () => void;
}

export function V2AiProviderForm({ settings, configured, lastModel, onChange, onClearKey }: V2AiProviderFormProps) {
  const [open, setOpen] = useState(!configured);
  const definition = AI_PROVIDERS.find(({ id }) => id === settings.provider)!;

  return (
    <div className="ofk-v2-ai-settings">
      <button type="button" className="ofk-v2-ai-settings-toggle" aria-expanded={open}
        onClick={() => setOpen((value) => !value)}>
        {configured ? `AI: ${lastModel || settings.model || definition.label}` : 'Add an AI provider (BYOK)'}
      </button>
      {open ? (
        <div className="ofk-v2-properties">
          <Segmented<'anthropic' | 'openai'> label="Provider" value={settings.provider}
            onChange={(provider) => onChange({ provider })}
            options={AI_PROVIDERS.map(({ id, label }) => ({ value: id, label }))} />
          <Field label="API key" hint={definition.hint} type="password" autoComplete="off" spellCheck={false}
            value={settings.apiKey} placeholder="sk-…"
            onChange={(event) => onChange({ apiKey: event.target.value })} />
          <Field label="Base URL" hint={`Default: ${definition.defaultBaseUrl}`} spellCheck={false}
            value={settings.baseUrl} placeholder={definition.defaultBaseUrl}
            onChange={(event) => onChange({ baseUrl: event.target.value })} />
          <Field label="Model" hint={`Default: ${definition.defaultModel}`} spellCheck={false}
            value={settings.model} placeholder={definition.defaultModel}
            onChange={(event) => onChange({ model: event.target.value })} />
          {settings.apiKey ? <Button variant="quiet" onClick={onClearKey}>Forget key</Button> : null}
          <p className="ofk-caption">The key stays on this machine and is sent only to {definition.label}.</p>
        </div>
      ) : null}
    </div>
  );
}
