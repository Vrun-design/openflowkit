import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ROLLOUT_FLAGS } from '@/config/rolloutFlags';
import {
  resolveLocalCollaborationClientId,
  resolveLocalCollaborationIdentity,
  resolveLocalCollaborationRoomSecret,
} from '@/services/collaboration/hookUtils';
import { resolveCollaborationRoomId } from '@/services/collaboration/roomLink';
import { createCollaborationSessionBootstrap } from '@/services/collaboration/session';
import { createCollaborationTransportFactory } from '@/services/collaboration/transportFactory';
import type { DocumentCommand } from '../domain/commands/types';
import type { SceneDocumentV1 } from '../domain/document/types';
import {
  createCanonicalRuntimeController,
  type CanonicalRuntimeController,
} from '../application/collaboration/canonicalRuntimeController';

interface OpenCanvasCanonicalCollaborationOptions {
  readonly document: SceneDocumentV1 | null;
  readonly pageId: string | null;
  readonly onDocumentChange: (document: SceneDocumentV1) => void;
  readonly onBeforeLocalApply: () => void;
  readonly onConflict: () => void;
}

export interface OpenCanvasCanonicalCollaboration {
  readonly running: boolean;
  readonly submit: (command: DocumentCommand) => boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly undo: () => boolean;
  readonly redo: () => boolean;
}

export function useOpenCanvasCanonicalCollaboration(
  options: OpenCanvasCanonicalCollaborationOptions
): OpenCanvasCanonicalCollaboration {
  const location = useLocation();
  const controllerRef = useRef<CanonicalRuntimeController | null>(null);
  const callbacksRef = useRef(options);
  useEffect(() => {
    callbacksRef.current = options;
  });
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState({ canUndo: false, canRedo: false });
  const enabled = ROLLOUT_FLAGS.collaborationEnabled
    && ROLLOUT_FLAGS.openCanvasCanonicalCollaboration;
  const documentId = options.document?.id ?? null;

  useEffect(() => {
    const initialDocument = callbacksRef.current.document;
    const pageId = callbacksRef.current.pageId;
    if (!enabled || !initialDocument || !pageId) return;
    const room = resolveCollaborationRoomId(location.search, pageId);
    const roomSecret = resolveLocalCollaborationRoomSecret({
      collaborationEnabled: true,
      roomId: room.roomId,
      roomSecretFromUrl: room.roomSecret,
      shouldWriteToUrl: room.shouldWriteToUrl,
    });
    const clientId = resolveLocalCollaborationClientId(true, room.roomId);
    if (!roomSecret || !clientId) return;
    const identity = resolveLocalCollaborationIdentity(clientId);
    const transport = createCollaborationTransportFactory('realtime').transport;
    const controller = createCanonicalRuntimeController({
      transport,
      session: createCollaborationSessionBootstrap({
        roomId: room.roomId,
        roomPassword: roomSecret,
        clientId,
        name: identity.name,
        color: identity.color,
      }),
      initialDocument,
      onBeforeLocalApply: () => callbacksRef.current.onBeforeLocalApply(),
      onDocumentChange: (document) => callbacksRef.current.onDocumentChange(document),
      onRejectedOperations: () => callbacksRef.current.onConflict(),
    });
    controllerRef.current = controller;
    const started = controller.start();
    setRunning(started);
    return () => {
      controller.stop();
      if (controllerRef.current === controller) controllerRef.current = null;
      setRunning(false);
    };
  }, [documentId, enabled, location.search, options.pageId]);

  const refreshHistory = useCallback(() => {
    const controller = controllerRef.current;
    setHistory({ canUndo: controller?.canUndo() ?? false, canRedo: controller?.canRedo() ?? false });
  }, []);
  const submit = useCallback((command: DocumentCommand) => {
    const applied = Boolean(controllerRef.current?.submit(command));
    refreshHistory();
    return applied;
  }, [refreshHistory]);
  const undo = useCallback(() => {
    const applied = Boolean(controllerRef.current?.undo()); refreshHistory(); return applied;
  }, [refreshHistory]);
  const redo = useCallback(() => {
    const applied = Boolean(controllerRef.current?.redo()); refreshHistory(); return applied;
  }, [refreshHistory]);
  return { running, submit, ...history, undo, redo };
}
