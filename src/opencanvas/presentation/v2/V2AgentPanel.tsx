// Agent panel for the v2 editor: intent picker, proposal review and status.
// Composes design-system parts over useV2Proposal; owns no document state
// and never touches the session directly.
import { IconSparkles } from '@tabler/icons-react';
import { LOCAL_AGENT_INTENTS } from '../../application/ai/localAgent';
import {
  AgentPanel, Button, EmptyState, Icon, ProposalBar, ProposalReview, ProvenanceBadge,
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
      title="Agent"
      onClose={onClose}
      messages={messages}
      empty={<EmptyState icon={<Icon icon={IconSparkles} />} title="Ask for a change"
        description="Changes arrive as a reviewable proposal, never as silent edits. Undo works the same as your own edits." />}
      composer={
        <div className="ofk-v2-intents" role="group" aria-label="Request a proposal">
          {LOCAL_AGENT_INTENTS.map(({ id, label }) => (
            <Button key={id} variant="quiet" disabled={phase === 'working'}
              onClick={() => { void proposal.request(id); }}>
              {label}
            </Button>
          ))}
        </div>
      }
    />
  );
}
