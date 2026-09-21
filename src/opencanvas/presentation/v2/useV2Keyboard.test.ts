import { renderHook } from '@testing-library/react';
import type { KeyboardEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useV2Keyboard } from './useV2Keyboard';

function setup(onTypeToEdit = vi.fn(() => true)) {
  const onToolChange = vi.fn();
  const onFitView = vi.fn();
  const onResetZoom = vi.fn();
  const onZoomStep = vi.fn();
  const onSpacePan = vi.fn();
  const { result } = renderHook(() => useV2Keyboard({
    toolRef: { current: 'select' }, editingRef: { current: false }, onToolChange,
    onUndo: vi.fn(), onRedo: vi.fn(), onDelete: vi.fn(), onDuplicate: vi.fn(), onEditPrimary: vi.fn(),
    onNudge: vi.fn(), onCancelGesture: () => false, onClearSelection: vi.fn(), onSelectAll: vi.fn(),
    onFitView, onZoomStep, onResetZoom, onToggleTree: vi.fn(),
    onToggleAgent: vi.fn(), onSpacePan, onTypeToEdit,
  }));
  const key = (init: Partial<KeyboardEvent<HTMLElement>>) => result.current({
    key: 'q', target: document.createElement('section'), preventDefault: vi.fn(),
    ...init,
  } as unknown as KeyboardEvent<HTMLElement>);
  return { key, onToolChange, onTypeToEdit, onFitView, onResetZoom, onZoomStep, onSpacePan };
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

describe('useV2Keyboard camera', () => {
  it('⌘0 fits, ⌘1 resets to 100 %, ⌘= / ⌘- step around the viewport centre', () => {
    const { key, onFitView, onResetZoom, onZoomStep } = setup(vi.fn(() => false));
    key({ key: '0', metaKey: true });
    expect(onFitView).toHaveBeenCalledOnce();
    key({ key: '1', metaKey: true });
    expect(onResetZoom).toHaveBeenCalledOnce();
    key({ key: '=', metaKey: true });
    expect(onZoomStep).toHaveBeenCalledWith(1.2);
    key({ key: '-', metaKey: true });
    expect(onZoomStep).toHaveBeenCalledWith(1 / 1.2);
  });

  it('space arms the hand tool and H switches to it', () => {
    const { key, onSpacePan, onToolChange } = setup(vi.fn(() => false));
    key({ key: ' ' });
    expect(onSpacePan).toHaveBeenCalledWith(true);
    key({ key: 'h' });
    expect(onToolChange).toHaveBeenCalledWith('hand');
  });
});
