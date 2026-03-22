import { isCollaborationPresenceState } from './contracts';
import { createCollaborationRoomConfig } from './roomConfig';
import type { CollaborationPresenceState, CollaborationRoomConfig } from './types';

interface CollaborationSessionParams {
  roomId: string;
  roomPassword: string;
  clientId: string;
  name: string;
  color: string;
}

export interface CollaborationSessionBootstrap {
  enabled: boolean;
  room: CollaborationRoomConfig;
  localPresence: CollaborationPresenceState;
}

export function createLocalPresence(
  clientId: string,
  name: string,
  color: string
): CollaborationPresenceState {
  return {
    clientId,
    name,
    color,
    cursor: { x: 0, y: 0 },
    selectedNodeIds: [],
  };
}

export function createCollaborationSessionBootstrap(
  params: CollaborationSessionParams
): CollaborationSessionBootstrap {
  return {
    enabled: true,
    room: createCollaborationRoomConfig(params.roomId, params.clientId, params.roomPassword),
    localPresence: createLocalPresence(params.clientId, params.name, params.color),
  };
}

export function mapPresenceFromAwarenessState(
  value: unknown
): CollaborationPresenceState | null {
  if (!isCollaborationPresenceState(value)) {
    return null;
  }
  return value;
}

export function mergePresenceSnapshot(
  current: CollaborationPresenceState[],
  incoming: CollaborationPresenceState[]
): CollaborationPresenceState[] {
  const byClientId = new Map<string, CollaborationPresenceState>();
  for (const presence of current) {
    byClientId.set(presence.clientId, presence);
  }
  for (const presence of incoming) {
    byClientId.set(presence.clientId, presence);
  }
  return Array.from(byClientId.values()).sort((a, b) => a.clientId.localeCompare(b.clientId));
}

export function replacePresenceSnapshot(
  current: CollaborationPresenceState[],
  incoming: CollaborationPresenceState[],
  localPresence?: CollaborationPresenceState | null
): CollaborationPresenceState[] {
  const nextPresence = localPresence ? incoming.concat(localPresence) : incoming;
  return mergePresenceSnapshot([], nextPresence);
}
