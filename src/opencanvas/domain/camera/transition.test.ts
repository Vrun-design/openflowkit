import { describe, expect, it } from 'vitest';
import { cameraEquals, easeOutCubic, interpolateCamera } from './transition';

describe('camera transition', () => {
  it('clamps easing and preserves exact endpoints', () => {
    const from = { x: 0, y: 10, zoom: 0.5 };
    const to = { x: 100, y: -30, zoom: 2 };
    expect(easeOutCubic(-1)).toBe(0);
    expect(easeOutCubic(2)).toBe(1);
    expect(interpolateCamera(from, to, 0)).toEqual(from);
    expect(interpolateCamera(from, to, 1)).toEqual(to);
  });

  it('interpolates zoom geometrically for stable relative motion', () => {
    const midpoint = interpolateCamera(
      { x: 0, y: 0, zoom: 1 },
      { x: 80, y: 40, zoom: 4 },
      1 - Math.cbrt(0.5)
    );
    expect(midpoint.x).toBeCloseTo(40);
    expect(midpoint.y).toBeCloseTo(20);
    expect(midpoint.zoom).toBeCloseTo(2);
  });

  it('compares complete camera identity', () => {
    expect(cameraEquals({ x: 1, y: 2, zoom: 1 }, { x: 1, y: 2, zoom: 1 })).toBe(true);
    expect(cameraEquals({ x: 1, y: 2, zoom: 1 }, { x: 1, y: 3, zoom: 1 })).toBe(false);
  });
});
