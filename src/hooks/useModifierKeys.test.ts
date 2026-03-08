import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { useModifierKeys } from './useModifierKeys';

describe('useModifierKeys', () => {
  it('treats Shift as a selection modifier', () => {
    const { result } = renderHook(() => useModifierKeys());

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', shiftKey: true }));
    });

    expect(result.current.isSelectionModifierPressed).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift', shiftKey: false }));
    });

    expect(result.current.isSelectionModifierPressed).toBe(false);
  });

  it('keeps the modifier state active when another selection modifier remains pressed', () => {
    const { result } = renderHook(() => useModifierKeys());

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Meta', metaKey: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', metaKey: true, shiftKey: true }));
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift', metaKey: true, shiftKey: false }));
    });

    expect(result.current.isSelectionModifierPressed).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Meta', metaKey: false }));
    });

    expect(result.current.isSelectionModifierPressed).toBe(false);
  });
});
