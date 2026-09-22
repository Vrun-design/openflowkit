// AI assistant panel for the v2 editor: hero empty state, one exchange with
// the provider, proposal review and a prompt composer. The provider itself is
// configured in V2AiProviderDialog, reached from the header badge. Composes
// design-system parts over useV2Proposal and useV2AiRequest; owns no document
// state and never touches the session.
import { useRef, useState } from 'react';
import { IconArrowUp, IconPlayerStop, IconRocket, IconRoute, IconSparkles, IconStack2 } from '@tabler/icons-react';
import { AI_PROVIDERS } from '../../../services/ai/provider';
import {
  AgentPanel, Button, Icon, IconButton, Kbd, ProposalBar, ProposalReview, ProvenanceBadge,
  type AgentMessage, type ProposalView,
} from '../design-system';
import { V2AiProviderDialog } from './V2AiProviderDialog';
import type { useV2AiRequest } from './useV2AiRequest';
import type { useV2AiSettings } from './useV2AiSettings';
import type { useV2Proposal } from './useV2Proposal';

interface V2AgentPanelProps {
  readonly proposal: ReturnType<typeof useV2Proposal>;
  readonly ai: ReturnType<typeof useV2AiRequest>;
  readonly aiSettings: ReturnType<typeof useV2AiSettings>;
  readonly currentRevision: number;
  readonly readOnly: boolean;
  readonly onUndo: () => void;
  readonly onClose: () => void;
}

const BAR_LABELS = {
  working: 'Thinking…', ready: 'Proposal ready', stale: 'Document changed. Request a fresh proposal.',
  applied: 'Applied', accept: 'Apply', discard: 'Dismiss', cancel: 'Cancel', undo: 'Undo',
  failed: 'Could not apply. Nothing changed.',
};

const STARTERS = [
  { icon: IconRoute, prompt: 'Map a user onboarding flow' },
  { icon: IconStack2, prompt: 'Sketch a three-tier architecture' },
  { icon: IconRocket, prompt: 'Plan a product launch' },
] as const;

