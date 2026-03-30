import { afterEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import type { CollaborationOperationEnvelope, CollaborationPresenceState } from './types';
import { createYjsPeerCollaborationTransport, isPeerCollaborationSupported } from './yjsPeerTransport';

interface AwarenessChangeEvent {
  added: number[];
  updated: number[];
  removed?: number[];
}

type AwarenessListener = (event: AwarenessChangeEvent) => void;

class FakeAwareness {
  private listeners = new Set<AwarenessListener>();
  private states = new Map<number, unknown>();
  private localClientKey = 1;

  public on(event: 'change', listener: AwarenessListener): void {
    if (event !== 'change') {
      return;
    }
    this.listeners.add(listener);
  }

  public off(event: 'change', listener: AwarenessListener): void {
    if (event !== 'change') {
      return;
    }
    this.listeners.delete(listener);
  }

  public setLocalStateField(field: string, value: unknown): void {
    const current = this.states.get(this.localClientKey);
    const nextState = typeof current === 'object' && current !== null
      ? { ...(current as Record<string, unknown>), [field]: value }
      : { [field]: value };
    this.states.set(this.localClientKey, nextState);
    this.emit({ added: [], updated: [this.localClientKey] });
  }

  public getStates(): Map<number, unknown> {
    return this.states;
  }

  public upsertRemoteState(clientKey: number, value: unknown): void {
    const hasExisting = this.states.has(clientKey);
    this.states.set(clientKey, value);
    this.emit({
      added: hasExisting ? [] : [clientKey],
      updated: hasExisting ? [clientKey] : [],
    });
  }

  public removeRemoteState(clientKey: number): void {
    this.states.delete(clientKey);
    this.emit({
      added: [],
      updated: [],
      removed: [clientKey],
    });
  }

  private emit(event: AwarenessChangeEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

interface HubPeer {
  doc: Y.Doc;
}

class FakeYjsRoomHub {
  private readonly peersByRoomId = new Map<string, Set<HubPeer>>();

  public connect(roomId: string, doc: Y.Doc): () => void {
    let peers = this.peersByRoomId.get(roomId);
    if (!peers) {
      peers = new Set<HubPeer>();
      this.peersByRoomId.set(roomId, peers);
    }

    const newPeer: HubPeer = { doc };
    for (const existingPeer of peers) {
      const update = Y.encodeStateAsUpdate(existingPeer.doc);
      Y.applyUpdate(doc, update);
    }
    peers.add(newPeer);

    const onDocUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === roomId) {
        return;
      }
      for (const peer of peers) {
        if (peer === newPeer) {
          continue;
        }
        Y.applyUpdate(peer.doc, update, roomId);
      }
    };
    doc.on('update', onDocUpdate);

    return () => {
      doc.off('update', onDocUpdate);
      peers?.delete(newPeer);
      if (peers && peers.size === 0) {
        this.peersByRoomId.delete(roomId);
      }
    };
  }
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
    color: '#10b981',
    cursor: { x: 10, y: 20 },
  };
}

