import type { FlowEdge, FlowNode } from '@/lib/types';
import type { CollaborationRuntimeController } from './runtimeController';
import { computeCollaborationOperationsFromCanvasChange, type CollaborationCanvasSnapshot } from './canvasDiff';
import {
    resolveCollaborationCacheState,
    resolveCollaborationCursorPosition,
    resolveInitialCollaborationCacheState,
    shouldPublishCollaborationCursor,
} from './hookUtils';
import type { CollaborationPresenceState } from './types';

interface SeedCollaborationDocumentIfEmptyParams {
    runtimeController: CollaborationRuntimeController;
    currentNodes: FlowNode[];
    currentEdges: FlowEdge[];
    indexedDbAvailable: boolean;
    setCollaborationCacheState: (cacheState: 'unavailable' | 'syncing' | 'ready' | 'hydrated') => void;
}

export function seedCollaborationDocumentIfEmpty({
    runtimeController,
    currentNodes,
    currentEdges,
    indexedDbAvailable,
    setCollaborationCacheState,
}: SeedCollaborationDocumentIfEmptyParams): void {
    const documentState = runtimeController.getDocumentState();
    setCollaborationCacheState(resolveCollaborationCacheState({
        indexedDbEnabled: true,
        indexedDbAvailable,
        hasPersistedDocumentContent: documentState.nodes.length > 0 || documentState.edges.length > 0,
    }));
    if (documentState.nodes.length > 0 || documentState.edges.length > 0) {
        return;
    }

    for (const node of currentNodes) {
        runtimeController.submitLocalOperation({
            type: 'node.upsert',
            payload: { node },
        });
    }
    for (const edge of currentEdges) {
        runtimeController.submitLocalOperation({
            type: 'edge.upsert',
            payload: { edge },
        });
    }
}

interface ResetCollaborationRuntimeStateParams {
    indexedDbAvailable: boolean;
    setCollaborationPresence: (presence: CollaborationPresenceState[]) => void;
    setCollaborationCacheState: (cacheState: 'unavailable' | 'syncing' | 'ready' | 'hydrated') => void;
    previousCollaborationCanvasRef: { current: CollaborationCanvasSnapshot | null };
    pendingCollaborationSnapshotRef: { current: CollaborationCanvasSnapshot | null };
    collaborationFlushTimerRef: { current: number | null };
    applyingRemoteCollaborationStateRef: { current: boolean };
}

export function resetCollaborationRuntimeState({
    indexedDbAvailable,
    setCollaborationPresence,
    setCollaborationCacheState,
    previousCollaborationCanvasRef,
    pendingCollaborationSnapshotRef,
    collaborationFlushTimerRef,
    applyingRemoteCollaborationStateRef,
}: ResetCollaborationRuntimeStateParams): void {
    setCollaborationPresence([]);
    setCollaborationCacheState(resolveInitialCollaborationCacheState({
        indexedDbEnabled: true,
        indexedDbAvailable,
    }));
    previousCollaborationCanvasRef.current = null;
    pendingCollaborationSnapshotRef.current = null;
    if (collaborationFlushTimerRef.current !== null) {
        window.clearTimeout(collaborationFlushTimerRef.current);
        collaborationFlushTimerRef.current = null;
    }
    applyingRemoteCollaborationStateRef.current = false;
}

interface SyncCollaborationCanvasSnapshotParams {
    controller: CollaborationRuntimeController | null;
    currentSnapshot: CollaborationCanvasSnapshot;
    previousCollaborationCanvasRef: { current: CollaborationCanvasSnapshot | null };
    pendingCollaborationSnapshotRef: { current: CollaborationCanvasSnapshot | null };
    collaborationFlushTimerRef: { current: number | null };
    applyingRemoteCollaborationStateRef: { current: boolean };
}

