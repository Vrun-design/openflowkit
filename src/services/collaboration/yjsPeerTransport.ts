import { ROLLOUT_FLAGS } from '@/config/rolloutFlags';
import { isCollaborationOperationEnvelope } from './contracts';
import { mapPresenceFromAwarenessState } from './session';
import type { CollaborationOperationEnvelope, CollaborationPresenceState, CollaborationRoomConfig } from './types';
import type { CollaborationTransport } from './transport';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { WebrtcProvider } from 'y-webrtc';

interface AwarenessLike {
  on: (event: 'change', listener: AwarenessChangeListener) => void;
  off: (event: 'change', listener: AwarenessChangeListener) => void;
  setLocalStateField: (field: string, value: unknown) => void;
  getStates: () => Map<number, unknown>;
}

interface AwarenessChangeEvent {
  added: number[];
  updated: number[];
  removed?: number[];
}

type AwarenessChangeListener = (event: AwarenessChangeEvent) => void;

interface RealtimeProviderLike {
  awareness: AwarenessLike;
  destroy: () => void;
  on?: (event: string, listener: (event: unknown) => void) => void;
  off?: (event: string, listener: (event: unknown) => void) => void;
  connected?: boolean;
  synced?: boolean;
}

interface RealtimeProviderOptions {
  signaling: string[];
  password: string;
}

type RealtimeProviderFactory = (
  roomId: string,
  doc: Y.Doc,
  options: RealtimeProviderOptions
) => RealtimeProviderLike;

interface RealtimeTransportOptions {
  createProvider?: RealtimeProviderFactory;
  createDoc?: () => Y.Doc;
  createPersistence?: RealtimePersistenceFactory;
}

interface RealtimePersistenceLike {
  whenSynced: Promise<unknown>;
  destroy: () => Promise<void> | void;
}

type RealtimePersistenceFactory = (
  roomId: string,
  doc: Y.Doc
) => RealtimePersistenceLike;

interface YArrayDeltaInsert {
  insert?: unknown[];
}

interface YArrayChangeEvent {
  changes: {
    delta: YArrayDeltaInsert[];
  };
}

function createDefaultProvider(
  roomId: string,
  doc: Y.Doc,
  options: RealtimeProviderOptions
): RealtimeProviderLike {
  return new WebrtcProvider(roomId, doc, {
    signaling: options.signaling,
    password: options.password,
  });
}

export function isPeerCollaborationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof window.WebSocket === 'undefined') return false;
  if (typeof window.RTCPeerConnection === 'undefined') return false;
  return true;
}

