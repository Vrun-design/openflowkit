// Proposal lifecycle for the v2 editor: request → ready → apply/stale/failed.
// Holds the proposal, decisions and applied ids; commits only through the
// session with the base revision. Owns no rendering and no provider.
import { useCallback, useMemo, useRef, useState } from 'react';
import { LOCAL_AGENT_SOURCE, proposeFromIntent, type LocalAgentIntent } from '../../application/ai/localAgent';
import {
  applyCommand, createProposal, decideChange, StaleProposalError, summarizeChanges,
  type Proposal, type ProposalChangeSummary,
} from '../../application/ai/proposalSession';
import type { CanvasSelection } from '../../application/selection/selection';
import { StaleSessionRevisionError } from '../../application/session/session';
import type { DocumentCommand } from '../../domain/commands/types';
import type { SceneDocumentV1 } from '../../domain/document/types';
import type { ChangeDecision } from '../design-system';

export type V2ProposalPhase = 'idle' | 'working' | 'ready' | 'stale' | 'applied' | 'failed';

interface V2ProposalOptions {
  readonly document: SceneDocumentV1 | null;
  readonly revision: number;
  readonly pageId: string | null;
  readonly selectionRef: { readonly current: CanvasSelection };
  readonly commit: (command: DocumentCommand, expectedRevision?: number) => void;
  readonly readOnly: boolean;
  readonly announce: (message: string) => void;
  readonly mintId: (prefix: string) => string;
}

export function useV2Proposal(options: V2ProposalOptions) {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [phase, setPhase] = useState<V2ProposalPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [intent, setIntent] = useState<LocalAgentIntent | null>(null);
  const [highlightedChangeId, setHighlightedChangeId] = useState<string | null>(null);
  const [appliedSummary, setAppliedSummary] = useState('');
  const appliedIds = useRef(new Set<string>());
  const baseDocument = useRef<SceneDocumentV1 | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const stale = phase === 'ready' && proposal !== null && proposal.baseRevision !== options.revision;

  const request = useCallback(async (intent: LocalAgentIntent) => {
    const { document, revision, pageId, selectionRef, mintId } = optionsRef.current;
    if (!document || !pageId) return;
    setPhase('working');
    setIntent(intent);
    setError(null);
    setHighlightedChangeId(null);
    try {
      // ponytail: synchronous local agent behind an async shape; V2-11 awaits
      // a provider here without changing the panel.
      const changes = await Promise.resolve(proposeFromIntent(document, pageId, intent, {
        selection: selectionRef.current, mintId,
      }));
      const next = createProposal({
        document, revision, source: LOCAL_AGENT_SOURCE, intent, changes,
        scope: {
          kind: selectionRef.current.nodeIds.length > 0 ? 'selection' : 'page',
          pageId, objectIds: selectionRef.current.nodeIds,
        },
      });
      if (next.error) throw new Error(next.error.message);
      baseDocument.current = document;
      setProposal(next);
      setPhase('ready');
    } catch (caught) {
      setProposal(null);
      setError(caught instanceof Error ? caught.message : String(caught));
      setPhase('failed');
    }
  }, []);

  const decide = useCallback((changeId: string, decision: ChangeDecision) => {
    setProposal((current) => {
      if (!current || !baseDocument.current) return current;
      // The review toggles back to 'pending'; the preview and the batch both
      // treat undecided as accepted, so record it that way.
      return decideChange(current, changeId, decision === 'rejected' ? 'rejected' : 'accepted', baseDocument.current);
    });
  }, []);

  const apply = useCallback(async () => {
    const { document, revision, commit, readOnly, announce } = optionsRef.current;
    if (!proposal || !document || readOnly || appliedIds.current.has(proposal.id)) return;
    try {
      const command = applyCommand(proposal, revision, document);
      if (!command) { setPhase('idle'); setProposal(null); return; }
      commit(command, proposal.baseRevision);
      appliedIds.current.add(proposal.id);
      const count = command.commands.length;
      const summary = `Agent proposal applied: ${count} ${count === 1 ? 'change' : 'changes'}.`;
      setAppliedSummary(summary);
      announce(`${summary} Press ⌘Z to undo.`);
      setPhase('applied');
      setHighlightedChangeId(null);
    } catch (caught) {
      if (caught instanceof StaleProposalError || caught instanceof StaleSessionRevisionError) {
        setPhase('stale');
        setHighlightedChangeId(null);
        return;
      }
      setError(caught instanceof Error ? caught.message : String(caught));
      setPhase('failed');
    }
  }, [proposal]);

  const discard = useCallback(() => {
    setProposal(null);
    setPhase('idle');
    setIntent(null);
    setError(null);
    setHighlightedChangeId(null);
  }, []);

  const changes = useMemo<readonly ProposalChangeSummary[]>(
    () => (proposal ? summarizeChanges(proposal.changes, proposal.preview.pages.find((page) => page.id === proposal.scope.pageId)) : []),
    [proposal]);
  const decisions = useMemo<Readonly<Record<string, ChangeDecision>>>(
    () => Object.fromEntries((proposal?.changes ?? []).map(({ id, status }) => [id, status])), [proposal]);

  return {
    proposal, phase, intent, stale, error, changes, decisions, appliedSummary,
    canApply: phase === 'ready' && !stale && !options.readOnly,
    highlightedChangeId, highlight: setHighlightedChangeId,
    request, decide, apply, discard,
  };
}
