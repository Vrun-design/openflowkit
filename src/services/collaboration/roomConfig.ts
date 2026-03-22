import type { CollaborationRoomConfig } from './types';

const SIGNALING_SERVER = import.meta.env.VITE_SIGNALING_SERVER as string | undefined;
const DEFAULT_SIGNALING_SERVERS = [SIGNALING_SERVER || 'wss://signaling.yjs.dev'];

export function createCollaborationRoomConfig(roomId: string, clientId: string, password: string): CollaborationRoomConfig {
  return {
    roomId,
    clientId,
    signalingServers: [...DEFAULT_SIGNALING_SERVERS],
    password,
  };
}