export function createYjsPeerCollaborationTransport(
  options: RealtimeTransportOptions = {}
): CollaborationTransport {
  const createProvider = options.createProvider ?? createDefaultProvider;
  const createDoc = options.createDoc ?? (() => new Y.Doc());
  const createPersistence = options.createPersistence ?? (
    ROLLOUT_FLAGS.collaborationIndexedDbV1 && typeof indexedDB !== 'undefined'
      ? ((roomId: string, doc: Y.Doc) => new IndexeddbPersistence(`flowmind-collab:${roomId}`, doc))
      : null
  );

  let roomConfig: CollaborationRoomConfig | null = null;
  let provider: RealtimeProviderLike | null = null;
  let persistence: RealtimePersistenceLike | null = null;
  let doc: Y.Doc | null = null;
  let operationsArray: Y.Array<unknown> | null = null;
  let operationsListener: ((event: YArrayChangeEvent) => void) | null = null;
  let awarenessListener: AwarenessChangeListener | null = null;
  let docUpdateListener: (() => void) | null = null;
  let statusListener: ((event: unknown) => void) | null = null;
  let syncedListener: ((event: unknown) => void) | null = null;
  let peersListener: ((event: unknown) => void) | null = null;
  let seenOperationIds = new Set<string>();
  let lastPresenceSnapshotKey = '[]';
  let awarenessClientIdsByPeerId = new Map<number, string>();
  let readyPromise: Promise<void> = Promise.resolve();
  let latestStatus: { connected: boolean; peerCount?: number; synced?: boolean } = { connected: false };
  const statusSubscribers = new Set<(status: { connected: boolean; peerCount?: number; synced?: boolean }) => void>();

  function notifyStatus(): void {
    for (const subscriber of statusSubscribers) {
      subscriber(latestStatus);
    }
  }

  function setStatusPatch(patch: Partial<{ connected: boolean; peerCount?: number; synced?: boolean }>): void {
    latestStatus = {
      ...latestStatus,
      ...patch,
    };
    notifyStatus();
  }

  function emitOperationCandidate(
    candidate: unknown,
    config: CollaborationRoomConfig,
    onEvent: (event: { type: 'operation'; fromClientId: string; operation: CollaborationOperationEnvelope }) => void
  ): void {
    if (!isCollaborationOperationEnvelope(candidate)) {
      return;
    }
    if (candidate.clientId === config.clientId) {
      return;
    }
    if (seenOperationIds.has(candidate.opId)) {
      return;
    }
    seenOperationIds.add(candidate.opId);
    onEvent({
      type: 'operation',
      fromClientId: candidate.clientId,
      operation: candidate,
    });
  }

  function emitOperationArraySnapshot(
    config: CollaborationRoomConfig,
    onEvent: (event: { type: 'operation'; fromClientId: string; operation: CollaborationOperationEnvelope }) => void
  ): void {
    if (!operationsArray) {
      return;
    }
    for (const candidate of operationsArray.toArray()) {
      emitOperationCandidate(candidate, config, onEvent);
    }
  }

  function disconnect(): void {
    if (operationsArray && operationsListener) {
      operationsArray.unobserve(operationsListener as (event: unknown) => void);
    }
    if (doc && docUpdateListener) {
      doc.off('update', docUpdateListener);
    }
    if (provider && awarenessListener) {
      provider.awareness.off('change', awarenessListener);
    }
    if (provider && statusListener) {
      provider.off?.('status', statusListener);
    }
    if (provider && syncedListener) {
      provider.off?.('synced', syncedListener);
      provider.off?.('sync', syncedListener);
    }
    if (provider && peersListener) {
      provider.off?.('peers', peersListener);
    }
    if (provider) {
      provider.destroy();
    }
    if (persistence) {
      void persistence.destroy();
    }
    if (doc) {
      doc.destroy();
    }
    roomConfig = null;
    provider = null;
    persistence = null;
    doc = null;
    operationsArray = null;
    operationsListener = null;
    awarenessListener = null;
    docUpdateListener = null;
    statusListener = null;
    syncedListener = null;
    peersListener = null;
    seenOperationIds = new Set<string>();
    lastPresenceSnapshotKey = '[]';
    awarenessClientIdsByPeerId = new Map<number, string>();
    readyPromise = Promise.resolve();
    latestStatus = { connected: false };
    notifyStatus();
  }

  return {
    connect: (config, onEvent) => {
      disconnect();
      roomConfig = config;
      doc = createDoc();
      operationsArray = doc.getArray('operations');
      persistence = createPersistence ? createPersistence(config.roomId, doc) : null;
      provider = createProvider(config.roomId, doc, {
        signaling: config.signalingServers,
        password: config.password,
      });

      operationsListener = (event) => {
        const deltas = event.changes.delta;
        for (const delta of deltas) {
          if (!Array.isArray(delta.insert)) {
            continue;
          }
          for (const candidate of delta.insert) {
            emitOperationCandidate(candidate, config, onEvent);
          }
        }
      };
      operationsArray.observe(operationsListener as (event: unknown) => void);
      docUpdateListener = () => {
        emitOperationArraySnapshot(config, onEvent);
      };
      doc.on('update', docUpdateListener);
      emitOperationArraySnapshot(config, onEvent);
      readyPromise = persistence
        ? persistence.whenSynced
          .then(() => {
            emitOperationArraySnapshot(config, onEvent);
          })
          .catch(() => undefined)
        : Promise.resolve();

      statusListener = (event) => {
        const candidate = event as { connected?: unknown; status?: unknown };
        const connected = candidate.connected === true || candidate.status === 'connected';
        setStatusPatch({
          connected,
        });
      };
      syncedListener = (event) => {
        if (typeof event === 'boolean') {
          setStatusPatch({
            synced: event,
          });
          return;
        }
        const candidate = event as { synced?: unknown };
        if (typeof candidate.synced !== 'boolean') {
          return;
        }
        setStatusPatch({
          synced: candidate.synced,
        });
      };
      peersListener = (event) => {
        const candidate = event as { webrtcPeers?: unknown[]; bcPeers?: unknown[] };
        const webrtcPeerCount = Array.isArray(candidate.webrtcPeers) ? candidate.webrtcPeers.length : 0;
        const broadcastChannelPeerCount = Array.isArray(candidate.bcPeers) ? candidate.bcPeers.length : 0;
        const peerCount = webrtcPeerCount + broadcastChannelPeerCount;
        if (peerCount === 0 && !Array.isArray(candidate.webrtcPeers) && !Array.isArray(candidate.bcPeers)) {
          return;
        }
        setStatusPatch({
          peerCount,
        });
      };
      provider.on?.('status', statusListener);
      provider.on?.('synced', syncedListener);
      provider.on?.('sync', syncedListener);
      provider.on?.('peers', peersListener);
      // Seed status from provider state in case events fired before listeners were attached.
      if (typeof provider.connected === 'boolean') {
        setStatusPatch({ connected: provider.connected });
      }
      if (typeof provider.synced === 'boolean') {
        setStatusPatch({ synced: provider.synced });
      }

      awarenessListener = (event) => {
        const states = provider?.awareness.getStates();
        if (!states) {
          return;
        }
        const snapshot: CollaborationPresenceState[] = [];
        for (const [peerId, awarenessState] of states.entries()) {
          if (typeof awarenessState !== 'object' || awarenessState === null) {
            continue;
          }
          const rawPresence = (awarenessState as { presence?: unknown }).presence;
          const presence = mapPresenceFromAwarenessState(rawPresence);
          if (!presence || presence.clientId === config.clientId) {
            continue;
          }
          awarenessClientIdsByPeerId.set(peerId, presence.clientId);
          snapshot.push(presence);
        }
        let originClientId = config.clientId;
        for (const peerId of [...event.added, ...event.updated]) {
          const awarenessState = states.get(peerId);
          if (typeof awarenessState !== 'object' || awarenessState === null) {
            continue;
          }
          const rawPresence = (awarenessState as { presence?: unknown }).presence;
          const presence = mapPresenceFromAwarenessState(rawPresence);
          if (!presence || presence.clientId === config.clientId) {
            continue;
          }
          originClientId = presence.clientId;
          break;
        }
        if (originClientId === config.clientId && Array.isArray(event.removed)) {
          for (const peerId of event.removed) {
            const removedClientId = awarenessClientIdsByPeerId.get(peerId);
            awarenessClientIdsByPeerId.delete(peerId);
            if (!removedClientId || removedClientId === config.clientId) {
              continue;
            }
            originClientId = removedClientId;
            break;
          }
        }
        const sortedSnapshot = snapshot.sort((left, right) => left.clientId.localeCompare(right.clientId));
        const snapshotKey = JSON.stringify(sortedSnapshot);
        if (snapshotKey === lastPresenceSnapshotKey) {
          return;
        }
        lastPresenceSnapshotKey = snapshotKey;
        onEvent({
          type: 'presence_snapshot',
          fromClientId: originClientId,
          presence: sortedSnapshot,
        });
      };
      provider.awareness.on('change', awarenessListener);
    },
    disconnect,
    publishOperation: (operation: CollaborationOperationEnvelope) => {
      if (!operationsArray || !roomConfig) {
        return;
      }
      if (operation.roomId !== roomConfig.roomId) {
        return;
      }
      operationsArray.push([operation]);
    },
    publishPresence: (presence: CollaborationPresenceState) => {
      if (!provider || !roomConfig) {
        return;
      }
      if (presence.clientId !== roomConfig.clientId) {
        return;
      }
      provider.awareness.setLocalStateField('presence', presence);
    },
    subscribeStatus: (listener) => {
      statusSubscribers.add(listener);
      listener(latestStatus);
      return () => {
        statusSubscribers.delete(listener);
      };
    },
    whenReady: () => readyPromise,
  };
}
