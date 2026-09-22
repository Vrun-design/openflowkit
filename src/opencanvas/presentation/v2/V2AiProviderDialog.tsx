// BYOK provider dialog: the ten marks, a key field that takes the provider's
// own shape, a risk badge, a console link, a base-URL/model override folded
// away, and a Test key button that runs one minimal completion and reports the
// diagnosis verbatim. Edits a local draft and writes once on Save, so a
// half-typed key never persists. The key stays in localStorage and is sent only
// to the provider the user picked.
import { useEffect, useRef, useState } from 'react';
import { IconChevronDown, IconExternalLink } from '@tabler/icons-react';
import { AiProviderError, createProvider } from '../../../services/ai/provider';
import {
  AI_PROVIDERS, RISK_DETAILS, RISK_LABELS, isConfigured, providerById,
} from '../../../services/ai/providers';
import { Button, Dialog, Field, Icon } from '../design-system';
import type { V2AiSettings } from './useV2AiSettings';

export interface V2AiProviderDialogProps {
  readonly open: boolean;
  readonly settings: V2AiSettings;
  readonly onSave: (settings: V2AiSettings) => void;
  readonly onClose: () => void;
}

const TEST_TIMEOUT_MS = 30_000;

interface TestResult {
  readonly state: 'idle' | 'testing' | 'ok' | 'fail';
  readonly message: string;
  readonly cause?: string;
}

const IDLE: TestResult = { state: 'idle', message: '' };

export function V2AiProviderDialog({ open, settings, onSave, onClose }: V2AiProviderDialogProps) {
  // Remount per open (see the panel) so the draft always starts from saved settings.
  const [draft, setDraft] = useState(settings);
  const [test, setTest] = useState<TestResult>(IDLE);
  const keyInput = useRef<HTMLInputElement>(null);
  const testAbort = useRef<AbortController | null>(null);
  // showModal() moves focus to the first control (the close button); the key is what people came for.
  useEffect(() => { if (open) keyInput.current?.focus(); }, [open]);
  useEffect(() => () => testAbort.current?.abort(), []);
  const definition = providerById(draft.provider);
  const key = draft.apiKey.trim();
  const ready = isConfigured(definition, draft);
  const patch = (next: Partial<V2AiSettings>) => { setTest(IDLE); setDraft((current) => ({ ...current, ...next })); };
  const save = () => { onSave({ ...draft, apiKey: key, baseUrl: draft.baseUrl.trim(), model: draft.model.trim() }); onClose(); };

  const testKey = async () => {
    if (!ready) return;
    setTest({ state: 'testing', message: `Asking ${definition.label}…` });
    const controller = new AbortController();
    testAbort.current = controller;
    const timer = setTimeout(() => controller.abort(new DOMException('No answer in time.', 'TimeoutError')), TEST_TIMEOUT_MS);
    try {
      const provider = createProvider({
        provider: draft.provider, apiKey: key,
        ...(draft.baseUrl.trim() ? { baseUrl: draft.baseUrl } : {}),
        ...(draft.model.trim() ? { model: draft.model } : {}),
      });
      await provider.complete({
        system: 'You are a connection test.', prompt: 'Reply with the single word OK.',
        maxTokens: 16, signal: controller.signal,
      });
      setTest({ state: 'ok', message: `Connected — ${provider.model} answered.` });
    } catch (caught) {
      const cause = caught instanceof AiProviderError ? caught.cause : undefined;
      setTest({
        state: 'fail',
        message: caught instanceof Error ? caught.message : String(caught),
        ...(cause ? { cause } : {}),
      });
    } finally {
      clearTimeout(timer);
      if (testAbort.current === controller) testAbort.current = null;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="AI provider" closeLabel="Close AI provider"
      description="Bring your own key. It stays on this machine and is sent only to the provider you pick."
      actions={<>
        <Button variant="quiet" className="ofk-v2-provider-clear" disabled={!settings.apiKey && !key}
          onClick={() => {
            onSave({ ...settings, apiKey: '' });
            setDraft((current) => ({ ...current, apiKey: '' }));
            setTest(IDLE);
          }}>Clear all keys</Button>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!ready} onClick={save}>{settings.apiKey ? 'Save' : 'Connect'}</Button>
      </>}>
      <form className="ofk-v2-provider-form" onSubmit={(event) => { event.preventDefault(); if (ready) save(); }}>
        <div className="ofk-v2-provider-grid" role="group" aria-label="Provider">
          {AI_PROVIDERS.map((provider) => (
            <button key={provider.id} type="button" className="ofk-v2-provider-tile"
              aria-pressed={draft.provider === provider.id} aria-label={`Use ${provider.label}`}
              onClick={() => patch({ provider: provider.id, baseUrl: '', model: '' })}>
              <img src={provider.logoPath} alt="" />
              <span>{provider.label}</span>
            </button>
          ))}
        </div>
        <div className="ofk-v2-provider-current">
          <img src={definition.logoPath} alt="" />
          <div>
            <p className="ofk-v2-provider-current-name">
              <strong>{definition.label}</strong>
              <span className="ofk-v2-risk-badge" data-risk={definition.risk} title={RISK_DETAILS[definition.risk]}>
                {RISK_LABELS[definition.risk]}
              </span>
            </p>
            <p className="ofk-v2-provider-hint">
              {definition.hint}
              {definition.consoleUrl ? <>
                {' '}<a href={definition.consoleUrl} target="_blank" rel="noreferrer">
                  {definition.consoleName}<Icon icon={IconExternalLink} />
                </a>
              </> : null}
            </p>
          </div>
        </div>
        <Field label="API key" hint="Stored only in this browser." type="password" autoComplete="off" spellCheck={false}
          ref={keyInput} value={draft.apiKey} placeholder={definition.keyPlaceholder}
          onChange={(event) => patch({ apiKey: event.target.value })} />
        <div className="ofk-v2-provider-test">
          <Button variant="secondary" busy={test.state === 'testing'} disabled={!ready}
            onClick={() => { void testKey(); }}>Test key</Button>
          <p role="status" aria-live="polite" data-state={test.state} {...(test.cause ? { 'data-cause': test.cause } : {})}>
            {test.message}
          </p>
        </div>
        <details className="ofk-connection-details" open={Boolean(draft.baseUrl || draft.model) || undefined}>
          <summary>Endpoint and model<Icon icon={IconChevronDown} /></summary>
          <div className="ofk-v2-provider-advanced">
            <Field label="Base URL" hint={definition.defaultBaseUrl ? `Default: ${definition.defaultBaseUrl}` : 'Required for a custom endpoint.'} spellCheck={false}
              value={draft.baseUrl} placeholder={definition.defaultBaseUrl || 'https://your-endpoint.example/v1'}
              onChange={(event) => patch({ baseUrl: event.target.value })} />
            <Field label="Model" hint={definition.defaultModel ? `Default: ${definition.defaultModel}` : 'Required for a custom endpoint.'} spellCheck={false}
              value={draft.model} placeholder={definition.defaultModel || 'your-model-id'}
              onChange={(event) => patch({ model: event.target.value })} />
          </div>
        </details>
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </Dialog>
  );
}
