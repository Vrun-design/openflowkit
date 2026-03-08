import { describe, expect, it, vi } from 'vitest';
import type { CollaborationDocumentState, CollaborationOperationEnvelope, CollaborationPresenceState } from './types';
import type { CollaborationTransport } from './transport';
import { createInMemoryCollaborationTransport } from './transport';
import { createCollaborationSessionBootstrap } from './session';
import { createCollaborationRuntimeController } from './runtimeController';

vi.mock('@/config/rolloutFlags', () => ({
  ROLLOUT_FLAGS: {
    collaborationV1: true,
  },
}));

function createInitialState(): CollaborationDocumentState {
  return {
    roomId: 'room-1',
    version: 0,
    nodes: [],
    edges: [],
  };
}

describe('collaboration runtime controller', () => {
  it('propagates local operation to peer controller over in-memory transport', () => {
    const transportA = createInMemoryCollaborationTransport();
    const transportB = createInMemoryCollaborationTransport();
    const controllerA = createCollaborationRuntimeController({
      transport: transportA,
      session: createCollaborationSessionBootstrap({
        roomId: 'room-1',
        roomPassword: 'secret-1',
        clientId: 'client-a',
        name: 'A',
        color: '#111111',
      }),
      initialDocumentState: createInitialState(),
    });
    const controllerB = createCollaborationRuntimeController({
      transport: transportB,
      session: createCollaborationSessionBootstrap({
        roomId: 'room-1',
        roomPassword: 'secret-1',
        clientId: 'client-b',
        name: 'B',
        color: '#222222',
      }),
      initialDocumentState: createInitialState(),
    });

    controllerA.start();
    controllerB.start();

    const submitted = controllerA.submitLocalOperation({
      type: 'node.upsert',
      payload: {
        node: {
          id: 'n-1',
          type: 'process',
          position: { x: 10, y: 20 },
          data: { label: 'Node 1' },
        },
      },
    });

    expect(submitted).not.toBeNull();
    expect(controllerA.getDocumentState().nodes).toHaveLength(1);
    expect(controllerB.getDocumentState().nodes).toHaveLength(1);
  });

  it('applies stale incoming operation via rebase guard path', () => {
    let onEvent: ((event:
      { type: 'operation'; fromClientId: string; operation: CollaborationOperationEnvelope }
      | { type: 'presence_snapshot'; fromClientId: string; presence: CollaborationPresenceState[] }) => void) | null = null;
    const transport: CollaborationTransport = {
      connect: (_config, listener) => {
        onEvent = listener;
      },
      disconnect: vi.fn(),
      publishOperation: vi.fn(),
      publishPresence: vi.fn(),
    };
    const controller = createCollaborationRuntimeController({
      transport,
      session: createCollaborationSessionBootstrap({
        roomId: 'room-1',
        roomPassword: 'secret-1',
        clientId: 'client-a',
        name: 'A',
        color: '#111111',
      }),
      initialDocumentState: createInitialState(),
    });
    controller.start();

    controller.submitLocalOperation({
      type: 'node.upsert',
      payload: {
        node: {
          id: 'n-1',
          type: 'process',
          position: { x: 0, y: 0 },
          data: { label: 'Existing' },
        },
      },
    });
    expect(controller.getDocumentState().version).toBe(1);

    const staleOperation: CollaborationOperationEnvelope = {
      opId: 'remote-op-1',
      roomId: 'room-1',
      clientId: 'client-b',
      baseVersion: 0,
      timestamp: 2,
      type: 'node.upsert',
      payload: {
        node: {
          id: 'n-2',
          type: 'process',
          position: { x: 20, y: 20 },
          data: { label: 'Remote Node' },
        },
      },
    };
    onEvent?.({
      type: 'operation',
      fromClientId: 'client-b',
      operation: staleOperation,
    });

    expect(controller.getDocumentState().nodes.map((node) => node.id)).toEqual(['n-1', 'n-2']);
    expect(controller.getDocumentState().version).toBe(2);
  });

  it('updates local and remote presence state through transport', () => {
    const transportA = createInMemoryCollaborationTransport();
    const transportB = createInMemoryCollaborationTransport();
    const controllerA = createCollaborationRuntimeController({
      transport: transportA,
      session: createCollaborationSessionBootstrap({
        roomId: 'room-1',
        roomPassword: 'secret-1',
        clientId: 'client-a',
        name: 'A',
        color: '#111111',
      }),
      initialDocumentState: createInitialState(),
    });
    const controllerB = createCollaborationRuntimeController({
      transport: transportB,
      session: createCollaborationSessionBootstrap({
        roomId: 'room-1',
        roomPassword: 'secret-1',
        clientId: 'client-b',
        name: 'B',
        color: '#222222',
      }),
      initialDocumentState: createInitialState(),
    });
    controllerA.start();
    controllerB.start();

    controllerA.updateLocalPresenceCursor(120, 240);

    const bPresenceClientIds = controllerB.getPresenceState().map((presence) => presence.clientId);
    expect(bPresenceClientIds).toEqual(['client-a', 'client-b']);
  });

  it('removes disconnected peers from presence state after snapshot replacement', () => {
    const transportA = createInMemoryCollaborationTransport();
    const transportB = createInMemoryCollaborationTransport();
    const controllerA = createCollaborationRuntimeController({
      transport: transportA,
      session: createCollaborationSessionBootstrap({
        roomId: 'room-1',
        roomPassword: 'secret-1',
        clientId: 'client-a',
        name: 'A',
        color: '#111111',
      }),
      initialDocumentState: createInitialState(),
    });
    const controllerB = createCollaborationRuntimeController({
      transport: transportB,
      session: createCollaborationSessionBootstrap({
        roomId: 'room-1',
        roomPassword: 'secret-1',
        clientId: 'client-b',
        name: 'B',
        color: '#222222',
      }),
      initialDocumentState: createInitialState(),
    });

    controllerA.start();
    controllerB.start();
    expect(controllerA.getPresenceState().map((presence) => presence.clientId)).toEqual(['client-a', 'client-b']);

    controllerB.stop();

    expect(controllerA.getPresenceState().map((presence) => presence.clientId)).toEqual(['client-a']);
  });
});
