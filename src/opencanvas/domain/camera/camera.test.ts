import { describe, expect, it } from 'vitest';
import {
  fitCameraToBounds,
  normalizeCamera,
  normalizeWheelDelta,
  panCamera,
  screenToWorld,
  visibleWorldBounds,
  worldToScreen,
  zoomCameraAt,
} from './camera';

describe('canonical canvas camera', () => {
  it('round-trips world and screen points', () => {
    const camera = { x: 20, y: -10, zoom: 2 };
    expect(screenToWorld(camera, worldToScreen(camera, { x: 12, y: 8 }))).toEqual({ x: 12, y: 8 });
  });

  it('clamps zoom and rejects invalid limits', () => {
    expect(normalizeCamera({ x: 0, y: 0, zoom: 99 }).zoom).toBe(4);
    expect(() => normalizeCamera({ x: 0, y: 0, zoom: 1 }, { minZoom: 2, maxZoom: 1 })).toThrow();
  });

  it('preserves the world anchor while zooming', () => {
    const camera = { x: 10, y: 20, zoom: 1 };
    const anchor = { x: 100, y: 80 };
    const before = screenToWorld(camera, anchor);
    const afterCamera = zoomCameraAt(camera, anchor, 2);
    expect(screenToWorld(afterCamera, anchor)).toEqual(before);
  });

  it('pans and fits content deterministically', () => {
    expect(panCamera({ x: 1, y: 2, zoom: 1 }, { x: 4, y: -2 })).toEqual({ x: 5, y: 0, zoom: 1 });
    expect(
      fitCameraToBounds({ x: 0, y: 0, width: 200, height: 100 }, { width: 500, height: 300 }, 50)
    ).toEqual({ x: 50, y: 50, zoom: 2 });
  });

  it('derives the visible world rectangle', () => {
    expect(visibleWorldBounds({ x: 50, y: 20, zoom: 2 }, { width: 400, height: 200 })).toEqual({
      x: -25,
      y: -10,
      width: 200,
      height: 100,
    });
  });

  it('normalises wheel deltaModes to pixels', () => {
    expect(normalizeWheelDelta({ deltaX: 0, deltaY: 40, deltaMode: 0 }, { width: 800, height: 600 }))
      .toEqual({ x: 0, y: 40 });
    expect(normalizeWheelDelta({ deltaX: 0, deltaY: 3, deltaMode: 1 }, { width: 800, height: 600 }))
      .toEqual({ x: 0, y: 48 });
    expect(normalizeWheelDelta({ deltaX: 1, deltaY: 0, deltaMode: 2 }, { width: 800, height: 600 }))
      .toEqual({ x: 800, y: 0 });
  });
});
