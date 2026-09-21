// Agent panel for the v2 editor: intent picker, proposal review and status.
// Composes design-system parts over useV2Proposal; owns no document state
// and never touches the session directly.
import { useState } from 'react';
import { IconArrowUp, IconSparkles } from '@tabler/icons-react';
import { LOCAL_AGENT_INTENTS } from '../../application/ai/localAgent';
import {
  AgentPanel, Button, Icon, IconButton, ProposalBar, ProposalReview, ProvenanceBadge,
  type AgentMessage, type ProposalView,
} from '../design-system';
import type { useV2Proposal } from './useV2Proposal';

interface V2AgentPanelProps {
  readonly proposal: ReturnType<typeof useV2Proposal>;
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

export function V2AgentPanel({ proposal, currentRevision, readOnly, onUndo, onClose }: V2AgentPanelProps) {
  const [draft, setDraft] = useState('');
  const { phase, proposal: current } = proposal;
  const intentLabel = LOCAL_AGENT_INTENTS.find(({ id }) => id === proposal.intent)?.label ?? 'Proposal';
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

  // ponytail: one exchange, no thread history; V2-11 conversation keeps a list.
  const messages: readonly AgentMessage[] = phase === 'idle' ? [] : [
    { id: 'user', role: 'user', text: intentLabel },
    {
      id: 'agent', role: 'agent',
      text: phase === 'working' ? 'Working on it…' : phase === 'failed' ? 'Could not build a proposal.' : 'Proposed changes',
      attachment: <>{current ? <ProvenanceBadge standalone /> : null}{attachment}</>,
    },
  ];

  return (
    <AgentPanel
      title="AI assistant"
      tools={<span className="ofk-v2-preview-label">Preview</span>}
      onClose={onClose}
      messages={messages}
      empty={<div className="ofk-v2-assistant-welcome">
        <div className="ofk-v2-assistant-mark"><Icon icon={IconSparkles} /></div>
        <h3>From a thought<br />to a clear picture.</h3>
        <p>Explore an idea, map a system, or find the next connection.</p>
        <span className="ofk-v2-eyebrow">TRY A STARTING POINT</span>
        {['Map a user onboarding flow', 'Sketch a three-tier architecture', 'Plan a product launch'].map((prompt) =>
          <Button key={prompt} variant="quiet" onClick={() => setDraft(prompt)}>{prompt}</Button>)}
      </div>}

      composer={
        <div className="ofk-v2-assistant-composer">
          <details className="ofk-v2-local-actions"><summary>Canvas quick actions</summary>
            <div className="ofk-v2-intents" role="group" aria-label="Request a proposal">
              {LOCAL_AGENT_INTENTS.map(({ id, label }) => <Button key={id} variant="quiet" disabled={phase === 'working' || readOnly}
                onClick={() => { void proposal.request(id); }}>{label}</Button>)}
            </div>
          </details>
          <p className="ofk-v2-muted">AI generation is coming soon. Explore a prompt below.</p>
          <div className="ofk-v2-prompt-box">
            <textarea aria-label="Ask AI assistant" placeholder="What would you like to create?" value={draft} onChange={(event) => setDraft(event.target.value)} rows={3} />
            <div><span>Current canvas</span><IconButton label="Send prompt (coming soon)" disabled icon={<Icon icon={IconArrowUp} />} /></div>
          </div>
        </div>
      }
    />
  );
}
