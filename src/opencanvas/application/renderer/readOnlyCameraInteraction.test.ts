import { describe, expect, it } from 'vitest';
import {
  beginCameraPan,
  moveCameraPan,
  zoomReadOnlyCamera,
} from './readOnlyCameraInteraction';

describe('read-only renderer camera interaction', () => {
  it('pans by incremental screen deltas', () => {
    const first = beginCameraPan(7, { x: 10, y: 20 });
    const moved = moveCameraPan({ x: 5, y: 8, zoom: 2 }, first, { x: 25, y: 15 });
    expect(moved).toEqual({
      camera: { x: 20, y: 3, zoom: 2 },
      gesture: {
        pointerId: 7,
        start: { x: 10, y: 20 },
        last: { x: 25, y: 15 },
        moved: true,
      },
    });
  });

  it('keeps sub-threshold movement available for click selection', () => {
    const gesture = beginCameraPan(1, { x: 10, y: 10 });
    const moved = moveCameraPan({ x: 5, y: 8, zoom: 2 }, gesture, { x: 12, y: 11 });
    expect(moved.camera).toEqual({ x: 5, y: 8, zoom: 2 });
    expect(moved.gesture.moved).toBe(false);
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
