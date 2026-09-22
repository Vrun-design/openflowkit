// BYOK provider dialog: provider, key, and (folded away) endpoint + model.
// Edits a local draft and writes once on Save, so a half-typed key never
// persists. The key stays in localStorage and is sent only to that provider.
import { useEffect, useRef, useState } from 'react';
import { IconChevronDown } from '@tabler/icons-react';
import { AI_PROVIDERS, type AiProviderId } from '../../../services/ai/provider';
import { Button, Dialog, Field, Icon, Segmented } from '../design-system';
import type { V2AiSettings } from './useV2AiSettings';

export interface V2AiProviderDialogProps {
  readonly open: boolean;
  readonly settings: V2AiSettings;
  readonly onSave: (settings: V2AiSettings) => void;
  readonly onClose: () => void;
}

export function V2AiProviderDialog({ open, settings, onSave, onClose }: V2AiProviderDialogProps) {
  // Remount per open (see the panel) so the draft always starts from saved settings.
  const [draft, setDraft] = useState(settings);
  const keyInput = useRef<HTMLInputElement>(null);
  // showModal() moves focus to the first control (the close button); the key is what people came for.
  useEffect(() => { if (open) keyInput.current?.focus(); }, [open]);
  const definition = AI_PROVIDERS.find(({ id }) => id === draft.provider)!;
  const key = draft.apiKey.trim();
  const patch = (next: Partial<V2AiSettings>) => setDraft((current) => ({ ...current, ...next }));
  const save = () => { onSave({ ...draft, apiKey: key, baseUrl: draft.baseUrl.trim(), model: draft.model.trim() }); onClose(); };

  return (
    <Dialog open={open} onClose={onClose} title="AI provider" closeLabel="Close AI provider"
      description="Bring your own key. It stays on this machine and is sent only to the provider you pick."
      actions={<>
        {settings.apiKey ? <Button variant="quiet" className="ofk-v2-provider-forget"
          onClick={() => { onSave({ ...settings, apiKey: '' }); onClose(); }}>Forget key</Button> : null}
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!key} onClick={save}>{settings.apiKey ? 'Save' : 'Connect'}</Button>
      </>}>
      <form className="ofk-v2-provider-form" onSubmit={(event) => { event.preventDefault(); if (key) save(); }}>
        <Segmented<AiProviderId> label="Provider" value={draft.provider}
          onChange={(provider) => patch({ provider })}
          options={AI_PROVIDERS.map(({ id, label }) => ({ value: id, label }))} />
        <Field label="API key" hint={definition.hint} type="password" autoComplete="off" spellCheck={false}
          ref={keyInput} value={draft.apiKey} placeholder="sk-…" onChange={(event) => patch({ apiKey: event.target.value })} />
        <details className="ofk-connection-details" open={Boolean(draft.baseUrl || draft.model) || undefined}>
          <summary>Endpoint and model<Icon icon={IconChevronDown} /></summary>
          <div className="ofk-v2-provider-advanced">
            <Field label="Base URL" hint={`Default: ${definition.defaultBaseUrl}`} spellCheck={false}
              value={draft.baseUrl} placeholder={definition.defaultBaseUrl}
              onChange={(event) => patch({ baseUrl: event.target.value })} />
            <Field label="Model" hint={`Default: ${definition.defaultModel}`} spellCheck={false}
              value={draft.model} placeholder={definition.defaultModel}
              onChange={(event) => patch({ model: event.target.value })} />
          </div>
        </details>
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </Dialog>
  );
}
