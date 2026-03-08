import { describe, expect, it } from 'vitest';
import { buildCollaborationInviteUrl, resolveCollaborationRoomId } from './roomLink';

describe('collaboration room link', () => {
  it('uses room from URL when present', () => {
    const result = resolveCollaborationRoomId('?room=team-demo&secret=shared-secret', 'fallback-tab');
    expect(result).toEqual({
      roomId: 'team-demo',
      roomSecret: 'shared-secret',
      shouldWriteToUrl: false,
    });
  });

  it('falls back to tab room and requests URL sync when missing', () => {
    const result = resolveCollaborationRoomId('', 'fallback-tab');
    expect(result).toEqual({
      roomId: 'fallback-tab',
      roomSecret: null,
      shouldWriteToUrl: true,
    });
  });

  it('builds invite URL with room and secret params', () => {
    const inviteUrl = buildCollaborationInviteUrl('https://flowmind.ai/editor?foo=1', 'room-a', 'secret-a');
    expect(inviteUrl).toBe('https://flowmind.ai/editor?foo=1&room=room-a&secret=secret-a');
  });
});
