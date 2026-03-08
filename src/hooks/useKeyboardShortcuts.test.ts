import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

vi.mock('@/config/rolloutFlags', () => ({
  ROLLOUT_FLAGS: {
    canvasInteractionsV1: true,
  },
}));

function renderShortcuts(overrides: Partial<Parameters<typeof useKeyboardShortcuts>[0]> = {}): void {
  const baseHandlers = {
    selectedNodeId: 'node-1',
    selectedEdgeId: null,
    selectedNodeType: 'process',
    deleteNode: vi.fn(),
    deleteEdge: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    duplicateNode: vi.fn(),
    selectAll: vi.fn(),
    onCommandBar: vi.fn(),
    onSearch: vi.fn(),
    onShortcutsHelp: vi.fn(),
    onFitView: vi.fn(),
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
  };
  renderHook(() => useKeyboardShortcuts({ ...baseHandlers, ...overrides }));
}

describe('useKeyboardShortcuts', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('triggers duplicate when Cmd/Ctrl+D is pressed outside editable fields', () => {
    const duplicateNode = vi.fn();
    renderShortcuts({ duplicateNode });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', ctrlKey: true }));

    expect(duplicateNode).toHaveBeenCalledWith('node-1');
  });

  it('does not trigger duplicate while focused in editable input', () => {
    const duplicateNode = vi.fn();
    renderShortcuts({ duplicateNode });
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', ctrlKey: true }));

    expect(duplicateNode).not.toHaveBeenCalled();
  });

  it('dispatches node label edit request when F2 is pressed with selected node', () => {
    renderShortcuts();
    const requestListener = vi.fn();
    window.addEventListener('flowmind:node-label-edit-request', requestListener as EventListener);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2' }));

    expect(requestListener).toHaveBeenCalledTimes(1);
    window.removeEventListener('flowmind:node-label-edit-request', requestListener as EventListener);
  });

  it('starts node label editing from the first typed printable character', () => {
    renderShortcuts();
    const requestListener = vi.fn();
    window.addEventListener('flowmind:node-label-edit-request', requestListener as EventListener);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));

    expect(requestListener).toHaveBeenCalledTimes(1);
    const [event] = requestListener.mock.calls[0] as [CustomEvent<{ seedText?: string; replaceExisting?: boolean }>];
    expect(event.detail.seedText).toBe('a');
    expect(event.detail.replaceExisting).toBe(true);
    window.removeEventListener('flowmind:node-label-edit-request', requestListener as EventListener);
  });

  it('triggers fit view on Shift+1', () => {
    const onFitView = vi.fn();
    renderShortcuts({ onFitView });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '!', code: 'Digit1', shiftKey: true }));

    expect(onFitView).toHaveBeenCalledTimes(1);
  });

  it('triggers zoom in on Cmd/Ctrl plus', () => {
    const onZoomIn = vi.fn();
    renderShortcuts({ onZoomIn });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '=', ctrlKey: true }));

    expect(onZoomIn).toHaveBeenCalledTimes(1);
  });

  it('triggers zoom out on Cmd/Ctrl minus', () => {
    const onZoomOut = vi.fn();
    renderShortcuts({ onZoomOut });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '-', ctrlKey: true }));

    expect(onZoomOut).toHaveBeenCalledTimes(1);
  });

  it('adds a mindmap child on Tab when a mindmap topic is selected', () => {
    const onAddMindmapChildShortcut = vi.fn();
    renderShortcuts({
      selectedNodeType: 'mindmap',
      onAddMindmapChildShortcut,
    });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));

    expect(onAddMindmapChildShortcut).toHaveBeenCalledTimes(1);
  });

  it('adds a mindmap sibling on Enter when a mindmap topic is selected', () => {
    const onAddMindmapSiblingShortcut = vi.fn();
    renderShortcuts({
      selectedNodeType: 'mindmap',
      onAddMindmapSiblingShortcut,
    });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(onAddMindmapSiblingShortcut).toHaveBeenCalledTimes(1);
  });

  it('deletes the selected edge on Delete', () => {
    const deleteEdge = vi.fn();
    renderShortcuts({
      selectedNodeId: null,
      selectedEdgeId: 'edge-1',
      deleteEdge,
    });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));

    expect(deleteEdge).toHaveBeenCalledWith('edge-1');
  });
});
