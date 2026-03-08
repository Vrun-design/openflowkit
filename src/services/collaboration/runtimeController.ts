import { createId } from '@/lib/id';
import { applyCollaborationOperation } from './reducer';
import { createLocalPresence, mergePresenceSnapshot, replacePresenceSnapshot } from './session';
import { rebaseCollaborationOperation, guardCollaborationOperationVersion } from './versioning';
import type {
  CollaborationDocumentState,
  CollaborationOperationEnvelope,
  CollaborationOperationPayload,
  CollaborationOperationType,
  CollaborationPresenceState,
} from './types';
import type { CollaborationTransport } from './transport';
import type { CollaborationSessionBootstrap } from './session';

export interface LocalCollaborationOperationInput {
  type: CollaborationOperationType;
  payload: CollaborationOperationPayload;
}

interface CollaborationRuntimeControllerParams {
  transport: CollaborationTransport;
  session: CollaborationSessionBootstrap;
  initialDocumentState: CollaborationDocumentState;
  onDocumentStateChange?: (state: CollaborationDocumentState) => void;
  onPresenceChange?: (presence: CollaborationPresenceState[]) => void;
}

export interface CollaborationRuntimeController {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
  getDocumentState: () => CollaborationDocumentState;
  getPresenceState: () => CollaborationPresenceState[];
  submitLocalOperation: (input: LocalCollaborationOperationInput) => CollaborationOperationEnvelope | null;
  updateLocalPresenceCursor: (x: number, y: number) => void;
}

export function createCollaborationRuntimeController(
  params: CollaborationRuntimeControllerParams
): CollaborationRuntimeController {
  const { transport, session, onDocumentStateChange, onPresenceChange } = params;
  let running = false;
  let documentState = params.initialDocumentState;
  let presenceState: CollaborationPresenceState[] = [];
  let localPresence = session.localPresence;

  function notifyDocumentStateChange(): void {
    onDocumentStateChange?.(documentState);
  }

  function notifyPresenceChange(): void {
    onPresenceChange?.(presenceState);
  }

  function applyIncomingOperation(incomingOperation: CollaborationOperationEnvelope): void {
    const guard = guardCollaborationOperationVersion(documentState, incomingOperation);
    if (guard.decision === 'reject' || guard.decision === 'defer') {
      return;
    }

    const operation = guard.decision === 'rebase'
      ? rebaseCollaborationOperation(documentState, incomingOperation)
      : incomingOperation;

    const result = applyCollaborationOperation(documentState, operation);
    if (!result.applied) {
      return;
    }
    documentState = result.nextState;
    notifyDocumentStateChange();
  }

  function applyIncomingPresenceSnapshot(snapshot: CollaborationPresenceState[]): void {
    presenceState = replacePresenceSnapshot(presenceState, snapshot, localPresence);
    notifyPresenceChange();
  }

  return {
    start: () => {
      if (running) {
        return;
      }
      if (!session.enabled) {
        return;
      }

      running = true;
      localPresence = createLocalPresence(
        session.localPresence.clientId,
        session.localPresence.name,
        session.localPresence.color
      );
      presenceState = [localPresence];
      notifyPresenceChange();

      transport.connect(session.room, (event) => {
        if (event.type === 'operation') {
          applyIncomingOperation(event.operation);
          return;
        }
        applyIncomingPresenceSnapshot(event.presence);
      });
      // Publish initial presence immediately so peers can see viewer/cursor metadata without waiting for pointer movement.
      transport.publishPresence(localPresence);
    },
    stop: () => {
      if (!running) {
        return;
      }
      running = false;
      transport.disconnect();
      presenceState = [];
      notifyPresenceChange();
    },
    isRunning: () => running,
    getDocumentState: () => documentState,
    getPresenceState: () => presenceState,
    submitLocalOperation: (input) => {
      if (!running) {
        return null;
      }
      const operation: CollaborationOperationEnvelope = {
        opId: createId('op'),
        roomId: session.room.roomId,
        clientId: session.room.clientId,
        baseVersion: documentState.version,
        timestamp: Date.now(),
        type: input.type,
        payload: input.payload,
      };
      const result = applyCollaborationOperation(documentState, operation);
      if (!result.applied) {
        return null;
      }

      documentState = result.nextState;
      notifyDocumentStateChange();
      transport.publishOperation(operation);
      return operation;
    },
    updateLocalPresenceCursor: (x, y) => {
      if (!running) {
        return;
      }
      localPresence = {
        ...localPresence,
        cursor: { x, y },
      };
      presenceState = mergePresenceSnapshot(presenceState, [localPresence]);
      notifyPresenceChange();
      transport.publishPresence(localPresence);
    },
  };
}
