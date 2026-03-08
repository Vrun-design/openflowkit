import { describe, expect, it, vi } from 'vitest';
import type { CollaborationOperationEnvelope, CollaborationPresenceState } from './types';
import { createInMemoryCollaborationTransport } from './transport';

function createRoomConfig(roomId: string, clientId: string) {
  return { roomId, clientId, signalingServers: [], password: 'secret-1' };
}

function createOperation(clientId: string): CollaborationOperationEnvelope {
  return {
    opId: `op-${clientId}`,
    roomId: 'room-1',
    clientId,
    baseVersion: 1,
    timestamp: 1,
    type: 'node.delete',
    payload: { nodeId: 'n-1' },
  };
}

function createPresence(clientId: string): CollaborationPresenceState {
  return {
    clientId,
    name: clientId,
    color: '#6366f1',
    cursor: { x: 10, y: 20 },
  };
}

describe('in-memory collaboration transport', () => {
  it('broadcasts operation events to peers in same room', () => {
    const a = createInMemoryCollaborationTransport();
    const b = createInMemoryCollaborationTransport();
    const listenerA = vi.fn();
    const listenerB = vi.fn();
    const roomId = 'room-operation-broadcast';

    a.connect(createRoomConfig(roomId, 'client-a'), listenerA);
    b.connect(createRoomConfig(roomId, 'client-b'), listenerB);

    a.publishOperation(createOperation('client-a'));

    expect(listenerA).toHaveBeenCalledTimes(0);
    expect(listenerB).toHaveBeenCalledTimes(1);
    expect(listenerB.mock.calls[0][0].type).toBe('operation');
  });

  it('broadcasts presence snapshots to peers in same room', () => {
    const a = createInMemoryCollaborationTransport();
    const b = createInMemoryCollaborationTransport();
    const listenerB = vi.fn();
    const roomId = 'room-presence-broadcast';

    a.connect(createRoomConfig(roomId, 'client-a'), vi.fn());
    b.connect(createRoomConfig(roomId, 'client-b'), listenerB);

    a.publishPresence(createPresence('client-a'));

    expect(listenerB).toHaveBeenCalledTimes(1);
    expect(listenerB.mock.calls[0][0].type).toBe('presence_snapshot');
    expect(listenerB.mock.calls[0][0].presence).toEqual([createPresence('client-a')]);
  });

  it('does not leak events across rooms and removes listeners on disconnect', () => {
    const a = createInMemoryCollaborationTransport();
    const b = createInMemoryCollaborationTransport();
    const c = createInMemoryCollaborationTransport();
    const listenerB = vi.fn();
    const listenerC = vi.fn();
    const roomId = 'room-isolation-a';
    const otherRoomId = 'room-isolation-b';

    a.connect(createRoomConfig(roomId, 'client-a'), vi.fn());
    b.connect(createRoomConfig(roomId, 'client-b'), listenerB);
    c.connect(createRoomConfig(otherRoomId, 'client-c'), listenerC);

    a.publishOperation(createOperation('client-a'));
    expect(listenerB).toHaveBeenCalledTimes(1);
    expect(listenerC).toHaveBeenCalledTimes(0);

    b.disconnect();
    a.publishOperation(createOperation('client-a'));
    expect(listenerB).toHaveBeenCalledTimes(1);
  });

  it('broadcasts presence removal snapshots when a peer disconnects', () => {
    const a = createInMemoryCollaborationTransport();
    const b = createInMemoryCollaborationTransport();
    const listenerA = vi.fn();
    const roomId = 'room-presence-removal';

    a.connect(createRoomConfig(roomId, 'client-a'), listenerA);
    b.connect(createRoomConfig(roomId, 'client-b'), vi.fn());
    a.publishPresence(createPresence('client-a'));
    listenerA.mockClear();

    b.publishPresence(createPresence('client-b'));
    listenerA.mockClear();

    b.disconnect();

    expect(listenerA).toHaveBeenCalledTimes(1);
    expect(listenerA.mock.calls[0][0].type).toBe('presence_snapshot');
    expect(listenerA.mock.calls[0][0].presence).toEqual([createPresence('client-a')]);
  });
});
