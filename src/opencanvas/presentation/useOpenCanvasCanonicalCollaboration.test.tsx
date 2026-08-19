import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { createTestDocument, createTestNode } from '../testing/builders/documentBuilder';
import { useOpenCanvasCanonicalCollaboration } from './useOpenCanvasCanonicalCollaboration';

vi.mock('@/config/rolloutFlags', () => ({
  ROLLOUT_FLAGS: { collaborationEnabled: true, openCanvasCanonicalCollaboration: true },
}));
vi.mock('@/services/collaboration/hookUtils', () => ({
  resolveLocalCollaborationClientId: () => 'client-a',
  resolveLocalCollaborationIdentity: () => ({ name: 'A', color: '#123456' }),
  resolveLocalCollaborationRoomSecret: () => 'secret',
}));

describe('OpenCanvas canonical collaboration hook', () => {
  it('starts a flagged session and projects a local canonical command', () => {
    const document = createTestDocument({ nodes: [createTestNode('node-1')] });
    const before = document.pages[0].nodes[0];
    const onBeforeLocalApply = vi.fn();
    const onDocumentChange = vi.fn();
    const { result, unmount } = renderHook(() => useOpenCanvasCanonicalCollaboration({
      document,
      pageId: 'page-1',
      onBeforeLocalApply,
      onDocumentChange,
      onConflict: vi.fn(),
    }), {
      wrapper: ({ children }) => <MemoryRouter initialEntries={['/?room=room-a']}>{children}</MemoryRouter>,
    });

    expect(result.current.running).toBe(true);
    act(() => {
      expect(result.current.submit({
        kind: 'set-node', id: 'rename', label: 'Rename', pageId: 'page-1', before,
        after: { ...before, content: { label: 'Collaborative' } },
      })).toBe(true);
    });
    expect(onBeforeLocalApply).toHaveBeenCalledTimes(1);
    expect(onDocumentChange.mock.calls[0][0].pages[0].nodes[0].content.label).toBe('Collaborative');
    unmount();
  });
});
