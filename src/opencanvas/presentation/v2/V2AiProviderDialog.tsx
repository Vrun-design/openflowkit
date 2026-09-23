// BYOK provider dialog: the ten marks, a key field that takes the provider's
// own shape, a risk badge, a console link, the model with suggestions, the base
// URL folded away, and a Test key button that runs one small completion and
// reports the diagnosis verbatim. Edits a local draft and writes once on Save,
// so a half-typed key never persists. Each provider keeps its own key, so a
// key is only ever sent to the provider it was entered for.
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { IconChevronDown, IconExternalLink } from '@tabler/icons-react';
import { AiProviderError, createProvider } from '../../../services/ai/provider';
import {
  AI_PROVIDERS, RISK_DETAILS, RISK_LABELS, isConfigured, providerById, type AiProviderDefinition,
} from '../../../services/ai/providers';
import { Button, Dialog, Field, Icon } from '../design-system';
import {
  activeConnection, withConnection, withoutKeys, type V2AiConnection, type V2AiSettings,
} from './useV2AiSettings';

export interface V2AiProviderDialogProps {
  readonly open: boolean;
  readonly settings: V2AiSettings;
  readonly onSave: (settings: V2AiSettings) => void;
  readonly onClose: () => void;
}

const TEST_TIMEOUT_MS = 30_000;
// Thinking models spend part of any budget before they answer; 16 tokens came
// back empty on a valid key. This is still a fraction of a cent.
const TEST_MAX_TOKENS = 1024;

interface TestResult {
  readonly state: 'idle' | 'testing' | 'ok' | 'fail';
  readonly message: string;
  readonly cause?: string;
}

const IDLE: TestResult = { state: 'idle', message: '' };

/** A provider's mark, painted in the text colour so it reads in both themes. */
function ProviderMark({ definition }: { readonly definition: AiProviderDefinition }) {
  return <span className="ofk-v2-provider-mark" aria-hidden="true"
    style={{ '--mark': `url("${definition.logoPath}")` } as CSSProperties} />;
}

/** A sentence when the key cannot be this provider's; null when it may be. */
function keyShapeHint(definition: AiProviderDefinition, key: string): string | null {
  if (!key || !definition.keyPattern || new RegExp(definition.keyPattern).test(key)) return null;
  return `This does not look like a ${definition.label} key — they start with ${definition.keyPlaceholder.replace(/\.+$/, '')}.`;
}

