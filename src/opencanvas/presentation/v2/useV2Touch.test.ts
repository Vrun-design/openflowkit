import { act, renderHook } from '@testing-library/react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DOUBLE_TAP_MS, LONG_PRESS_MS, isDoubleTap, useV2Touch } from './useV2Touch';

function setup() {
  const section = document.createElement('section');
  section.setPointerCapture = vi.fn();
  const cameraRef = { current: { x: 0, y: 0, zoom: 1 } };
  const updateCamera = vi.fn((camera: { x: number; y: number; zoom: number }) => { cameraRef.current = camera; });
  const abandonOperation = vi.fn(() => true);
  const { result } = renderHook(() => useV2Touch({ current: { cameraRef, updateCamera } }, abandonOperation));
  const touch = (pointerId: number, x: number, y: number, timeStamp = 0): ReactPointerEvent<HTMLElement> =>
    ({ currentTarget: section, pointerId, pointerType: 'touch', clientX: x, clientY: y, timeStamp }) as unknown as ReactPointerEvent<HTMLElement>;
  return { result, section, cameraRef, updateCamera, abandonOperation, touch };
}

describe('touch gestures', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('recognises a double-tap only when close in time and space', () => {
    const first = { at: { x: 10, y: 10 }, time: 0 };
    expect(isDoubleTap(null, first)).toBe(false);
    expect(isDoubleTap(first, { at: { x: 20, y: 10 }, time: DOUBLE_TAP_MS })).toBe(true);
    expect(isDoubleTap(first, { at: { x: 20, y: 10 }, time: DOUBLE_TAP_MS + 1 })).toBe(false);
    expect(isDoubleTap(first, { at: { x: 40, y: 10 }, time: 100 })).toBe(false);
  });

  it('second finger abandons the drag and pinches the camera; the release is not a tap', () => {
    const { result, touch, abandonOperation, cameraRef } = setup();
    act(() => { expect(result.current.beginTouch(touch(1, 100, 100))).toBe(true); });
    act(() => { expect(result.current.beginTouch(touch(2, 200, 100))).toBe(false); });
    expect(abandonOperation).toHaveBeenCalledOnce();
    act(() => { expect(result.current.moveTouch(touch(2, 300, 100))).toBe(true); });
    expect(cameraRef.current.zoom).toBe(2);
    act(() => { expect(result.current.endTouch(touch(2, 300, 100))).toBeNull(); });
    act(() => { expect(result.current.endTouch(touch(1, 100, 100, 50))).toBeNull(); });
  });

  it('two quick still taps make a double-tap; a slid finger does not', () => {
    const { result, touch } = setup();
    act(() => result.current.beginTouch(touch(1, 50, 50)));
    act(() => { expect(result.current.endTouch(touch(1, 50, 50, 0))).toBeNull(); });
    act(() => result.current.beginTouch(touch(1, 55, 50)));
    act(() => { expect(result.current.endTouch(touch(1, 55, 50, 200))).toEqual({ at: { x: 55, y: 50 }, time: 200 }); });
    act(() => result.current.beginTouch(touch(1, 50, 50)));
    act(() => { expect(result.current.endTouch(touch(1, 50, 50, 300))).toBeNull(); });
    act(() => result.current.beginTouch(touch(1, 50, 50)));
    act(() => result.current.moveTouch(touch(1, 80, 50)));
    act(() => { expect(result.current.endTouch(touch(1, 80, 50, 400))).toBeNull(); });
  });

  it('a still press opens the context menu and swallows the release', () => {
    const { result, touch, section, abandonOperation } = setup();
    const onContextMenu = vi.fn((event: MouseEvent) => event.preventDefault());
    section.addEventListener('contextmenu', onContextMenu);
    act(() => result.current.beginTouch(touch(1, 10, 10)));
    act(() => { vi.advanceTimersByTime(LONG_PRESS_MS); });
    expect(abandonOperation).toHaveBeenCalledOnce();
    expect(onContextMenu).toHaveBeenCalledOnce();
    expect(onContextMenu.mock.calls[0][0].clientX).toBe(10);
    act(() => { expect(result.current.endTouch(touch(1, 10, 10, LONG_PRESS_MS))).toBeNull(); });
    // Moving before the timer fires cancels the press.
    act(() => result.current.beginTouch(touch(1, 10, 10)));
    act(() => result.current.moveTouch(touch(1, 30, 10)));
    act(() => { vi.advanceTimersByTime(LONG_PRESS_MS); });
    expect(onContextMenu).toHaveBeenCalledOnce();
  });
});
