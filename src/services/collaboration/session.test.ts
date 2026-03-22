import { describe, expect, it, vi } from 'vitest';
import {
  createCollaborationSessionBootstrap,
  createLocalPresence,
  mapPresenceFromAwarenessState,
  mergePresenceSnapshot,
  replacePresenceSnapshot,
} from './session';

vi.mock('@/config/rolloutFlags', () => ({
  ROLLOUT_FLAGS: {
    collaborationV1: true,
  },
}));

describe('collaboration session bootstrap', () => {
  it('creates room + local presence bootstrap shell', () => {
    const result = createCollaborationSessionBootstrap({
      roomId: 'room-1',
      roomPassword: 'secret-1',
      clientId: 'client-1',
      name: 'Varun',
      color: '#6366f1',
    });

    expect(result.enabled).toBe(true);
    expect(result.room.roomId).toBe('room-1');
    expect(result.room.password).toBe('secret-1');
    expect(result.room.signalingServers).toEqual(['wss://signaling.yjs.dev']);
    expect(result.localPresence).toEqual({
      clientId: 'client-1',
      name: 'Varun',
      color: '#6366f1',
      cursor: { x: 0, y: 0 },
      selectedNodeIds: [],
    });
  });

  it('maps valid awareness payload to typed presence', () => {
    const result = mapPresenceFromAwarenessState({
      clientId: 'client-2',
      name: 'User 2',
      color: '#22c55e',
      cursor: { x: 20, y: 40 },
    });
    expect(result?.clientId).toBe('client-2');
  });

  it('rejects invalid awareness payload', () => {
    const result = mapPresenceFromAwarenessState({
      clientId: 'client-2',
      name: 'User 2',
      color: '#22c55e',
      cursor: { x: '20', y: 40 },
    });
    expect(result).toBeNull();
  });

  it('merges and sorts presence snapshot deterministically', () => {
    const current = [
      createLocalPresence('client-b', 'B', '#111111'),
      createLocalPresence('client-a', 'A', '#222222'),
    ];
    const incoming = [createLocalPresence('client-c', 'C', '#333333')];

    const merged = mergePresenceSnapshot(current, incoming);
    expect(merged.map((presence) => presence.clientId)).toEqual(['client-a', 'client-b', 'client-c']);
  });

  it('replaces presence snapshot and preserves explicit local presence only', () => {
    const current = [
      createLocalPresence('client-a', 'A', '#222222'),
      createLocalPresence('client-b', 'B', '#111111'),
    ];
    const incoming = [createLocalPresence('client-c', 'C', '#333333')];

    const replaced = replacePresenceSnapshot(current, incoming, current[0]);
    expect(replaced.map((presence) => presence.clientId)).toEqual(['client-a', 'client-c']);
  });
});
