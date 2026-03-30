import { describe, expect, it } from 'vitest';
import {
  buildTopNavParticipants,
  resolveCollaborationCacheState,
  resolveCollaborationCursorPosition,
  resolveInitialCollaborationCacheState,
  resolveLocalCollaborationClientId,
  resolveLocalCollaborationIdentity,
  resolveLocalCollaborationRoomSecret,
  shouldPublishCollaborationCursor,
} from '@/services/collaboration/hookUtils';
import { beforeEach } from 'vitest';

describe('resolveCollaborationCacheState', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('returns syncing only when indexeddb persistence is enabled and available at startup', () => {
    expect(resolveInitialCollaborationCacheState({
      indexedDbEnabled: true,
      indexedDbAvailable: true,
    })).toBe('syncing');

    expect(resolveInitialCollaborationCacheState({
      indexedDbEnabled: false,
      indexedDbAvailable: true,
    })).toBe('unavailable');
  });

  it('returns unavailable when indexeddb persistence is disabled or unavailable', () => {
    expect(resolveCollaborationCacheState({
      indexedDbEnabled: false,
      indexedDbAvailable: true,
      hasPersistedDocumentContent: false,
    })).toBe('unavailable');

    expect(resolveCollaborationCacheState({
      indexedDbEnabled: true,
      indexedDbAvailable: false,
      hasPersistedDocumentContent: true,
    })).toBe('unavailable');
  });

  it('returns hydrated when persisted document content exists', () => {
    expect(resolveCollaborationCacheState({
      indexedDbEnabled: true,
      indexedDbAvailable: true,
      hasPersistedDocumentContent: true,
    })).toBe('hydrated');
  });

  it('returns ready when indexeddb is enabled and available but no persisted content exists yet', () => {
    expect(resolveCollaborationCacheState({
      indexedDbEnabled: true,
      indexedDbAvailable: true,
      hasPersistedDocumentContent: false,
    })).toBe('ready');
  });

  it('normalizes remote cursor coordinates relative to the editor surface bounds', () => {
    expect(resolveCollaborationCursorPosition({
      clientX: 260,
      clientY: 190,
      bounds: {
        left: 100,
        top: 40,
        width: 500,
        height: 400,
      },
    })).toEqual({ x: 160, y: 150 });
  });

  it('suppresses cursor coordinates that land outside the editor surface', () => {
    expect(resolveCollaborationCursorPosition({
      clientX: 40,
      clientY: 190,
      bounds: {
        left: 100,
        top: 40,
        width: 500,
        height: 400,
      },
    })).toBeNull();
  });

  it('suppresses cursor publishes for tiny jitter inside the editor surface', () => {
    expect(shouldPublishCollaborationCursor({
      previous: { x: 100, y: 100 },
      next: { x: 103, y: 104 },
    })).toBe(false);

    expect(shouldPublishCollaborationCursor({
      previous: { x: 100, y: 100 },
      next: { x: 108, y: 106 },
    })).toBe(true);
  });

  it('formats and sorts top-nav collaboration participants with the local marker', () => {
    expect(buildTopNavParticipants([
      { clientId: 'b', name: 'Guest ED88', color: '#222', cursor: null },
      { clientId: 'a', name: 'Alpha', color: '#111', cursor: null },
    ], 'a')).toEqual([
      { clientId: 'a', name: 'You', color: '#111', isLocal: true },
      { clientId: 'b', name: 'Guest', color: '#222', isLocal: false },
    ]);
  });

  it('creates and reuses a session-scoped local collaboration client id', () => {
    const first = resolveLocalCollaborationClientId(true, 'room-a');
    const second = resolveLocalCollaborationClientId(true, 'room-a');

    expect(first).toBeTruthy();
    expect(second).toBe(first);
    expect(resolveLocalCollaborationClientId(false, 'room-a')).toBeNull();
  });

  it('creates and persists a local collaboration identity from the client id', () => {
    const identity = resolveLocalCollaborationIdentity('collab-client-1234');
    expect(identity.name).toBe('Guest');
    expect(identity.color).toBeTruthy();

    window.localStorage.setItem('flowmind:collab-identity-v1', JSON.stringify({
      name: 'Saved User',
      color: '#123456',
    }));
    expect(resolveLocalCollaborationIdentity('collab-client-9999')).toEqual({
      name: 'Saved User',
      color: '#123456',
    });
  });

  it('drops malformed persisted collaboration identities', () => {
    window.localStorage.setItem('flowmind:collab-identity-v1', JSON.stringify({
      name: 42,
      color: null,
    }));

    const identity = resolveLocalCollaborationIdentity('collab-client-bad');

    expect(identity.name).toBe('Guest');
    expect(identity.color).toBeTruthy();
    expect(window.localStorage.getItem('flowmind:collab-identity-v1')).toContain('"Guest"');
  });

  it('resolves room secrets from url, session storage, or room id fallback', () => {
    expect(resolveLocalCollaborationRoomSecret({
      collaborationEnabled: false,
      roomId: 'room-a',
      roomSecretFromUrl: null,
      shouldWriteToUrl: false,
    })).toBeNull();

    expect(resolveLocalCollaborationRoomSecret({
      collaborationEnabled: true,
      roomId: 'room-a',
      roomSecretFromUrl: 'secret-a',
      shouldWriteToUrl: true,
    })).toBe('secret-a');

    expect(resolveLocalCollaborationRoomSecret({
      collaborationEnabled: true,
      roomId: 'room-a',
      roomSecretFromUrl: null,
      shouldWriteToUrl: true,
    })).toBe('secret-a');

    expect(resolveLocalCollaborationRoomSecret({
      collaborationEnabled: true,
      roomId: 'room-b',
      roomSecretFromUrl: null,
      shouldWriteToUrl: false,
    })).toBe('room-b');
  });
});
