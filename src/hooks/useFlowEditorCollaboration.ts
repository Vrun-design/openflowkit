import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROLLOUT_FLAGS } from '@/config/rolloutFlags';
import type { FlowEdge, FlowNode } from '@/lib/types';
import type { ToastType } from '@/components/ui/ToastContext';
import { useFlowStore } from '@/store';
import { createCollaborationSessionBootstrap } from '@/services/collaboration/session';
import { createCollaborationRuntimeController } from '@/services/collaboration/runtimeController';
import { applyCollaborationDocumentStateToCanvas, createCollaborationDocumentStateFromCanvas } from '@/services/collaboration/storeBridge';
import { buildCollaborationPresenceViewModel } from '@/services/collaboration/presenceViewModel';
import type { CollaborationPresenceState } from '@/services/collaboration/types';
import { createCollaborationTransportFactory } from '@/services/collaboration/transportFactory';
import type { CollaborationCanvasSnapshot } from '@/services/collaboration/canvasDiff';
import {
    createCollaborationRuntimeControllerBundle,
    registerCollaborationPointerTracking,
    resetCollaborationRuntimeState,
    seedCollaborationDocumentIfEmpty,
    syncCollaborationCanvasSnapshot,
} from '@/services/collaboration/runtimeHookUtils';
import {
    buildTopNavParticipants,
    resolveCollaborationCacheState,
    resolveInitialCollaborationCacheState,
    resolveLocalCollaborationClientId,
    resolveLocalCollaborationIdentity,
    resolveLocalCollaborationRoomSecret,
} from '@/services/collaboration/hookUtils';
import { buildCollaborationInviteUrl, COLLAB_ROOM_QUERY_PARAM, COLLAB_SECRET_QUERY_PARAM, resolveCollaborationRoomId } from '@/services/collaboration/roomLink';

type SetFlowNodes = (payload: FlowNode[] | ((nodes: FlowNode[]) => FlowNode[])) => void;
type SetFlowEdges = (payload: FlowEdge[] | ((edges: FlowEdge[]) => FlowEdge[])) => void;

export interface FlowEditorCollaborationTopNavState {
    roomId: string;
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
    activeTabId: string;
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
    activeTabId,
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
            indexedDbEnabled: ROLLOUT_FLAGS.collaborationIndexedDbV1,
            indexedDbAvailable,
        })
    );
    const collaborationControllerRef = useRef<ReturnType<typeof createCollaborationRuntimeController> | null>(null);
    const previousCollaborationCanvasRef = useRef<CollaborationCanvasSnapshot | null>(null);
    const applyingRemoteCollaborationStateRef = useRef(false);
    const pendingCollaborationSnapshotRef = useRef<CollaborationCanvasSnapshot | null>(null);
    const collaborationFlushTimerRef = useRef<number | null>(null);

    const collaborationRoom = useMemo(
        () => resolveCollaborationRoomId(location.search, activeTabId),
        [location.search, activeTabId]
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
        params.set(COLLAB_SECRET_QUERY_PARAM, collaborationRoomSecret);
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
        const { runtimeController, transportFactory } = createCollaborationRuntimeControllerBundle({
            collaborationRoomId,
            collaborationRoomSecret,
            clientId,
            localIdentity: localCollaborationIdentity,
            currentNodes,
            currentEdges,
            indexedDbAvailable,
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

    const handleCopyInvite = useCallback(async (): Promise<void> => {
        if (!collaborationRoomSecret) {
            addToast(t('share.toast.copyFailed', 'Unable to copy share link.'), 'error');
            return;
        }
        const inviteUrl = buildCollaborationInviteUrl(window.location.href, collaborationRoomId, collaborationRoomSecret);
        try {
            await navigator.clipboard.writeText(inviteUrl);
            addToast(t('share.toast.linkCopied', 'Collaboration link copied.'), 'success');
        } catch {
            addToast(t('share.toast.copyFailed', 'Unable to copy share link.'), 'error');
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
        handleCopyInvite,
        localCollaborationClientId,
        presenceViewModel.viewerCount,
    ]);

    return {
        collaborationTopNavState,
        remotePresence: presenceViewModel.remotePresence,
    };
}
