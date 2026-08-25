import { describe, expect, it } from 'vitest';
import {
  beginCameraPan,
  moveCameraPan,
  releaseCameraPanVelocity,
  zoomReadOnlyCamera,
} from './readOnlyCameraInteraction';

describe('read-only renderer camera interaction', () => {
  it('pans by incremental screen deltas', () => {
    const first = beginCameraPan(7, { x: 10, y: 20 }, 10);
    const moved = moveCameraPan({ x: 5, y: 8, zoom: 2 }, first, { x: 25, y: 15 }, false, 20);
    expect(moved).toEqual({
      camera: { x: 20, y: 3, zoom: 2 },
      gesture: {
        pointerId: 7,
        start: { x: 10, y: 20 },
        last: { x: 25, y: 15 },
        moved: true,
        axisLock: null,
        startEventAt: 10,
        lastEventAt: 20,
        velocity: { x: 1.5, y: -0.5 },
      },
    });
  });

  it('decays stale release velocity so held pointers never launch momentum', () => {
    const first = beginCameraPan(3, { x: 0, y: 0 }, 10);
    const moved = moveCameraPan({ x: 0, y: 0, zoom: 1 }, first, { x: 20, y: 0 }, false, 30);
    expect(releaseCameraPanVelocity(moved.gesture, 30)).toEqual({ x: 1, y: 0 });
    expect(releaseCameraPanVelocity(moved.gesture, 190)).toEqual({ x: 0, y: 0 });
  });

  it('locks pointer pan to dominant gesture axis while Shift remains held', () => {
    const first = beginCameraPan(2, { x: 0, y: 0 });
    const moved = moveCameraPan({ x: 0, y: 0, zoom: 1 }, first, { x: 20, y: 8 }, true);
    expect(moved.camera).toEqual({ x: 20, y: 0, zoom: 1 });
    expect(moved.gesture.axisLock).toBe('x');
    const continued = moveCameraPan(moved.camera, moved.gesture, { x: 22, y: 30 }, true);
    expect(continued.camera).toEqual({ x: 22, y: 0, zoom: 1 });
  });

  it('keeps sub-threshold movement available for click selection', () => {
    const gesture = beginCameraPan(1, { x: 10, y: 10 });
    const moved = moveCameraPan({ x: 5, y: 8, zoom: 2 }, gesture, { x: 12, y: 11 });
    expect(moved.camera).toEqual({ x: 5, y: 8, zoom: 2 });
    expect(moved.gesture.moved).toBe(false);
    const crossed = moveCameraPan(moved.camera, moved.gesture, { x: 15, y: 10 });
    expect(crossed.camera).toEqual({ x: 10, y: 8, zoom: 2 });
  });

  it('zooms around the pointer while preserving its world anchor', () => {
    const camera = { x: 20, y: 30, zoom: 1 };
    const zoomed = zoomReadOnlyCamera(camera, { x: 120, y: 130 }, -240);
    expect(zoomed.zoom).toBeGreaterThan(1);
    expect((120 - zoomed.x) / zoomed.zoom).toBeCloseTo(100);
    expect((130 - zoomed.y) / zoomed.zoom).toBeCloseTo(100);
  });

  it('honors canonical zoom limits under extreme wheel input', () => {
    expect(zoomReadOnlyCamera({ x: 0, y: 0, zoom: 1 }, { x: 0, y: 0 }, 100_000).zoom)
      .toBe(0.1);
    expect(zoomReadOnlyCamera({ x: 0, y: 0, zoom: 1 }, { x: 0, y: 0 }, -100_000).zoom)
      .toBe(4);
  });
});
