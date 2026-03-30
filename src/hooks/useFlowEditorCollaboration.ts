import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import type { FlowEdge, FlowNode } from '@/lib/types';
import type { ToastType } from '@/components/ui/ToastContext';
import { useFlowStore } from '@/store';
import { createCollaborationRuntimeBundle } from '@/services/collaboration/bootstrap';
import { createCollaborationRuntimeController } from '@/services/collaboration/runtimeController';
import { buildCollaborationPresenceViewModel } from '@/services/collaboration/presenceViewModel';
import type { CollaborationPresenceState } from '@/services/collaboration/types';
import type { CollaborationCanvasSnapshot } from '@/services/collaboration/canvasDiff';
import {
    registerCollaborationPointerTracking,
    resetCollaborationRuntimeState,
    seedCollaborationDocumentIfEmpty,
    syncCollaborationCanvasSnapshot,
} from '@/services/collaboration/runtimeHookUtils';
import {
    buildTopNavParticipants,
    resolveInitialCollaborationCacheState,
    resolveLocalCollaborationClientId,
    resolveLocalCollaborationIdentity,
    resolveLocalCollaborationRoomSecret,
} from '@/services/collaboration/hookUtils';
import { buildCollaborationInviteUrl, COLLAB_ROOM_QUERY_PARAM, COLLAB_SECRET_QUERY_PARAM, resolveCollaborationRoomId } from '@/services/collaboration/roomLink';
import { notifyOperationOutcome } from '@/services/operationFeedback';

type SetFlowNodes = (payload: FlowNode[] | ((nodes: FlowNode[]) => FlowNode[])) => void;
type SetFlowEdges = (payload: FlowEdge[] | ((edges: FlowEdge[]) => FlowEdge[])) => void;

export interface FlowEditorCollaborationTopNavState {
    roomId: string;
    inviteUrl: string;
    viewerCount: number;
    status: 'realtime' | 'waiting' | 'fallback';
    cacheState: 'unavailable' | 'syncing' | 'ready' | 'hydrated';
    participants: Array<{
        clientId: string;
        name: string;
        color: string;
        isLocal: boolean;
    }>;
    onCopyShareLink: () => void;
}

export type CollaborationRemotePresence = ReturnType<typeof buildCollaborationPresenceViewModel>['remotePresence'][number];

interface UseFlowEditorCollaborationParams {
    collaborationEnabled: boolean;
    activePageId: string;
    nodes: FlowNode[];
    edges: FlowEdge[];
    editorSurfaceRef: RefObject<HTMLElement | null>;
    setNodes: SetFlowNodes;
    setEdges: SetFlowEdges;
    addToast: (message: string, type?: ToastType, duration?: number) => void;
}

interface UseFlowEditorCollaborationResult {
    collaborationTopNavState: FlowEditorCollaborationTopNavState | undefined;
    remotePresence: CollaborationRemotePresence[];
}

