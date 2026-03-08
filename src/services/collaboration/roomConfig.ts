import type { CollaborationRoomConfig } from './types';

const DEFAULT_SIGNALING_SERVERS = ['wss://signaling.yjs.dev'];

export function createCollaborationRoomConfig(roomId: string, clientId: string, password: string): CollaborationRoomConfig {
  return {
    roomId,
    clientId,
    signalingServers: [...DEFAULT_SIGNALING_SERVERS],
    password,
  };
}
