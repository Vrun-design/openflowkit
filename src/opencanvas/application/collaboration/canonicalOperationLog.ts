import { applyDocumentCommand, DocumentCommandError } from '../../domain/commands/execute';
import type { DocumentCommand } from '../../domain/commands/types';
import type { SceneDocumentV1 } from '../../domain/document/types';

export interface CanonicalCollaborationOperation {
  readonly opId: string;
  readonly documentId: string;
  readonly clientId: string;
  readonly lamport: number;
  readonly command: DocumentCommand;
}

export interface RejectedCanonicalOperation {
  readonly operation: CanonicalCollaborationOperation;
  readonly reason: 'duplicate' | 'wrong-document' | 'precondition-failed';
  readonly message: string;
}

export interface CanonicalOperationLogResult {
  readonly document: SceneDocumentV1;
  readonly appliedOperationIds: readonly string[];
  readonly rejected: readonly RejectedCanonicalOperation[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isCanonicalCollaborationOperation(
  value: unknown
): value is CanonicalCollaborationOperation {
  if (!isRecord(value) || !isRecord(value.command)) return false;
  return typeof value.opId === 'string'
    && typeof value.documentId === 'string'
    && typeof value.clientId === 'string'
    && typeof value.lamport === 'number'
    && Number.isSafeInteger(value.lamport)
    && value.lamport >= 0
    && typeof value.command.kind === 'string'
    && typeof value.command.id === 'string'
    && typeof value.command.label === 'string';
}

function compareOperations(
  left: CanonicalCollaborationOperation,
  right: CanonicalCollaborationOperation
): number {
  return left.lamport - right.lamport
    || left.clientId.localeCompare(right.clientId)
    || left.opId.localeCompare(right.opId)
    || JSON.stringify(left.command).localeCompare(JSON.stringify(right.command));
}

export function replayCanonicalOperationLog(
  initialDocument: SceneDocumentV1,
  operations: readonly CanonicalCollaborationOperation[]
): CanonicalOperationLogResult {
  let document = initialDocument;
  const appliedOperationIds: string[] = [];
  const rejected: RejectedCanonicalOperation[] = [];
  const seenOperationIds = new Set<string>();

  for (const operation of [...operations].sort(compareOperations)) {
    if (seenOperationIds.has(operation.opId)) {
      rejected.push({ operation, reason: 'duplicate', message: `Duplicate operation "${operation.opId}".` });
      continue;
    }
    seenOperationIds.add(operation.opId);
    if (operation.documentId !== initialDocument.id) {
      rejected.push({
        operation,
        reason: 'wrong-document',
        message: `Operation targets document "${operation.documentId}".`,
      });
      continue;
    }
    try {
      document = applyDocumentCommand(document, operation.command).document;
      appliedOperationIds.push(operation.opId);
    } catch (error) {
      if (!(error instanceof DocumentCommandError)) throw error;
      rejected.push({ operation, reason: 'precondition-failed', message: error.message });
    }
  }

  return { document, appliedOperationIds, rejected };
}
