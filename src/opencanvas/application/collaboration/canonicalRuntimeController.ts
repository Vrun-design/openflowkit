import { createId } from '@/lib/id';
import type { CollaborationSessionBootstrap } from '@/services/collaboration/session';
import type { CollaborationTransport } from '@/services/collaboration/transport';
import type { DocumentCommand } from '../../domain/commands/types';
import { applyDocumentCommand } from '../../domain/commands/execute';
import type { SceneDocumentV1 } from '../../domain/document/types';
import {
  replayCanonicalOperationLog,
  type CanonicalCollaborationOperation,
  type RejectedCanonicalOperation,
} from './canonicalOperationLog';

interface CanonicalRuntimeControllerParams {
  readonly transport: CollaborationTransport;
  readonly session: CollaborationSessionBootstrap;
  readonly initialDocument: SceneDocumentV1;
  readonly onDocumentChange?: (document: SceneDocumentV1) => void;
  readonly onRejectedOperations?: (rejected: readonly RejectedCanonicalOperation[]) => void;
  readonly onBeforeLocalApply?: () => void;
}

export interface CanonicalRuntimeController {
  readonly start: () => boolean;
  readonly stop: () => void;
  readonly isRunning: () => boolean;
  readonly getDocument: () => SceneDocumentV1;
  readonly getOperations: () => readonly CanonicalCollaborationOperation[];
  readonly submit: (command: DocumentCommand) => CanonicalCollaborationOperation | null;
  readonly canUndo: () => boolean;
  readonly canRedo: () => boolean;
  readonly undo: () => CanonicalCollaborationOperation | null;
  readonly redo: () => CanonicalCollaborationOperation | null;
}

export function createCanonicalRuntimeController(
  params: CanonicalRuntimeControllerParams
): CanonicalRuntimeController {
  const {
    transport, session, initialDocument, onDocumentChange, onRejectedOperations, onBeforeLocalApply,
  } = params;
  const operationsById = new Map<string, CanonicalCollaborationOperation>();
  let document = initialDocument;
  let lamport = 0;
  let running = false;
  const undoStack: { forward: DocumentCommand; inverse: DocumentCommand }[] = [];
  const redoStack: { forward: DocumentCommand; inverse: DocumentCommand }[] = [];

  function materialize(): void {
    const result = replayCanonicalOperationLog(initialDocument, [...operationsById.values()]);
    document = result.document;
    onDocumentChange?.(document);
    if (result.rejected.length > 0) onRejectedOperations?.(result.rejected);
  }

  function accept(operation: CanonicalCollaborationOperation): void {
    lamport = Math.max(lamport, operation.lamport);
    if (operationsById.has(operation.opId)) return;
    operationsById.set(operation.opId, operation);
    materialize();
  }

  function publishCommand(
    command: DocumentCommand,
    history: 'record' | 'undo' | 'redo' = 'record'
  ): CanonicalCollaborationOperation | null {
    if (!running || !transport.publishCanonicalOperation) return null;
    const operation: CanonicalCollaborationOperation = {
      opId: createId('canonical-op'), documentId: initialDocument.id,
      clientId: session.room.clientId, lamport: lamport + 1, command,
    };
    const candidate = replayCanonicalOperationLog(initialDocument, [
      ...operationsById.values(), operation,
    ]);
    if (!candidate.appliedOperationIds.includes(operation.opId)) {
      const ownRejection = candidate.rejected.filter((item) => item.operation.opId === operation.opId);
      if (ownRejection.length > 0) onRejectedOperations?.(ownRejection);
      return null;
    }
    let inverse: DocumentCommand;
    try {
      inverse = applyDocumentCommand(document, command).inverse;
    } catch {
      return null;
    }
    onBeforeLocalApply?.();
    accept(operation);
    transport.publishCanonicalOperation(operation);
    if (history === 'record') {
      undoStack.push({ forward: command, inverse });
      redoStack.length = 0;
    }
    return operation;
  }

  return {
    start: () => {
      if (running) return true;
      if (!session.enabled || !transport.publishCanonicalOperation) return false;
      running = true;
      transport.connect(session.room, (event) => {
        if (event.type === 'canonical_operation') accept(event.operation);
      });
      return true;
    },
    stop: () => {
      if (!running) return;
      running = false;
      transport.disconnect();
    },
    isRunning: () => running,
    getDocument: () => document,
    getOperations: () => [...operationsById.values()],
    submit: (command) => publishCommand(command),
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
    undo: () => {
      const transaction = undoStack.at(-1);
      if (!transaction) return null;
      const operation = publishCommand(transaction.inverse, 'undo');
      if (!operation) return null;
      undoStack.pop(); redoStack.push(transaction);
      return operation;
    },
    redo: () => {
      const transaction = redoStack.at(-1);
      if (!transaction) return null;
      const operation = publishCommand(transaction.forward, 'redo');
      if (!operation) return null;
      redoStack.pop(); undoStack.push(transaction);
      return operation;
    },
  };
}
