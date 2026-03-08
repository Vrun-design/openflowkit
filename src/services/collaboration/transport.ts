import type { CollaborationOperationEnvelope, CollaborationPresenceState, CollaborationRoomConfig } from './types';

type CollaborationEvent =
  | { type: 'operation'; fromClientId: string; operation: CollaborationOperationEnvelope }
  | { type: 'presence_snapshot'; fromClientId: string; presence: CollaborationPresenceState[] };

type CollaborationEventListener = (event: CollaborationEvent) => void;

interface CollaborationRoomHub {
  listeners: Map<string, CollaborationEventListener>;
  presenceByClientId: Map<string, CollaborationPresenceState>;
}

const ROOM_HUBS = new Map<string, CollaborationRoomHub>();

function getRoomHub(roomId: string): CollaborationRoomHub {
  const existing = ROOM_HUBS.get(roomId);
  if (existing) return existing;
  const created: CollaborationRoomHub = { listeners: new Map(), presenceByClientId: new Map() };
  ROOM_HUBS.set(roomId, created);
  return created;
}

export interface CollaborationTransport {
  connect: (config: CollaborationRoomConfig, onEvent: CollaborationEventListener) => void;
  disconnect: () => void;
  publishOperation: (operation: CollaborationOperationEnvelope) => void;
  publishPresence: (presence: CollaborationPresenceState) => void;
  whenReady?: () => Promise<void>;
  subscribeStatus?: (listener: (status: { connected: boolean; peerCount?: number; synced?: boolean }) => void) => () => void;
}

export function createInMemoryCollaborationTransport(): CollaborationTransport {
  let roomId: string | null = null;
  let clientId: string | null = null;

  function publish(event: CollaborationEvent): void {
    if (!roomId || !clientId) return;
    const hub = getRoomHub(roomId);
    for (const [listenerClientId, listener] of hub.listeners.entries()) {
      if (listenerClientId === clientId) continue;
      listener(event);
    }
  }

  return {
    connect: (config, onEvent) => {
      roomId = config.roomId;
      clientId = config.clientId;
      const hub = getRoomHub(config.roomId);
      hub.listeners.set(config.clientId, onEvent);
      const snapshot = Array.from(hub.presenceByClientId.values());
      if (snapshot.length > 0) {
        onEvent({
          type: 'presence_snapshot',
          fromClientId: config.clientId,
          presence: snapshot,
        });
      }
    },
    disconnect: () => {
      if (!roomId || !clientId) return;
      const hub = getRoomHub(roomId);
      hub.listeners.delete(clientId);
      hub.presenceByClientId.delete(clientId);
      const snapshot = Array.from(hub.presenceByClientId.values());
      for (const [listenerClientId, listener] of hub.listeners.entries()) {
        listener({
          type: 'presence_snapshot',
          fromClientId: listenerClientId,
          presence: snapshot,
        });
      }
      if (hub.listeners.size === 0) {
        ROOM_HUBS.delete(roomId);
      }
      roomId = null;
      clientId = null;
    },
    publishOperation: (operation) => {
      if (!clientId) return;
      publish({ type: 'operation', fromClientId: clientId, operation });
    },
    publishPresence: (presence) => {
      if (!clientId || !roomId) return;
      const hub = getRoomHub(roomId);
      hub.presenceByClientId.set(clientId, presence);
      const snapshot = Array.from(hub.presenceByClientId.values());
      publish({ type: 'presence_snapshot', fromClientId: clientId, presence: snapshot });
    },
    whenReady: () => Promise.resolve(),
  };
}
