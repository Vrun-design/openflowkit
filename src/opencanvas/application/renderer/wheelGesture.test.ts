import { describe, expect, it } from 'vitest';
import { resolveWheelGesture } from './wheelGesture';

const VIEWPORT = { width: 800, height: 600 };

describe('wheel gesture classification', () => {
  it('routes browser pinch to zoom and small pixel deltas to trackpad pan', () => {
    expect(resolveWheelGesture({
      deltaX: 0, deltaY: -4, deltaMode: 0,
      ctrlKey: true, shiftKey: false, timeStamp: 10,
    }, null, VIEWPORT).mode).toBe('zoom');
    expect(resolveWheelGesture({
      deltaX: 0, deltaY: 12, deltaMode: 0,
      ctrlKey: false, shiftKey: false, timeStamp: 10,
    }, null, VIEWPORT)).toMatchObject({ mode: 'pan', panDelta: { x: 0, y: -12 } });
  });

  it('keeps gesture mode stable through larger momentum deltas', () => {
    const first = resolveWheelGesture({
      deltaX: 2, deltaY: 8, deltaMode: 0,
      ctrlKey: false, shiftKey: false, timeStamp: 100,
    }, null, VIEWPORT);
    const momentum = resolveWheelGesture({
      deltaX: 0, deltaY: 90, deltaMode: 0,
      ctrlKey: false, shiftKey: false, timeStamp: 220,
    }, first.state, VIEWPORT);
    expect(momentum.mode).toBe('pan');
  });

  it('maps shift-wheel onto horizontal pan and scales line/page deltas', () => {
    expect(resolveWheelGesture({
      deltaX: 0, deltaY: 2, deltaMode: 1,
      ctrlKey: false, shiftKey: true, timeStamp: 10,
    }, null, VIEWPORT).panDelta).toEqual({ x: -32, y: 0 });
    expect(resolveWheelGesture({
      deltaX: 1, deltaY: 1, deltaMode: 2,
      ctrlKey: false, shiftKey: false, timeStamp: 10,
    }, null, VIEWPORT).panDelta).toEqual({ x: -800, y: -600 });
  });

  it('retains coarse mouse-wheel zoom behavior outside trackpad sessions', () => {
    expect(resolveWheelGesture({
      deltaX: 0, deltaY: 100, deltaMode: 0,
      ctrlKey: false, shiftKey: false, timeStamp: 500,
    }, { mode: 'pan', lastEventAt: 100 }, VIEWPORT).mode).toBe('zoom');
  });
});
