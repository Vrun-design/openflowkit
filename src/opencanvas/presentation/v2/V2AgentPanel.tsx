// Agent panel for the v2 editor: prompt composer (BYOK), intent picker,
// proposal review and status. Composes design-system parts over useV2Proposal
// and useV2AiRequest; owns no document state and never touches the session.
import { useState } from 'react';
import { IconArrowUp, IconSparkles } from '@tabler/icons-react';
import {
  AgentPanel, Button, Icon, IconButton, ProposalBar, ProposalReview, ProvenanceBadge,
  type AgentMessage, type ProposalView,
} from '../design-system';
import { V2AiProviderForm } from './V2AiProviderForm';
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

const STARTERS = ['Map a user onboarding flow', 'Sketch a three-tier architecture', 'Plan a product launch'];

export function V2AgentPanel({ proposal, ai, aiSettings, currentRevision, readOnly, onUndo, onClose }: V2AgentPanelProps) {
  const [draft, setDraft] = useState('');
  const { phase, proposal: current } = proposal;
  const intentLabel = typeof proposal.intent === 'string'
    ? proposal.intent
    : 'Proposal';
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
  } else if (phase !== 'idle') {
    const view: ProposalView = phase === 'working'
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
  const messages: readonly AgentMessage[] = phase === 'idle' && !ai.error ? [] : [
    { id: 'user', role: 'user', text: intentLabel },
    {
      id: 'agent', role: 'agent',
      text: ai.error ?? (phase === 'working' ? 'Working on it…'
        : phase === 'failed' ? 'Could not build a proposal.' : 'Proposed changes'),
      attachment: <>{current ? <ProvenanceBadge standalone /> : null}{attachment}</>,
    },
  ];

  const send = (): void => {
    const prompt = draft.trim();
    if (!prompt || ai.busy) return;
    setDraft('');
    void ai.ask(prompt);
  };

  return (
    <AgentPanel
      title="AI assistant"
      tools={<span className="ofk-v2-preview-label">Preview</span>}
      onClose={onClose}
      messages={messages}
      empty={<div className="ofk-v2-assistant-welcome">
        <div className="ofk-v2-assistant-mark"><Icon icon={IconSparkles} /></div>
        <h3>From a thought<br />to a clear picture.</h3>
        <p>{aiSettings.configured
          ? 'Describe the diagram; it arrives as a proposal you can review before it lands.'
          : 'Bring your own key (Anthropic or any OpenAI-compatible endpoint) to generate diagrams here.'}</p>
        <span className="ofk-v2-eyebrow">TRY A STARTING POINT</span>
        {STARTERS.map((prompt) =>
          <Button key={prompt} variant="quiet" onClick={() => setDraft(prompt)}>{prompt}</Button>)}
      </div>}

      composer={
        <div className="ofk-v2-assistant-composer">
          <V2AiProviderForm settings={aiSettings.settings} configured={aiSettings.configured}
            lastModel={ai.lastModel} onChange={aiSettings.update} onClearKey={aiSettings.clearKey} />
          <div className="ofk-v2-prompt-box">
            <textarea aria-label="Ask AI assistant" rows={3}
              placeholder={aiSettings.configured ? 'What would you like to create?' : 'Add an API key above to generate diagrams'}
              value={draft} disabled={!aiSettings.configured || ai.busy}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  send();
                }
              }} />
            <div>
              <span>{ai.busy ? `Waiting for ${ai.lastModel}…` : 'Scope: this page'}</span>
              <IconButton label={ai.busy ? 'Cancel request' : 'Send prompt'}
                disabled={readOnly || !aiSettings.configured || (!ai.busy && draft.trim().length === 0)}
                icon={<Icon icon={IconArrowUp} />}
                onClick={() => { if (ai.busy) ai.cancel(); else send(); }} />
            </div>
          </div>
        </div>
      }
    />
  );
}
