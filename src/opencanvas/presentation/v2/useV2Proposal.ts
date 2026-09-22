// Proposal lifecycle for the v2 editor: requestDiagram → ready → apply/stale/failed.
// Holds the proposal, decisions and applied ids; commits only through the
// session with the base revision. Owns no rendering and no provider.
import { useCallback, useMemo, useRef, useState } from 'react';
import type { CompileResult } from '../../../dsl/compile';
import { buildDslPageCommand } from '../../application/dsl/dslPageCommand';
import {
  applyCommand, createProposal, decideChange, StaleProposalError, summarizeChanges,
  type Proposal, type ProposalChangeSummary,
} from '../../application/ai/proposalSession';
import { StaleSessionRevisionError } from '../../application/session/session';
import type { DocumentCommand } from '../../domain/commands/types';
import type { SceneDocumentV1 } from '../../domain/document/types';
import type { ChangeDecision } from '../design-system';

export type V2ProposalPhase = 'idle' | 'working' | 'ready' | 'stale' | 'applied' | 'failed';

/** What a provider-backed request is: text plus the frame it replaces. */
export interface V2DiagramRequest {
  readonly dsl: string;
  readonly intent: string;
  readonly source?: string;
  readonly frameId?: string;
}

interface V2ProposalOptions {
  readonly document: SceneDocumentV1 | null;
  readonly revision: number;
  readonly pageId: string | null;
  readonly commit: (command: DocumentCommand, expectedRevision?: number) => void;
  readonly readOnly: boolean;
  readonly announce: (message: string) => void;
  /** Compiles generated DSL for the AI path (host layout port, icons). */
  readonly compileDsl?: (text: string) => Promise<CompileResult>;
}

export function useV2Proposal(options: V2ProposalOptions) {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [phase, setPhase] = useState<V2ProposalPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [intent, setIntent] = useState<string | null>(null);
  const [highlightedChangeId, setHighlightedChangeId] = useState<string | null>(null);
  const [appliedSummary, setAppliedSummary] = useState('');
  const appliedIds = useRef(new Set<string>());
  const baseDocument = useRef<SceneDocumentV1 | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const stale = phase === 'ready' && proposal !== null && proposal.baseRevision !== options.revision;

  /**
   * A provider (BYOK) or the code panel hands us DSL; compiling it produces one
   * page command, which is exactly the shape the review UI already applies.
   */
  const requestDiagram = useCallback(async (request: V2DiagramRequest) => {
    const { document, revision, pageId, compileDsl, announce } = optionsRef.current;
    if (!document || !pageId) return;
    setPhase('working');
    setIntent(request.intent);
    setError(null);
    setHighlightedChangeId(null);
    try {
      if (!compileDsl) throw new Error('This editor has no DSL compiler wired.');
      const currentPage = document.pages.find((page) => page.id === pageId);
      if (!currentPage) throw new RangeError(`Page "${pageId}" was not found.`);
      const bound = request.frameId ? currentPage.nodes.find((node) => node.id === request.frameId) : undefined;
      const compiled = await compileDsl(request.dsl);
      const command = buildDslPageCommand(currentPage, compiled, bound?.id);
      if (!command) throw new Error('The diagram already matches this code.');
      const count = compiled.nodes.length + compiled.groups.length;
      const next = createProposal({
        document, revision, source: request.source ?? 'byok', intent: request.intent,
        scope: { kind: bound ? 'selection' : 'page', pageId, objectIds: bound ? [bound.id] : [] },
        changes: [{
          id: `diagram:${bound?.id ?? compiled.frame.id}`,
          explanation: `${compiled.meta.family} diagram · ${count} ${count === 1 ? 'shape' : 'shapes'}`,
          command,
        }],
      });
      if (next.error) throw new Error(next.error.message);
      baseDocument.current = document;
      setProposal(next);
      setPhase('ready');
      announce('Proposal ready. Review it, then apply.');
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
    requestDiagram, decide, apply, discard,
  };
}
