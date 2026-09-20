// Revision-aware proposal lifecycle: a plain record any client (panel today,
// MCP propose-for-review later) creates, decides on, and turns into ONE batch.
// Owns no React, no provider, no storage; the session commits what it returns.
import type { BatchDocumentCommand, DocumentCommand } from '../../domain/commands/types';
import type { SceneDocumentV1, SceneNode } from '../../domain/document/types';
import {
  acceptedAiProposalCommand, buildAiSceneProposal, decideAiProposalChange,
  type AiProposedChange, type AiSceneProposal,
} from './sceneProposal';

export type ProposalScope = {
  readonly kind: 'selection' | 'page' | 'document';
  readonly pageId: string;
  readonly objectIds: readonly string[];
};

/** Review-list row; structurally what design-system ProposalReview renders. */
export interface ProposalChangeSummary {
  readonly id: string;
  readonly kind: 'addition' | 'modification' | 'removal';
  readonly label: string;
  readonly reason: string;
}

export interface Proposal extends AiSceneProposal {
  readonly source: string;
  readonly intent: string;
  readonly scope: ProposalScope;
  readonly baseRevision: number;
  readonly status: 'pending';
}

export interface CreateProposalInput {
  readonly document: SceneDocumentV1;
  readonly revision: number;
  readonly source: string;
  readonly intent: string;
  readonly scope: ProposalScope;
  readonly changes: readonly Omit<AiProposedChange, 'status'>[];
  readonly id?: string;
}

export class StaleProposalError extends Error {
  readonly baseRevision: number;
  readonly currentRevision: number;

  constructor(baseRevision: number, currentRevision: number) {
    super(`Proposal built on revision ${baseRevision}; document is at ${currentRevision}.`);
    this.name = 'StaleProposalError';
    this.baseRevision = baseRevision;
    this.currentRevision = currentRevision;
  }
}

let proposalCounter = 0;

export function createProposal(input: CreateProposalInput): Proposal {
  proposalCounter += 1;
  const id = input.id ?? `proposal-${input.source}-${input.revision}-${proposalCounter}`;
  const base = buildAiSceneProposal(input.document, id, input.changes);
  return {
    ...base,
    // Agent output is opt-out, like a diff review.
    changes: base.changes.map((change) => ({ ...change, status: 'accepted' })),
    source: input.source, intent: input.intent, scope: input.scope,
    baseRevision: input.revision, status: 'pending',
  };
}

export function decideChange(
  proposal: Proposal, changeId: string, decision: 'accepted' | 'rejected', baseDocument: SceneDocumentV1
): Proposal {
  return { ...proposal, ...decideAiProposalChange(proposal, changeId, decision, baseDocument) };
}

/** One flat batch of the non-rejected changes, or null when nothing survives.
 * Throws StaleProposalError before touching the document precondition. */
export function applyCommand(
  proposal: Proposal, currentRevision: number, currentDocument: SceneDocumentV1
): BatchDocumentCommand | null {
  if (currentRevision !== proposal.baseRevision) {
    throw new StaleProposalError(proposal.baseRevision, currentRevision);
  }
  const batch = acceptedAiProposalCommand(proposal, currentDocument);
  if (!batch || batch.kind !== 'batch') return null;
  // Actions may hand back their own batch (connect adds ports, delete drops
  // connectors); the executor forbids nesting, so unwrap one level.
  const commands = batch.commands.flatMap((command) =>
    command.kind === 'batch' ? command.commands : [command]);
  const count = batch.commands.length;
  return {
    kind: 'batch', id: batch.id,
    label: `Apply agent proposal (${count} ${count === 1 ? 'change' : 'changes'})`,
    commands,
    attribution: { kind: 'agent', source: proposal.source, proposalId: proposal.id },
  };
}

function leaf(command: DocumentCommand): DocumentCommand {
  return command.kind === 'batch' ? command.commands[command.commands.length - 1] ?? command : command;
}

function nodeLabel(node: SceneNode): string {
  return typeof node.content.label === 'string' && node.content.label ? node.content.label : node.id;
}

function changeLabel(command: DocumentCommand): string {
  switch (command.kind) {
    case 'insert-node': case 'remove-node': return nodeLabel(command.node);
    case 'set-node': return nodeLabel(command.after);
    case 'insert-connector': case 'remove-connector':
      return `${command.connector.source.nodeId ?? '·'} → ${command.connector.target.nodeId ?? '·'}`;
    case 'set-connector':
      return `${command.after.source.nodeId ?? '·'} → ${command.after.target.nodeId ?? '·'}`;
    default: return command.label;
  }
}

export function summarizeChanges(changes: readonly Omit<AiProposedChange, 'status'>[]): ProposalChangeSummary[] {
  return changes.map(({ id, explanation, command }) => {
    const last = leaf(command);
    return {
      id,
      kind: last.kind.startsWith('insert-') ? 'addition'
        : last.kind.startsWith('remove-') ? 'removal' : 'modification',
      label: changeLabel(last),
      reason: explanation,
    };
  });
}
