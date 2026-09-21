import { renderHook } from '@testing-library/react';
import type { KeyboardEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useV2Keyboard } from './useV2Keyboard';

function setup(onTypeToEdit = vi.fn(() => true)) {
  const onToolChange = vi.fn();
  const { result } = renderHook(() => useV2Keyboard({
    toolRef: { current: 'select' }, editingRef: { current: false }, onToolChange,
    onUndo: vi.fn(), onRedo: vi.fn(), onDelete: vi.fn(), onDuplicate: vi.fn(), onEditPrimary: vi.fn(),
    onNudge: vi.fn(), onCancelGesture: () => false, onClearSelection: vi.fn(), onSelectAll: vi.fn(),
    onFitView: vi.fn(), onZoomStep: vi.fn(), onResetZoom: vi.fn(), onToggleTree: vi.fn(),
    onToggleAgent: vi.fn(), onSpacePan: vi.fn(), onTypeToEdit,
  }));
  const key = (init: Partial<KeyboardEvent<HTMLElement>>) => result.current({
    key: 'q', target: document.createElement('section'), preventDefault: vi.fn(),
    ...init,
  } as unknown as KeyboardEvent<HTMLElement>);
  return { key, onToolChange, onTypeToEdit };
}

describe('useV2Keyboard type-to-edit', () => {
  it('a printable key with a single selection opens the editor with that character', () => {
    const { key, onTypeToEdit, onToolChange } = setup();
    key({ key: 'Q' });
    expect(onTypeToEdit).toHaveBeenCalledWith('Q');
    // Tool letters go to the editor too when something is selected.
    key({ key: 'r' });
    expect(onTypeToEdit).toHaveBeenLastCalledWith('r');
    expect(onToolChange).not.toHaveBeenCalled();
  });

  it('falls through to shortcuts when nothing editable is selected or a modifier is held', () => {
    const { key, onToolChange, onTypeToEdit } = setup(vi.fn(() => false));
    key({ key: 'r' });
    expect(onToolChange).toHaveBeenCalledWith('rectangle');
    key({ key: 'z', metaKey: true });
    expect(onTypeToEdit).toHaveBeenCalledTimes(1);
  });
});
