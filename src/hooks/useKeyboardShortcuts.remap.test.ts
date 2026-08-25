import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/config/rolloutFlags', () => ({
  ROLLOUT_FLAGS: { openCanvasCustomShortcutsV1: true },
}));

import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import {
  DEFAULT_KEYBOARD_BINDINGS,
  saveKeyboardBindings,
} from '../services/keyboardBindings';

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
  };
  renderHook(() => useKeyboardShortcuts({ ...baseHandlers, ...overrides }));
}

describe('useKeyboardShortcuts with remappable bindings enabled', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
  });

  it('runs a command from its user-assigned chord', () => {
    saveKeyboardBindings({ ...DEFAULT_KEYBOARD_BINDINGS, commandBar: ['mod+shift+p'] });
    const onCommandBar = vi.fn();
    renderShortcuts({ onCommandBar });

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'p', code: 'KeyP', ctrlKey: true, shiftKey: true })
    );

    expect(onCommandBar).toHaveBeenCalledTimes(1);
  });

  it('stops running the command from the replaced default chord', () => {
    saveKeyboardBindings({ ...DEFAULT_KEYBOARD_BINDINGS, commandBar: ['mod+shift+p'] });
    const onCommandBar = vi.fn();
    renderShortcuts({ onCommandBar });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', code: 'KeyK', ctrlKey: true }));

    expect(onCommandBar).not.toHaveBeenCalled();
  });

  it('picks up a rebind made while the editor is mounted', () => {
    const onFitView = vi.fn();
    renderShortcuts({ onFitView });

    saveKeyboardBindings({ ...DEFAULT_KEYBOARD_BINDINGS, fitView: ['mod+alt+f'] });
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'f', code: 'KeyF', ctrlKey: true, altKey: true })
    );

    expect(onFitView).toHaveBeenCalledTimes(1);
  });

  it('keeps a corrupt override from disabling the command', () => {
    localStorage.setItem('openflowkit.keyboardBindings.v1', '{"commandBar": ["mod+shift"]}');
    const onCommandBar = vi.fn();
    renderShortcuts({ onCommandBar });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', code: 'KeyK', ctrlKey: true }));

    expect(onCommandBar).toHaveBeenCalledTimes(1);
  });

  it('never runs a bound command while typing in an editable field', () => {
    saveKeyboardBindings({ ...DEFAULT_KEYBOARD_BINDINGS, commandBar: ['mod+shift+p'] });
    const onCommandBar = vi.fn();
    renderShortcuts({ onCommandBar });

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'p',
        code: 'KeyP',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      })
    );

    expect(onCommandBar).not.toHaveBeenCalled();
  });
});