export function V2AiProviderDialog({ open, settings, onSave, onClose }: V2AiProviderDialogProps) {
  // Remount per open (see the panel) so the draft always starts from saved settings.
  const [draft, setDraft] = useState(settings);
  const [test, setTest] = useState<TestResult>(IDLE);
  const keyInput = useRef<HTMLInputElement>(null);
  const testAbort = useRef<AbortController | null>(null);
  const modelListId = useId();
  // showModal() moves focus to the first control (the close button); the key is what people came for.
  useEffect(() => { if (open) keyInput.current?.focus(); }, [open]);
  useEffect(() => () => testAbort.current?.abort(), []);
  const definition = providerById(draft.provider);
  const connection = activeConnection(draft);
  const key = connection.apiKey.trim();
  const ready = isConfigured(definition, connection);
  const saved = settings.provider === draft.provider && Boolean(activeConnection(settings).apiKey);
  const patch = (next: Partial<V2AiConnection>) => { setTest(IDLE); setDraft((current) => withConnection(current, next)); };
  const pick = (provider: V2AiSettings['provider']) => {
    setTest(IDLE);
    setDraft((current) => ({ ...current, provider }));
    keyInput.current?.focus();
  };
  const save = () => {
    onSave(withConnection(draft, { apiKey: key, baseUrl: connection.baseUrl.trim(), model: connection.model.trim() }));
    onClose();
  };
  const shapeHint = keyShapeHint(definition, key);

  const testKey = async () => {
    if (!ready) return;
    setTest({ state: 'testing', message: `Asking ${definition.label}…` });
    const controller = new AbortController();
    testAbort.current = controller;
    const timer = setTimeout(() => controller.abort(new DOMException('No answer in time.', 'TimeoutError')), TEST_TIMEOUT_MS);
    try {
      const provider = createProvider({
        provider: draft.provider, apiKey: key,
        ...(connection.baseUrl.trim() ? { baseUrl: connection.baseUrl } : {}),
        ...(connection.model.trim() ? { model: connection.model } : {}),
      });
      await provider.complete({
        system: 'You are a connection test.', prompt: 'Reply with the single word OK.',
        maxTokens: TEST_MAX_TOKENS, signal: controller.signal,
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
        <Button variant="quiet" className="ofk-v2-provider-clear"
          disabled={!key && !Object.values(settings.connections).some((stored) => stored?.apiKey)}
          onClick={() => {
            onSave(withoutKeys(settings));
            setDraft((current) => withoutKeys(current));
            setTest(IDLE);
          }}>Clear all keys</Button>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!ready} onClick={save}>{saved ? 'Save' : 'Connect'}</Button>
      </>}>
      <form className="ofk-v2-provider-form" onSubmit={(event) => { event.preventDefault(); if (ready) save(); }}>
        <div className="ofk-v2-provider-grid" role="group" aria-label="Provider">
          {AI_PROVIDERS.map((provider) => (
            <button key={provider.id} type="button" className="ofk-v2-provider-tile"
              aria-pressed={draft.provider === provider.id} aria-label={`Use ${provider.label}`}
              data-has-key={settings.connections[provider.id]?.apiKey ? '' : undefined}
              title={settings.connections[provider.id]?.apiKey ? `${provider.label} — key saved` : provider.label}
              onClick={() => pick(provider.id)}>
              <ProviderMark definition={provider} />
              <span>{provider.label}</span>
            </button>
          ))}
        </div>
        <div className="ofk-v2-provider-current">
          <ProviderMark definition={definition} />
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
        <Field label={definition.needsKey ? 'API key' : 'API key (optional)'}
          hint="Stored only in this browser, and sent only to this provider."
          {...(shapeHint ? { error: shapeHint } : {})}
          type="password" autoComplete="off" spellCheck={false}
          ref={keyInput} value={connection.apiKey} placeholder={definition.keyPlaceholder}
          onChange={(event) => patch({ apiKey: event.target.value })} />
        <Field label="Model" list={modelListId} spellCheck={false} autoComplete="off"
          hint={definition.defaultModel ? `Leave empty for ${definition.defaultModel}. Any model id works.` : 'Required for a custom endpoint.'}
          value={connection.model} placeholder={definition.defaultModel || 'your-model-id'}
          onChange={(event) => patch({ model: event.target.value })} />
        <datalist id={modelListId}>
          {definition.suggestedModels.map((model) => <option key={model} value={model} />)}
        </datalist>
        <div className="ofk-v2-provider-test">
          <Button variant="secondary" busy={test.state === 'testing'} disabled={!ready}
            onClick={() => { void testKey(); }}>Test key</Button>
          <p role="status" aria-live="polite" data-state={test.state} {...(test.cause ? { 'data-cause': test.cause } : {})}>
            {test.message}
          </p>
        </div>
        <details className="ofk-connection-details" open={Boolean(connection.baseUrl) || !definition.defaultBaseUrl || undefined}>
          <summary>Endpoint<Icon icon={IconChevronDown} /></summary>
          <div className="ofk-v2-provider-advanced">
            <Field label="Base URL" hint={definition.defaultBaseUrl ? `Default: ${definition.defaultBaseUrl}` : 'Required for a custom endpoint.'} spellCheck={false}
              value={connection.baseUrl} placeholder={definition.defaultBaseUrl || 'https://your-endpoint.example/v1'}
              onChange={(event) => patch({ baseUrl: event.target.value })} />
          </div>
        </details>
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </Dialog>
  );
}