export function syncCollaborationCanvasSnapshot({
    controller,
    currentSnapshot,
    previousCollaborationCanvasRef,
    pendingCollaborationSnapshotRef,
    collaborationFlushTimerRef,
    applyingRemoteCollaborationStateRef,
}: SyncCollaborationCanvasSnapshotParams): void {
    if (!controller || !controller.isRunning()) {
        previousCollaborationCanvasRef.current = currentSnapshot;
        return;
    }

    if (applyingRemoteCollaborationStateRef.current) {
        applyingRemoteCollaborationStateRef.current = false;
        previousCollaborationCanvasRef.current = currentSnapshot;
        return;
    }

    const previousSnapshot = previousCollaborationCanvasRef.current;
    if (!previousSnapshot) {
        previousCollaborationCanvasRef.current = currentSnapshot;
        return;
    }

    function flushOperations(nextSnapshot: CollaborationCanvasSnapshot): void {
        const beforeSnapshot = previousCollaborationCanvasRef.current;
        if (!beforeSnapshot) {
            previousCollaborationCanvasRef.current = nextSnapshot;
            return;
        }

        const operations = computeCollaborationOperationsFromCanvasChange(beforeSnapshot, nextSnapshot);
        for (const operation of operations) {
            controller.submitLocalOperation(operation);
        }
        previousCollaborationCanvasRef.current = nextSnapshot;
    }

    const isDragHeavyFrame = currentSnapshot.nodes.some((node) => node.dragging || node.resizing);
    if (!isDragHeavyFrame) {
        if (collaborationFlushTimerRef.current !== null) {
            window.clearTimeout(collaborationFlushTimerRef.current);
            collaborationFlushTimerRef.current = null;
        }
        pendingCollaborationSnapshotRef.current = null;
        flushOperations(currentSnapshot);
        return;
    }

    pendingCollaborationSnapshotRef.current = currentSnapshot;
    if (collaborationFlushTimerRef.current !== null) {
        return;
    }

    collaborationFlushTimerRef.current = window.setTimeout(() => {
        collaborationFlushTimerRef.current = null;
        const pendingSnapshot = pendingCollaborationSnapshotRef.current;
        pendingCollaborationSnapshotRef.current = null;
        if (!pendingSnapshot) {
            return;
        }
        flushOperations(pendingSnapshot);
    }, 90);
}

interface RegisterCollaborationPointerTrackingParams {
    editorSurfaceRef: { current: HTMLElement | null };
    collaborationControllerRef: { current: CollaborationRuntimeController | null };
}

export function registerCollaborationPointerTracking({
    editorSurfaceRef,
    collaborationControllerRef,
}: RegisterCollaborationPointerTrackingParams): () => void {
    let frameId: number | null = null;
    let latestPoint: { x: number; y: number } | null = null;
    let lastPublishedPoint: { x: number; y: number } | null = null;

    function flushPresenceCursor(): void {
        frameId = null;
        if (!latestPoint) {
            return;
        }
        if (!shouldPublishCollaborationCursor({ previous: lastPublishedPoint, next: latestPoint })) {
            latestPoint = null;
            return;
        }
        collaborationControllerRef.current?.updateLocalPresenceCursor(latestPoint.x, latestPoint.y);
        lastPublishedPoint = latestPoint;
        latestPoint = null;
    }

    function handlePointerMove(event: PointerEvent): void {
        const editorSurface = editorSurfaceRef.current;
        if (!editorSurface) {
            return;
        }
        const surfaceBounds = editorSurface.getBoundingClientRect();
        const nextCursorPosition = resolveCollaborationCursorPosition({
            clientX: event.clientX,
            clientY: event.clientY,
            bounds: surfaceBounds,
        });
        if (!nextCursorPosition) {
            return;
        }

        latestPoint = nextCursorPosition;
        if (frameId !== null) {
            return;
        }
        frameId = window.requestAnimationFrame(flushPresenceCursor);
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        if (frameId !== null) {
            window.cancelAnimationFrame(frameId);
        }
    };
}