export function useFlowEditorCollaboration({
    collaborationEnabled,
    activePageId,
    nodes,
    edges,
    editorSurfaceRef,
    setNodes,
    setEdges,
    addToast,
}: UseFlowEditorCollaborationParams): UseFlowEditorCollaborationResult {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const indexedDbAvailable = typeof indexedDB !== 'undefined';
    const [collaborationPresence, setCollaborationPresence] = useState<CollaborationPresenceState[]>([]);
    const [collaborationTransportStatus, setCollaborationTransportStatus] = useState<'realtime' | 'waiting' | 'fallback'>('fallback');
    const [collaborationCacheState, setCollaborationCacheState] = useState<'unavailable' | 'syncing' | 'ready' | 'hydrated'>(
        resolveInitialCollaborationCacheState({
            indexedDbEnabled: true,
            indexedDbAvailable,
        })
    );
    const collaborationControllerRef = useRef<ReturnType<typeof createCollaborationRuntimeController> | null>(null);
    const previousPresenceMapRef = useRef<Map<string, string>>(new Map());
    const hasHydratedPresenceRef = useRef(false);
    const previousTransportStatusRef = useRef<'realtime' | 'waiting' | 'fallback' | null>(null);
    const previousCollaborationCanvasRef = useRef<CollaborationCanvasSnapshot | null>(null);
    const applyingRemoteCollaborationStateRef = useRef(false);
    const pendingCollaborationSnapshotRef = useRef<CollaborationCanvasSnapshot | null>(null);
    const collaborationFlushTimerRef = useRef<number | null>(null);

    const collaborationRoom = useMemo(
        () => resolveCollaborationRoomId(location.search, activePageId),
        [location.search, activePageId]
    );
    const collaborationRoomId = collaborationRoom.roomId;
    const collaborationRoomSecret = useMemo(
        () => resolveLocalCollaborationRoomSecret({
            collaborationEnabled,
            roomId: collaborationRoomId,
            roomSecretFromUrl: collaborationRoom.roomSecret,
            shouldWriteToUrl: collaborationRoom.shouldWriteToUrl,
        }),
        [collaborationEnabled, collaborationRoom.roomSecret, collaborationRoom.shouldWriteToUrl, collaborationRoomId]
    );
    const localCollaborationClientId = useMemo(
        () => resolveLocalCollaborationClientId(collaborationEnabled, collaborationRoomId),
        [collaborationEnabled, collaborationRoomId]
    );
    const presenceViewModel = useMemo(
        () => buildCollaborationPresenceViewModel(collaborationPresence, localCollaborationClientId),
        [collaborationPresence, localCollaborationClientId]
    );
    const localCollaborationIdentity = useMemo(
        () => resolveLocalCollaborationIdentity(localCollaborationClientId),
        [localCollaborationClientId]
    );

    useEffect(() => {
        if (!collaborationEnabled || !collaborationRoom.shouldWriteToUrl || !collaborationRoomSecret) {
            return;
        }

        const params = new URLSearchParams(location.search);
        params.set(COLLAB_ROOM_QUERY_PARAM, collaborationRoomId);
        if (collaborationRoomSecret !== collaborationRoomId) {
            params.set(COLLAB_SECRET_QUERY_PARAM, collaborationRoomSecret);
        } else {
            params.delete(COLLAB_SECRET_QUERY_PARAM);
        }
        navigate(
            {
                pathname: location.pathname,
                search: `?${params.toString()}`,
                hash: location.hash,
            },
            { replace: true }
        );
    }, [
        collaborationEnabled,
        collaborationRoom.shouldWriteToUrl,
        collaborationRoomId,
        collaborationRoomSecret,
        location.hash,
        location.pathname,
        location.search,
        navigate,
    ]);

    useEffect(() => {
        if (!collaborationEnabled) {
            return;
        }

        const clientId = localCollaborationClientId;
        if (!clientId) {
            return;
        }
        if (!collaborationRoomSecret) {
            return;
        }

        const { nodes: currentNodes, edges: currentEdges } = useFlowStore.getState();
        const { runtimeController, transportFactory } = createCollaborationRuntimeBundle({
            collaborationRoomId,
            collaborationRoomSecret,
            clientId,
            localIdentity: localCollaborationIdentity,
            currentNodes,
            currentEdges,
            setNodes: (payload) => {
                if (typeof payload === 'function') {
                    setNodes(payload);
                    return;
                }
                applyingRemoteCollaborationStateRef.current = true;
                setNodes(payload);
            },
            setEdges: (payload) => {
                if (typeof payload === 'function') {
                    setEdges(payload);
                    return;
                }
                applyingRemoteCollaborationStateRef.current = true;
                setEdges(payload);
            },
            setCollaborationPresence,
        });

        collaborationControllerRef.current = runtimeController;
        previousCollaborationCanvasRef.current = {
            nodes: currentNodes,
            edges: currentEdges,
        };
        runtimeController.start();
        void transportFactory.transport.whenReady?.().then(() => {
            if (collaborationControllerRef.current !== runtimeController || !runtimeController.isRunning()) {
                return;
            }
            seedCollaborationDocumentIfEmpty({
                runtimeController,
                currentNodes,
                currentEdges,
                indexedDbAvailable,
                setCollaborationCacheState,
            });
        });

        const unsubscribeTransportStatus = transportFactory.transport.subscribeStatus?.((status) => {
            if (transportFactory.resolvedMode !== 'realtime') {
                setCollaborationTransportStatus('fallback');
                return;
            }
            setCollaborationTransportStatus(status.connected ? 'realtime' : 'waiting');
        });
        let fallbackStatusTimer: number | null = null;
        if (!unsubscribeTransportStatus) {
            fallbackStatusTimer = window.setTimeout(() => {
                setCollaborationTransportStatus(transportFactory.resolvedMode === 'realtime' ? 'waiting' : 'fallback');
            }, 0);
        }

        return () => {
            unsubscribeTransportStatus?.();
            if (fallbackStatusTimer !== null) {
                window.clearTimeout(fallbackStatusTimer);
            }
            runtimeController.stop();
            if (collaborationControllerRef.current === runtimeController) {
                collaborationControllerRef.current = null;
            }
            resetCollaborationRuntimeState({
                indexedDbAvailable,
                setCollaborationPresence,
                setCollaborationCacheState,
                previousCollaborationCanvasRef,
                pendingCollaborationSnapshotRef,
                collaborationFlushTimerRef,
                applyingRemoteCollaborationStateRef,
            });
        };
    }, [
        collaborationRoomId,
        collaborationRoomSecret,
        collaborationEnabled,
        indexedDbAvailable,
        localCollaborationClientId,
        localCollaborationIdentity,
        setEdges,
        setNodes,
    ]);

    useEffect(() => {
        if (!collaborationEnabled) {
            previousCollaborationCanvasRef.current = null;
            return;
        }

        const controller = collaborationControllerRef.current;
        const currentSnapshot: CollaborationCanvasSnapshot = { nodes, edges };
        syncCollaborationCanvasSnapshot({
            controller,
            currentSnapshot,
            previousCollaborationCanvasRef,
            pendingCollaborationSnapshotRef,
            collaborationFlushTimerRef,
            applyingRemoteCollaborationStateRef,
        });
    }, [nodes, edges, collaborationEnabled]);

    useEffect(() => {
        if (!collaborationEnabled) {
            return;
        }

        return registerCollaborationPointerTracking({
            editorSurfaceRef,
            collaborationControllerRef,
        });
    }, [collaborationEnabled, editorSurfaceRef]);

    useEffect(() => {
        if (!collaborationEnabled) {
            return;
        }
        const selectedIds = nodes.filter((n) => n.selected).map((n) => n.id);
        collaborationControllerRef.current?.updateLocalPresenceSelection(selectedIds);
    }, [collaborationEnabled, nodes]);

    useEffect(() => {
        if (!collaborationEnabled) {
            hasHydratedPresenceRef.current = false;
            return;
        }
        const currentMap = new Map(collaborationPresence.map((p) => [p.clientId, p.name]));

        if (!hasHydratedPresenceRef.current) {
            previousPresenceMapRef.current = currentMap;
            hasHydratedPresenceRef.current = true;
            return;
        }

        previousPresenceMapRef.current = currentMap;
    }, [collaborationEnabled, collaborationPresence]);

    useEffect(() => {
        if (!collaborationEnabled) {
            previousTransportStatusRef.current = null;
            return;
        }

        const previousStatus = previousTransportStatusRef.current;
        if (previousStatus === null) {
            previousTransportStatusRef.current = collaborationTransportStatus;
            return;
        }

        if (previousStatus !== collaborationTransportStatus) {
            if (collaborationTransportStatus === 'fallback') {
                notifyOperationOutcome(addToast, {
                    status: 'warning',
                    summary: t('share.toast.fallbackMode', 'Realtime sync is unavailable. Continuing in local-only mode.'),
                    duration: 4500,
                });
            } else if (previousStatus === 'fallback' && collaborationTransportStatus === 'realtime') {
                notifyOperationOutcome(addToast, {
                    status: 'success',
                    summary: t('share.toast.reconnected', 'Realtime collaboration restored.'),
                    duration: 3000,
                });
            }

            previousTransportStatusRef.current = collaborationTransportStatus;
        }
    }, [addToast, collaborationEnabled, collaborationTransportStatus, t]);

    const handleCopyInvite = useCallback(async (): Promise<void> => {
        if (!collaborationRoomSecret) {
            notifyOperationOutcome(addToast, {
                status: 'error',
                summary: t('share.toast.copyFailed', 'Unable to copy share link.'),
            });
            return;
        }
        const inviteUrl = buildCollaborationInviteUrl(window.location.href, collaborationRoomId, collaborationRoomSecret);
        try {
            await navigator.clipboard.writeText(inviteUrl);
            notifyOperationOutcome(addToast, {
                status: 'success',
                summary: t('share.toast.linkCopied', 'Collaboration link copied.'),
            });
        } catch {
            notifyOperationOutcome(addToast, {
                status: 'warning',
                summary: t('share.toast.copyManual', 'Clipboard access is blocked. Copy the link manually from the share dialog.'),
                duration: 4500,
            });
        }
    }, [addToast, collaborationRoomId, collaborationRoomSecret, t]);

    const collaborationTopNavState = useMemo<FlowEditorCollaborationTopNavState | undefined>(() => {
        if (!collaborationEnabled) {
            return undefined;
        }

        return {
            status: collaborationTransportStatus,
            cacheState: collaborationCacheState,
            roomId: collaborationRoomId,
            inviteUrl: buildCollaborationInviteUrl(window.location.href, collaborationRoomId, collaborationRoomSecret ?? collaborationRoomId),
            viewerCount: presenceViewModel.viewerCount,
            participants: buildTopNavParticipants(collaborationPresence, localCollaborationClientId),
            onCopyShareLink: () => {
                void handleCopyInvite();
            },
        };
    }, [
        collaborationEnabled,
        collaborationCacheState,
        collaborationPresence,
        collaborationTransportStatus,
        collaborationRoomId,
        collaborationRoomSecret,
        handleCopyInvite,
        localCollaborationClientId,
        presenceViewModel.viewerCount,
    ]);

    return {
        collaborationTopNavState,
        remotePresence: presenceViewModel.remotePresence,
    };
}
