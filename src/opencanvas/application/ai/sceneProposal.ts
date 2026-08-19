import { applyDocumentCommand } from '../../domain/commands/execute';
import type { DocumentCommand } from '../../domain/commands/types';
import type { SceneDocumentV1 } from '../../domain/document/types';
import { classifyAiError, type AiSafeError } from './safeErrors';

export type AtomicDocumentCommand = Exclude<DocumentCommand, { readonly kind: 'batch' }>;

export interface AiProposedChange {
  readonly id: string;
  readonly explanation: string;
  readonly command: AtomicDocumentCommand;
  readonly status: 'pending' | 'accepted' | 'rejected';
}

export interface AiSceneProposal {
  readonly id: string;
  readonly baseDocumentId: string;
  readonly baseUpdatedAt: string;
  readonly changes: readonly AiProposedChange[];
  readonly preview: SceneDocumentV1;
  readonly error?: AiSafeError;
}

export function buildAiSceneProposal(
  document: SceneDocumentV1,
  id: string,
  changes: readonly Omit<AiProposedChange, 'status'>[]
): AiSceneProposal {
  if (!id || changes.length === 0 || new Set(changes.map(({ id }) => id)).size !== changes.length) {
    return { id, baseDocumentId: document.id, baseUpdatedAt: document.updatedAt, changes: [],
      preview: document, error: { code: 'INVALID_PROPOSAL', message: 'AI proposal is empty or has duplicate identities.', retryable: false } };
  }
  try {
    let preview = document;
    for (const change of changes) preview = applyDocumentCommand(preview, change.command).document;
    return { id, baseDocumentId: document.id, baseUpdatedAt: document.updatedAt,
      changes: changes.map((change) => ({ ...change, status: 'pending' })), preview };
  } catch (error) {
    return { id, baseDocumentId: document.id, baseUpdatedAt: document.updatedAt,
      changes: changes.map((change) => ({ ...change, status: 'pending' })), preview: document,
      error: classifyAiError(error) };
  }
}

export function decideAiProposalChange(
  proposal: AiSceneProposal, changeId: string, decision: 'accepted' | 'rejected', base: SceneDocumentV1
): AiSceneProposal {
  const changes = proposal.changes.map((change) =>
    change.id === changeId ? { ...change, status: decision } : change);
  if (!changes.some(({ id }) => id === changeId)) throw new RangeError(`AI change "${changeId}" was not found.`);
  let preview = base;
  try {
    for (const change of changes) {
      if (change.status !== 'rejected') preview = applyDocumentCommand(preview, change.command).document;
    }
    return { ...proposal, changes, preview, error: undefined };
  } catch (error) {
    return { ...proposal, changes, preview: base, error: classifyAiError(error) };
  }
}

export function acceptedAiProposalCommand(
  proposal: AiSceneProposal, current: SceneDocumentV1
): DocumentCommand | null {
  if (proposal.error) throw new TypeError('Invalid AI proposal cannot be accepted.');
  if (current.id !== proposal.baseDocumentId || current.updatedAt !== proposal.baseUpdatedAt) {
    throw new TypeError('AI proposal precondition failed because the document changed.');
  }
  const commands = proposal.changes.filter(({ status }) => status === 'accepted').map(({ command }) => command);
  return commands.length === 0 ? null : {
    kind: 'batch', id: `accept-ai-proposal:${proposal.id}`, label: 'Apply AI proposal', commands,
  };
}
