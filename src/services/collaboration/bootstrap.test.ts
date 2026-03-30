import { describe, expect, it, vi } from 'vitest';
import { createCollaborationRuntimeBundle } from './bootstrap';

describe('collaboration bootstrap', () => {
  it('creates a runtime bundle with bridged controller callbacks', () => {
    const setNodes = vi.fn();
    const setEdges = vi.fn();
    const setCollaborationPresence = vi.fn();

    const bundle = createCollaborationRuntimeBundle({
      collaborationRoomId: 'room-1',
      collaborationRoomSecret: 'secret-1',
      clientId: 'client-a',
      localIdentity: {
        name: 'Alice',
        color: '#112233',
      },
      currentNodes: [],
      currentEdges: [],
      setNodes,
      setEdges,
      setCollaborationPresence,
    });

    expect(bundle.transportFactory.resolvedMode).toBeDefined();
    expect(bundle.runtimeController.isRunning()).toBe(false);

    bundle.runtimeController.start();
    expect(bundle.runtimeController.isRunning()).toBe(true);

    bundle.runtimeController.stop();
    expect(setCollaborationPresence).toHaveBeenCalled();
  });
});
