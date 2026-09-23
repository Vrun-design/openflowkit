// Proposal lifecycle for the v2 editor: propose → ready → apply/stale/failed.
// Holds the proposal, decisions and applied ids; commits only through the
// session with the base revision. Owns no rendering and no provider.
import { useCallback, useMemo, useRef, useState } from 'react';
import type { CompileResult } from '../../../dsl/compile';
import { chainAssistantChanges, type AssistantDraft } from '../../application/ai/assistantChanges';
import {
  applyCommand, createProposal, decideChange, StaleProposalError, summarizeChanges,
  type Proposal, type ProposalChangeSummary,
} from '../../application/ai/proposalSession';
import { StaleSessionRevisionError } from '../../application/session/session';
import type { DocumentCommand } from '../../domain/commands/types';
import type { SceneDocumentV1 } from '../../domain/document/types';
import type { ChangeDecision } from '../design-system';

export type V2ProposalPhase = 'idle' | 'working' | 'ready' | 'stale' | 'applied' | 'failed';

/** Diagram blocks from one reply: each replaces `frameId`, or adds a diagram when null. */
export interface V2ProposalRequest {
  readonly blocks: readonly { readonly dsl: string; readonly frameId: string | null }[];
  readonly intent: string;
  readonly source?: string;
  readonly scope?: 'selection' | 'page';
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
  const drafts = useRef<readonly AssistantDraft[]>([]);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const stale = phase === 'ready' && proposal !== null && proposal.baseRevision !== options.revision;

  /**
   * Compiles every block, then chains them into rows that compose. Resolves to
   * the proposal id, or to why nothing was proposed — compile errors name their
   * lines, so the caller can hand them back to the model.
   */
  const propose = useCallback(async (request: V2ProposalRequest): Promise<{ readonly id: string } | { readonly error: string; readonly compile: boolean }> => {
    const { document, revision, pageId, compileDsl, announce } = optionsRef.current;
    if (!document || !pageId) return { error: 'No page is open.', compile: false };
    let compileFailed = false;
    setPhase('working');
    setIntent(request.intent);
    setError(null);
    setHighlightedChangeId(null);
    try {
      if (!compileDsl) throw new Error('This editor has no DSL compiler wired.');
      const currentPage = document.pages.find((page) => page.id === pageId);
      if (!currentPage) throw new RangeError(`Page "${pageId}" was not found.`);
      const next: AssistantDraft[] = [];
      for (const [index, block] of request.blocks.entries()) {
        const compiled = await compileDsl(block.dsl);
        const errors = compiled.diagnostics.filter(({ severity }) => severity === 'error');
        if (errors.length) {
          compileFailed = true;
          throw new Error(errors.slice(0, 5).map(({ line, message }) => `Diagram ${index + 1}, line ${line}: ${message}`).join('\n'));
        }
        next.push({ id: `diagram:${index}:${block.frameId ?? compiled.frame.id}`, compiled, ...(block.frameId ? { frameId: block.frameId } : {}) });
      }
      const changes = chainAssistantChanges(currentPage, next);
      if (!changes.length) throw new Error('The diagram already matches this request.');
      const bound = next.flatMap(({ frameId }) => (frameId ? [frameId] : []));
      const proposal = createProposal({
        document, revision, source: request.source ?? 'byok', intent: request.intent,
        scope: { kind: request.scope ?? (bound.length ? 'selection' : 'page'), pageId, objectIds: bound },
        changes,
      });
      if (proposal.error) throw new Error(proposal.error.message);
      drafts.current = next;
      baseDocument.current = document;
      setProposal(proposal);
      setPhase('ready');
      announce('Proposal ready. Review it, then apply.');
      return { id: proposal.id };
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setProposal(null);
      setError(message);
      setPhase('failed');
      return { error: message, compile: compileFailed };
    }
  }, []);

  const decide = useCallback((changeId: string, decision: ChangeDecision) => {
    setProposal((current) => {
      const base = baseDocument.current;
      const page = base?.pages.find(({ id }) => id === current?.scope.pageId);
      if (!current || !base || !page) return current;
      // The review toggles back to 'pending'; the preview and the batch both
      // treat undecided as accepted, so record it that way.
      const status = decision === 'rejected' ? 'rejected' : 'accepted';
      const rejected = new Set(current.changes.filter(({ id, status: was }) => (id === changeId ? status : was) === 'rejected').map(({ id }) => id));
      // Later rows were built on earlier ones; rebuild the chain around the rejections.
      const rebuilt = chainAssistantChanges(page, drafts.current, rejected);
      const changes = current.changes.map((change) => ({ ...change, command: rebuilt.find(({ id }) => id === change.id)?.command ?? change.command }));
      return decideChange({ ...current, changes }, changeId, status, base);
    });
  }, []);

  /** Resolves true once the accepted rows are committed. */
  const apply = useCallback(async (): Promise<boolean> => {
    const { document, revision, commit, readOnly, announce } = optionsRef.current;
    if (!proposal || !document || readOnly || appliedIds.current.has(proposal.id)) return false;
    try {
      const command = applyCommand(proposal, revision, document);
      if (!command) { setPhase('idle'); setProposal(null); return false; }
      commit(command, proposal.baseRevision);
      appliedIds.current.add(proposal.id);
      const count = command.commands.length;
      const summary = `Applied ${count} ${count === 1 ? 'change' : 'changes'}.`;
      setAppliedSummary(summary);
      announce(`${summary} Press ⌘Z to undo.`);
      setPhase('applied');
      setHighlightedChangeId(null);
      return true;
    } catch (caught) {
      if (caught instanceof StaleProposalError || caught instanceof StaleSessionRevisionError) {
        setPhase('stale');
        setHighlightedChangeId(null);
        return false;
      }
      setError(caught instanceof Error ? caught.message : String(caught));
      setPhase('failed');
      return false;
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
    propose, decide, apply, discard,
  };
}
