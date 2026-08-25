import type { SceneDocumentV1 } from '../../domain/document/types';
import { validateSceneDocumentV1 } from '../../domain/document/validation';
import {
  compareCanonicalCollaborationOperations,
  replayCanonicalOperationLog,
  type CanonicalCollaborationOperation,
  type CanonicalOperationLogResult,
  type RejectedCanonicalOperation,
} from './canonicalOperationLog';

export interface CanonicalOperationCursor {
  readonly lamport: number;
  readonly clientId: string;
  readonly opId: string;
}

export interface CanonicalOperationCheckpointV1 {
  readonly version: 1;
  readonly documentId: string;
  readonly document: SceneDocumentV1;
  readonly cursor: CanonicalOperationCursor | null;
  readonly compactedOperationIds: readonly string[];
}

function toCursor(operation: CanonicalCollaborationOperation): CanonicalOperationCursor {
  return {
    lamport: operation.lamport,
    clientId: operation.clientId,
    opId: operation.opId,
  };
}

function compareOperationToCursor(
  operation: CanonicalCollaborationOperation,
  cursor: CanonicalOperationCursor
): number {
  return operation.lamport - cursor.lamport
    || operation.clientId.localeCompare(cursor.clientId)
    || operation.opId.localeCompare(cursor.opId);
}

function assertValidCheckpoint(checkpoint: CanonicalOperationCheckpointV1): void {
  if (checkpoint.version !== 1) throw new TypeError('Unsupported canonical checkpoint version.');
  const validation = validateSceneDocumentV1(checkpoint.document);
  if (!validation.success) throw new TypeError('Canonical checkpoint contains an invalid document.');
  if (checkpoint.document.id !== checkpoint.documentId) {
    throw new TypeError('Canonical checkpoint document ID does not match its snapshot.');
  }
  if (new Set(checkpoint.compactedOperationIds).size !== checkpoint.compactedOperationIds.length) {
    throw new TypeError('Canonical checkpoint operation IDs must be unique.');
  }
}

export function createCanonicalOperationCheckpoint(
  initialDocument: SceneDocumentV1,
  operations: readonly CanonicalCollaborationOperation[]
): CanonicalOperationCheckpointV1 {
  const ordered = [...operations].sort(compareCanonicalCollaborationOperations);
  const result = replayCanonicalOperationLog(initialDocument, ordered);
  return {
    version: 1,
    documentId: initialDocument.id,
    document: result.document,
    cursor: ordered.length > 0 ? toCursor(ordered[ordered.length - 1]) : null,
    compactedOperationIds: [...new Set(ordered.map((operation) => operation.opId))],
  };
}

export function resumeCanonicalOperationCheckpoint(
  checkpoint: CanonicalOperationCheckpointV1,
  operations: readonly CanonicalCollaborationOperation[]
): CanonicalOperationLogResult {
  assertValidCheckpoint(checkpoint);
  const compactedIds = new Set(checkpoint.compactedOperationIds);
  const eligible: CanonicalCollaborationOperation[] = [];
  const rejected: RejectedCanonicalOperation[] = [];

  for (const operation of [...operations].sort(compareCanonicalCollaborationOperations)) {
    if (compactedIds.has(operation.opId)) {
      rejected.push({
        operation,
        reason: 'duplicate',
        message: `Operation "${operation.opId}" is already included in the checkpoint.`,
      });
      continue;
    }
    if (checkpoint.cursor && compareOperationToCursor(operation, checkpoint.cursor) <= 0) {
      rejected.push({
        operation,
        reason: 'before-checkpoint',
        message: `Operation "${operation.opId}" is ordered before the checkpoint frontier.`,
      });
      continue;
    }
    eligible.push(operation);
  }

  const resumed = replayCanonicalOperationLog(checkpoint.document, eligible);
  return {
    document: resumed.document,
    appliedOperationIds: resumed.appliedOperationIds,
    rejected: [...rejected, ...resumed.rejected],
  };
}