export function V2AgentPanel({ proposal, ai, aiSettings, currentRevision, readOnly, onUndo, onClose }: V2AgentPanelProps) {
  const [draft, setDraft] = useState('');
  const [providerOpen, setProviderOpen] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const { phase, proposal: current } = proposal;
  const { configured, settings } = aiSettings;
  const modelLabel = ai.lastModel || settings.model || AI_PROVIDERS.find(({ id }) => id === settings.provider)!.defaultModel;
  const scopeLabel = current
    ? `Scope: ${current.scope.kind === 'selection' ? `${current.scope.objectIds.length} selected` : 'this page'}`
    : 'Scope: this page';

  let attachment: React.ReactNode = null;
  if ((phase === 'ready' || phase === 'stale') && current) {
    attachment = (
      <ProposalReview
        id={current.id}
        baseRevision={current.baseRevision}
        currentRevision={phase === 'stale' ? current.baseRevision + 1 : currentRevision}
        scopeLabel={readOnly ? `${scopeLabel} · read-only` : scopeLabel}
        changes={proposal.changes}
        decisions={proposal.decisions}
        onDecide={proposal.decide}
        onApply={readOnly ? async () => undefined : proposal.apply}
        onDiscard={proposal.discard}
        onHighlight={proposal.highlight}
        labels={readOnly ? { apply: 'Read-only' } : undefined}
      />
    );
  } else if (ai.error) {
    attachment = (
      <div className="ofk-v2-assistant-actions">
        <Button onClick={() => { void ai.ask(ai.lastPrompt); }}>Retry</Button>
        <Button variant="quiet" onClick={() => setProviderOpen(true)}>Check provider</Button>
      </div>
    );
  } else if (phase !== 'idle') {
    const view: ProposalView = phase === 'working' || ai.busy
      ? { phase: 'working', scopeLabel }
      : phase === 'applied'
        ? { phase: 'applied', summary: proposal.appliedSummary }
        : { phase: 'failed', message: proposal.error ?? BAR_LABELS.failed };
    attachment = (
      <ProposalBar view={view} labels={BAR_LABELS}
        onAccept={proposal.apply} onDismiss={proposal.discard} onUndo={onUndo} />
    );
  }

  // ponytail: one exchange, no thread history; a conversation keeps a list.
  const active = ai.busy || ai.error !== null || phase !== 'idle';
  const messages: readonly AgentMessage[] = !active ? [] : [
    { id: 'user', role: 'user', text: ai.lastPrompt || proposal.intent || '' },
    {
      id: 'agent', role: 'agent',
      text: ai.error ?? (ai.busy || phase === 'working' ? `Asking ${modelLabel}…`
        : phase === 'failed' ? 'Could not build a proposal.' : 'Proposed changes'),
      attachment: <>{current ? <ProvenanceBadge standalone /> : null}{attachment}</>,
    },
  ];

  const send = (): void => {
    const prompt = draft.trim();
    if (!prompt || ai.busy) return;
    if (!configured) { setProviderOpen(true); return; }
    setDraft('');
    void ai.ask(prompt);
  };
  const canSend = !readOnly && draft.trim().length > 0;
  // The dialog unmounts rather than close()s, so the platform cannot return focus; hand it to the composer.
  const closeProvider = (): void => {
    setProviderOpen(false);
    requestAnimationFrame(() => input.current?.focus());
  };

  return (
    <>
      <AgentPanel
        title="AI assistant"
        onClose={onClose}
        className="ofk-v2-assistant-panel"
        data-status={ai.busy ? 'connecting' : configured ? 'connected' : 'off'}
        tools={
          <button type="button" className="ofk-connection-badge ofk-v2-provider-badge"
            aria-label={configured ? `AI provider: ${modelLabel}. Change` : 'Connect an AI provider'}
            onClick={() => setProviderOpen(true)}>
            <span className="ofk-connection-dot" />{configured ? modelLabel : 'No provider'}
          </button>
        }
        messages={messages}
        empty={<div className="ofk-v2-assistant-welcome">
          <div className="ofk-v2-assistant-hero" aria-hidden="true">
            <span className="ofk-v2-assistant-hero-prompt">Map onboarding</span>
            <span className="ofk-connection-hero-link"><i /><i /><i /></span>
            <span className="ofk-v2-assistant-hero-diagram">
              <span className="ofk-v2-assistant-mark"><Icon icon={IconSparkles} /></span>
              <i /><i /><i />
            </span>
          </div>
          <h3>From a thought to a clear picture.</h3>
          <p className="ofk-connection-lede">
            {configured
              ? 'Describe the diagram. It arrives as a proposal you review before it lands on the page.'
              : 'Bring your own key — Anthropic or any OpenAI-compatible endpoint — and describe the diagram you need.'}
          </p>
          {!configured ? <>
            <Button variant="primary" onClick={() => setProviderOpen(true)}><Icon icon={IconSparkles} />Connect a provider</Button>
            <span className="ofk-model-welcome-note">Your key stays on this machine.</span>
          </> : null}
          <h4 className="ofk-connection-heading">Try a starting point</h4>
          <ul className="ofk-v2-assistant-starters">
            {STARTERS.map(({ icon, prompt }) =>
              <li key={prompt}><Button variant="quiet" onClick={() => { setDraft(prompt); input.current?.focus(); }}>
                <Icon icon={icon} />{prompt}
              </Button></li>)}
          </ul>
        </div>}
        composer={
          <div className="ofk-v2-prompt-box" data-busy={ai.busy || undefined}>
            <textarea ref={input} aria-label="Ask AI assistant" rows={2}
              placeholder={configured ? 'What would you like to create?' : 'Describe a diagram — you will be asked for a key'}
              value={draft} disabled={ai.busy}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  send();
                } else if (event.key === 'Escape' && ai.busy) {
                  event.stopPropagation();
                  ai.cancel();
                }
              }} />
            <div>
              <span>{ai.busy ? `Waiting for ${modelLabel}…` : readOnly ? 'Read-only document' : 'Scope: this page'}</span>
              {!ai.busy && canSend ? <span className="ofk-v2-prompt-hint"><Kbd keys="Enter" /> send</span> : null}
              {ai.busy
                ? <Button variant="secondary" onClick={ai.cancel}><Icon icon={IconPlayerStop} />Stop</Button>
                : <IconButton variant="primary" label="Send prompt" disabled={!canSend}
                  icon={<Icon icon={IconArrowUp} />} onClick={send} />}
            </div>
          </div>
        }
      />
      {providerOpen ? <V2AiProviderDialog open settings={settings}
        onSave={(next) => { aiSettings.update(next); ai.clearError(); }}
        onClose={closeProvider} /> : null}
    </>
  );
}
