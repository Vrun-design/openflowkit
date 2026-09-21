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
  const onReorder = vi.fn();
  const onToggleLock = vi.fn();
  const clipboard = { onGroup: vi.fn(), onUngroup: vi.fn(), onCut: vi.fn(), onCopy: vi.fn(), onPaste: vi.fn(), onCopyStyle: vi.fn(), onPasteStyle: vi.fn() };
  const arrange = { onAlign: vi.fn(), onDistribute: vi.fn(), onFlip: vi.fn(), onZoomToSelection: vi.fn(), onTextStyle: vi.fn() };
  const { result } = renderHook(() => useV2Keyboard({
    onReorder, onToggleLock, ...clipboard, ...arrange,
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
  return { key, onToolChange, onTypeToEdit, onFitView, onResetZoom, onZoomStep, onSpacePan, onReorder, onToggleLock, ...clipboard, ...arrange };
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
  it('] / [ reorder ahead of type-to-edit, ⌘L toggles lock', () => {
    const { key, onReorder, onToggleLock, onTypeToEdit } = setup();
    key({ key: ']' });
    key({ key: '[' });
    expect(onReorder.mock.calls).toEqual([['front'], ['back']]);
    expect(onTypeToEdit).not.toHaveBeenCalled();
    key({ key: 'l', metaKey: true });
    expect(onToggleLock).toHaveBeenCalledOnce();
  });

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

describe('useV2Keyboard edit shortcuts', () => {
  it('⌘X/C/V clipboard, ⌘⌥C/V style, ⌘B/I/U text style', () => {
    const t = setup();
    key(t, { key: 'x', metaKey: true }); key(t, { key: 'c', metaKey: true }); key(t, { key: 'v', metaKey: true });
    expect([t.onCut, t.onCopy, t.onPaste].map((fn) => fn.mock.calls.length)).toEqual([1, 1, 1]);
    key(t, { key: 'ç', code: 'KeyC', metaKey: true, altKey: true });
    key(t, { key: '√', code: 'KeyV', metaKey: true, altKey: true });
    expect(t.onCopyStyle).toHaveBeenCalledOnce();
    expect(t.onPasteStyle).toHaveBeenCalledOnce();
    key(t, { key: 'b', metaKey: true });
    expect(t.onTextStyle).toHaveBeenCalledWith('bold');
    key(t, { key: 'g', metaKey: true });
    key(t, { key: 'G', metaKey: true, shiftKey: true });
    expect(t.onGroup).toHaveBeenCalledOnce();
    expect(t.onUngroup).toHaveBeenCalledOnce();
    expect(t.onTypeToEdit).not.toHaveBeenCalled();
  });

  it('⌘] steps, ⌘⌥] jumps; ⌥ letters align, ⌥⇧ distribute, ⇧H/V flip, ⇧1/⇧2 zoom', () => {
    const t = setup(vi.fn(() => false));
    key(t, { key: ']', code: 'BracketRight', metaKey: true });
    key(t, { key: '[', code: 'BracketLeft', metaKey: true, altKey: true });
    expect(t.onReorder.mock.calls).toEqual([['forward'], ['back']]);
    key(t, { key: 'å', code: 'KeyA', altKey: true });
    key(t, { key: '√', code: 'KeyV', altKey: true });
    expect(t.onAlign.mock.calls).toEqual([['left'], ['center-y']]);
    key(t, { key: 'Ó', code: 'KeyH', altKey: true, shiftKey: true });
    expect(t.onDistribute).toHaveBeenCalledWith('horizontal');
    key(t, { key: 'H', code: 'KeyH', shiftKey: true });
    key(t, { key: 'V', code: 'KeyV', shiftKey: true });
    expect(t.onFlip.mock.calls).toEqual([['horizontal'], ['vertical']]);
    key(t, { key: '!', code: 'Digit1', shiftKey: true });
    key(t, { key: '@', code: 'Digit2', shiftKey: true });
    expect(t.onFitView).toHaveBeenCalledOnce();
    expect(t.onZoomToSelection).toHaveBeenCalledOnce();
  });

  it('⇧H on a single selected shape types a capital letter instead of flipping', () => {
    const t = setup();
    key(t, { key: 'H', code: 'KeyH', shiftKey: true });
    expect(t.onTypeToEdit).toHaveBeenCalledWith('H');
    expect(t.onFlip).not.toHaveBeenCalled();
  });
});

function key(t: ReturnType<typeof setup>, init: Partial<KeyboardEvent<HTMLElement>>) {
  t.key({ code: '', ...init });
}
