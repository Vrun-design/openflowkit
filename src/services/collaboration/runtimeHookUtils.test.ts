import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FlowEdge, FlowNode } from '@/lib/types';
import type { CollaborationRuntimeController } from './runtimeController';
import { registerCollaborationPointerTracking, syncCollaborationCanvasSnapshot } from './runtimeHookUtils';

function createNode(id: string, overrides: Partial<FlowNode> = {}): FlowNode {
  return {
    id,
    type: 'custom',
    position: { x: 0, y: 0 },
    data: { label: id },
    ...overrides,
  };
}

function createEdge(id: string, overrides: Partial<FlowEdge> = {}): FlowEdge {
  return {
    id,
    source: 'a',
    target: 'b',
    ...overrides,
  };
}

function createController(overrides: Partial<CollaborationRuntimeController> = {}): CollaborationRuntimeController {
  return {
    start: vi.fn(),
    stop: vi.fn(),
    isRunning: vi.fn(() => true),
    getDocumentState: vi.fn(),
    getPresenceState: vi.fn(),
    submitLocalOperation: vi.fn(),
    updateLocalPresenceCursor: vi.fn(),
    ...overrides,
  } as CollaborationRuntimeController;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('syncCollaborationCanvasSnapshot', () => {
  it('records the latest snapshot when the runtime controller is unavailable', () => {
    const previousCollaborationCanvasRef = { current: null };

    syncCollaborationCanvasSnapshot({
      controller: null,
      currentSnapshot: { nodes: [createNode('n-1')], edges: [] },
      previousCollaborationCanvasRef,
      pendingCollaborationSnapshotRef: { current: null },
      collaborationFlushTimerRef: { current: null },
      applyingRemoteCollaborationStateRef: { current: false },
    });

    expect(previousCollaborationCanvasRef.current).toEqual({
      nodes: [createNode('n-1')],
      edges: [],
    });
  });

  it('suppresses local operation emission for remote-applied snapshots', () => {
    const controller = createController();
    const previousCollaborationCanvasRef = {
      current: { nodes: [createNode('n-1')], edges: [] },
    };
    const applyingRemoteCollaborationStateRef = { current: true };

    syncCollaborationCanvasSnapshot({
      controller,
      currentSnapshot: { nodes: [createNode('n-2')], edges: [] },
      previousCollaborationCanvasRef,
      pendingCollaborationSnapshotRef: { current: null },
      collaborationFlushTimerRef: { current: null },
      applyingRemoteCollaborationStateRef,
    });

    expect(applyingRemoteCollaborationStateRef.current).toBe(false);
    expect(controller.submitLocalOperation).not.toHaveBeenCalled();
    expect(previousCollaborationCanvasRef.current).toEqual({
      nodes: [createNode('n-2')],
      edges: [],
    });
  });

  it('flushes non-drag structural changes immediately', () => {
    const controller = createController();
    const previousCollaborationCanvasRef = {
      current: { nodes: [createNode('n-1')], edges: [createEdge('e-1')] },
    };

    syncCollaborationCanvasSnapshot({
      controller,
      currentSnapshot: { nodes: [createNode('n-2')], edges: [createEdge('e-2')] },
      previousCollaborationCanvasRef,
      pendingCollaborationSnapshotRef: { current: { nodes: [createNode('pending')], edges: [] } },
      collaborationFlushTimerRef: { current: null },
      applyingRemoteCollaborationStateRef: { current: false },
    });

    expect(controller.submitLocalOperation).toHaveBeenCalledTimes(4);
    expect(previousCollaborationCanvasRef.current).toEqual({
      nodes: [createNode('n-2')],
      edges: [createEdge('e-2')],
    });
  });

  it('defers drag-heavy frames and flushes the latest pending snapshot once settled', () => {
    vi.useFakeTimers();

    const controller = createController();
    const previousCollaborationCanvasRef = {
      current: { nodes: [createNode('n-1')], edges: [] },
    };
    const pendingCollaborationSnapshotRef = { current: null };
    const collaborationFlushTimerRef = { current: null as number | null };

    syncCollaborationCanvasSnapshot({
      controller,
      currentSnapshot: { nodes: [createNode('n-2', { dragging: true })], edges: [] },
      previousCollaborationCanvasRef,
      pendingCollaborationSnapshotRef,
      collaborationFlushTimerRef,
      applyingRemoteCollaborationStateRef: { current: false },
    });

    expect(controller.submitLocalOperation).not.toHaveBeenCalled();
    expect(pendingCollaborationSnapshotRef.current).toEqual({
      nodes: [createNode('n-2', { dragging: true })],
      edges: [],
    });
    expect(collaborationFlushTimerRef.current).not.toBeNull();

    syncCollaborationCanvasSnapshot({
      controller,
      currentSnapshot: { nodes: [createNode('n-3', { dragging: true })], edges: [] },
      previousCollaborationCanvasRef,
      pendingCollaborationSnapshotRef,
      collaborationFlushTimerRef,
      applyingRemoteCollaborationStateRef: { current: false },
    });

    vi.advanceTimersByTime(90);

    expect(controller.submitLocalOperation).toHaveBeenCalledTimes(2);
    expect(previousCollaborationCanvasRef.current).toEqual({
      nodes: [createNode('n-3', { dragging: true })],
      edges: [],
    });
    expect(pendingCollaborationSnapshotRef.current).toBeNull();
    expect(collaborationFlushTimerRef.current).toBeNull();
  });
});

describe('registerCollaborationPointerTracking', () => {
  it('publishes normalized cursor coordinates inside the editor surface', () => {
    const updateLocalPresenceCursor = vi.fn();
    const controllerRef = {
      current: createController({
        updateLocalPresenceCursor,
      }),
    };
    const editorSurface = document.createElement('div');
    vi.spyOn(editorSurface, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 40,
      width: 500,
      height: 400,
      right: 600,
      bottom: 440,
      x: 100,
      y: 40,
      toJSON: () => ({}),
    });
    const cleanup = registerCollaborationPointerTracking({
      editorSurfaceRef: { current: editorSurface },
      collaborationControllerRef: controllerRef,
    });

    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });

    window.dispatchEvent(new PointerEvent('pointermove', {
      clientX: 260,
      clientY: 190,
    }));

    expect(rafSpy).toHaveBeenCalledTimes(1);
    expect(updateLocalPresenceCursor).toHaveBeenCalledWith(160, 150);

    cleanup();
    rafSpy.mockRestore();
  });

  it('suppresses out-of-bounds and tiny-jitter pointer updates', () => {
    const updateLocalPresenceCursor = vi.fn();
    const controllerRef = {
      current: createController({
        updateLocalPresenceCursor,
      }),
    };
    const editorSurface = document.createElement('div');
    vi.spyOn(editorSurface, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 40,
      width: 500,
      height: 400,
      right: 600,
      bottom: 440,
      x: 100,
      y: 40,
      toJSON: () => ({}),
    });
    const cleanup = registerCollaborationPointerTracking({
      editorSurfaceRef: { current: editorSurface },
      collaborationControllerRef: controllerRef,
    });

    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });

    window.dispatchEvent(new PointerEvent('pointermove', {
      clientX: 260,
      clientY: 190,
    }));
    window.dispatchEvent(new PointerEvent('pointermove', {
      clientX: 263,
      clientY: 194,
    }));
    window.dispatchEvent(new PointerEvent('pointermove', {
      clientX: 40,
      clientY: 190,
    }));

    expect(updateLocalPresenceCursor).toHaveBeenCalledTimes(1);
    expect(rafSpy).toHaveBeenCalledTimes(1);

    cleanup();
    rafSpy.mockRestore();
  });
});