describe('yjs peer collaboration transport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requires both websocket signaling and WebRTC runtime support', () => {
    vi.stubGlobal('window', {});
    expect(isPeerCollaborationSupported()).toBe(false);

    vi.stubGlobal('window', {
      WebSocket: class FakeWebSocket {},
      RTCPeerConnection: class FakeRtcPeerConnection {},
    });
    expect(isPeerCollaborationSupported()).toBe(true);
  });

  it('emits remote operations and ignores local operations', () => {
    const awareness = new FakeAwareness();
    const providerDestroy = vi.fn();
    let connectedDoc: Y.Doc | null = null;

    const transport = createYjsPeerCollaborationTransport({
      createProvider: (_roomId, doc) => {
        connectedDoc = doc;
        return {
          awareness,
          destroy: providerDestroy,
        };
      },
    });

    const listener = vi.fn();
    transport.connect({ roomId: 'room-1', clientId: 'client-a', signalingServers: [], password: 'secret-1' }, listener);
    transport.publishOperation(createOperation('client-a'));
    expect(listener).toHaveBeenCalledTimes(0);

    const operations = connectedDoc?.getArray('operations');
    operations?.push([createOperation('client-b')]);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].type).toBe('operation');
    expect(listener.mock.calls[0][0].fromClientId).toBe('client-b');

    transport.disconnect();
    expect(providerDestroy).toHaveBeenCalledTimes(1);
  });

  it('emits remote presence snapshots and ignores local presence updates', () => {
    const awareness = new FakeAwareness();
    const transport = createYjsPeerCollaborationTransport({
      createProvider: () => ({
        awareness,
        destroy: vi.fn(),
      }),
    });

    const listener = vi.fn();
    transport.connect({ roomId: 'room-1', clientId: 'client-a', signalingServers: [], password: 'secret-1' }, listener);

    transport.publishPresence(createPresence('client-a'));
    expect(listener).toHaveBeenCalledTimes(0);

    awareness.upsertRemoteState(2, { presence: createPresence('client-b') });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].type).toBe('presence_snapshot');
    expect(listener.mock.calls[0][0].fromClientId).toBe('client-b');
    expect(listener.mock.calls[0][0].presence).toEqual([createPresence('client-b')]);

    transport.disconnect();
  });

  it('emits empty presence snapshot when remote presence is removed', () => {
    const awareness = new FakeAwareness();
    const transport = createYjsPeerCollaborationTransport({
      createProvider: () => ({
        awareness,
        destroy: vi.fn(),
      }),
    });

    const listener = vi.fn();
    transport.connect({ roomId: 'room-1', clientId: 'client-a', signalingServers: [], password: 'secret-1' }, listener);

    awareness.upsertRemoteState(2, { presence: createPresence('client-b') });
    listener.mockClear();
    awareness.removeRemoteState(2);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].type).toBe('presence_snapshot');
    expect(listener.mock.calls[0][0].presence).toEqual([]);
  });

  it('syncs operations between two realtime transports in the same room', () => {
    const hub = new FakeYjsRoomHub();

    const transportA = createYjsPeerCollaborationTransport({
      createProvider: (roomId, doc) => {
        const awareness = new FakeAwareness();
        const disconnect = hub.connect(roomId, doc);
        return { awareness, destroy: disconnect };
      },
    });
    const transportB = createYjsPeerCollaborationTransport({
      createProvider: (roomId, doc) => {
        const awareness = new FakeAwareness();
        const disconnect = hub.connect(roomId, doc);
        return { awareness, destroy: disconnect };
      },
    });

    const listenerA = vi.fn();
    const listenerB = vi.fn();
    transportA.connect({ roomId: 'room-1', clientId: 'client-a', signalingServers: [], password: 'secret-1' }, listenerA);
    transportB.connect({ roomId: 'room-1', clientId: 'client-b', signalingServers: [], password: 'secret-1' }, listenerB);

    transportA.publishOperation(createOperation('client-a'));
    expect(listenerA).toHaveBeenCalledTimes(0);
    expect(listenerB).toHaveBeenCalledTimes(1);
    expect(listenerB.mock.calls[0][0].type).toBe('operation');
    expect(listenerB.mock.calls[0][0].fromClientId).toBe('client-a');

    transportA.disconnect();
    transportB.disconnect();
  });

  it('replays existing operation history when a peer joins late', () => {
    const hub = new FakeYjsRoomHub();

    const transportA = createYjsPeerCollaborationTransport({
      createProvider: (roomId, doc) => {
        const awareness = new FakeAwareness();
        const disconnect = hub.connect(roomId, doc);
        return { awareness, destroy: disconnect };
      },
    });
    const transportB = createYjsPeerCollaborationTransport({
      createProvider: (roomId, doc) => {
        const awareness = new FakeAwareness();
        const disconnect = hub.connect(roomId, doc);
        return { awareness, destroy: disconnect };
      },
    });

    const listenerA = vi.fn();
    transportA.connect({ roomId: 'room-1', clientId: 'client-a', signalingServers: [], password: 'secret-1' }, listenerA);
    transportA.publishOperation(createOperation('client-a'));

    const listenerB = vi.fn();
    transportB.connect({ roomId: 'room-1', clientId: 'client-b', signalingServers: [], password: 'secret-1' }, listenerB);

    expect(listenerB).toHaveBeenCalledTimes(1);
    expect(listenerB.mock.calls[0][0].type).toBe('operation');
    expect(listenerB.mock.calls[0][0].fromClientId).toBe('client-a');

    transportA.disconnect();
    transportB.disconnect();
  });

  it('compacts an oversized operation log to the latest canvas state', () => {
    let connectedDoc: Y.Doc | null = null;
    const transport = createYjsPeerCollaborationTransport({
      createProvider: (_roomId, doc) => {
        connectedDoc = doc;
        return {
          awareness: new FakeAwareness(),
          destroy: vi.fn(),
        };
      },
    });

    transport.connect({ roomId: 'room-1', clientId: 'client-a', signalingServers: [], password: 'secret-1' }, vi.fn());

    for (let index = 0; index < 130; index += 1) {
      const nodeId = `n-${index % 4}`;
      transport.publishOperation({
        opId: `op-${index}`,
        roomId: 'room-1',
        clientId: 'client-a',
        baseVersion: index,
        timestamp: index,
        type: 'node.upsert',
        payload: {
          node: {
            id: nodeId,
            type: 'process',
            position: { x: index, y: index },
            data: { label: `Node ${nodeId} v${index}` },
          },
        },
      });
    }

    const operations = connectedDoc?.getArray('operations').toArray() ?? [];
    expect(operations.length).toBeLessThan(20);
    expect((operations[0] as CollaborationOperationEnvelope).clientId).toBe('system:compaction');

    transport.disconnect();
  });

  it('waits for IndexedDB persistence sync before reporting ready and destroys persistence on disconnect', async () => {
    const awareness = new FakeAwareness();
    let resolvePersistence: (() => void) | null = null;
    const persistenceDestroy = vi.fn();
    const transport = createYjsPeerCollaborationTransport({
      createProvider: () => ({
        awareness,
        destroy: vi.fn(),
      }),
      createPersistence: () => ({
        whenSynced: new Promise<void>((resolve) => {
          resolvePersistence = resolve;
        }),
        destroy: persistenceDestroy,
      }),
    });

    transport.connect({ roomId: 'room-1', clientId: 'client-a', signalingServers: [], password: 'secret-1' }, vi.fn());

    let ready = false;
    const readyPromise = transport.whenReady?.().then(() => {
      ready = true;
    });
    await Promise.resolve();
    expect(ready).toBe(false);

    resolvePersistence?.();
    await readyPromise;
    expect(ready).toBe(true);

    transport.disconnect();
    expect(persistenceDestroy).toHaveBeenCalledTimes(1);
  });

  it('passes the room password to the WebRTC provider options', () => {
    const createProvider = vi.fn(() => ({
      awareness: new FakeAwareness(),
      destroy: vi.fn(),
    }));

    const transport = createYjsPeerCollaborationTransport({
      createProvider,
    });

    transport.connect({ roomId: 'room-1', clientId: 'client-a', signalingServers: ['wss://signal.example'], password: 'shared-secret' }, vi.fn());

    expect(createProvider).toHaveBeenCalledWith(
      'room-1',
      expect.any(Y.Doc),
      {
        signaling: ['wss://signal.example'],
        password: 'shared-secret',
      }
    );
  });
});
