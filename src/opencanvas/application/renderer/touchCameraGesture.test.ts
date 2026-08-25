import { describe, expect, it } from 'vitest';
import {
  beginTouchCameraGesture,
  endTouchCameraGesture,
  moveTouchCameraGesture,
} from './touchCameraGesture';

describe('touch camera gesture', () => {
  it('pans with one touch and releases bounded velocity', () => {
    const started = beginTouchCameraGesture(null, 1, { x: 10, y: 10 }, 10);
    const moved = moveTouchCameraGesture(
      { x: 0, y: 0, zoom: 1 }, started, 1, { x: 30, y: 20 }, 30
    );
    expect(moved.camera).toEqual({ x: 20, y: 10, zoom: 1 });
    expect(endTouchCameraGesture(moved.gesture, 1, 30)).toEqual({
      gesture: null,
      releaseVelocity: { x: 1, y: 0.5 },
    });
  });

  it('combines two-touch centroid pan with anchored pinch zoom', () => {
    const first = beginTouchCameraGesture(null, 1, { x: 100, y: 100 }, 0);
    const pinch = beginTouchCameraGesture(first, 2, { x: 200, y: 100 }, 0);
    const moved = moveTouchCameraGesture(
      { x: 0, y: 0, zoom: 1 }, pinch, 2, { x: 300, y: 120 }, 10
    );

    expect(moved.camera.zoom).toBeCloseTo(Math.hypot(200, 20) / 100);
    expect(moved.camera.x).toBeCloseTo(-101.4962686);
    expect(moved.camera.y).toBeCloseTo(-90.9975124);
  });

  it('hands pinch back to the remaining pointer without a camera jump', () => {
    const first = beginTouchCameraGesture(null, 1, { x: 0, y: 0 }, 0);
    const pinch = beginTouchCameraGesture(first, 2, { x: 100, y: 0 }, 0);
    const ended = endTouchCameraGesture(pinch, 2, 20);
    expect(ended.releaseVelocity).toEqual({ x: 0, y: 0 });
    expect(ended.gesture?.kind).toBe('single');
    const continued = moveTouchCameraGesture(
      { x: 5, y: 6, zoom: 2 }, ended.gesture!, 1, { x: 10, y: 0 }, 30
    );
    expect(continued.camera).toEqual({ x: 15, y: 6, zoom: 2 });
  });

  it('ignores third touches and unknown pointer events deterministically', () => {
    const first = beginTouchCameraGesture(null, 1, { x: 0, y: 0 }, 0);
    const pinch = beginTouchCameraGesture(first, 2, { x: 100, y: 0 }, 0);
    expect(beginTouchCameraGesture(pinch, 3, { x: 50, y: 50 }, 0)).toBe(pinch);
    expect(moveTouchCameraGesture(
      { x: 1, y: 2, zoom: 1 }, pinch, 3, { x: 60, y: 60 }, 10
    )).toEqual({ camera: { x: 1, y: 2, zoom: 1 }, gesture: pinch });
  });
});
