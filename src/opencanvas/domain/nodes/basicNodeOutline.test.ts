import { describe, expect, it } from 'vitest';
import { basicNodeOutlinePoints, clearBasicNodeOutlineCache } from './basicNodeOutline';

describe('basic node outline geometry', () => {
  it('creates deterministic rectangle and diamond outlines', () => {
    expect(basicNodeOutlinePoints('rectangle', { width: 120, height: 60 })).toEqual([
      { x: 0, y: 0 },
      { x: 120, y: 0 },
      { x: 120, y: 60 },
      { x: 0, y: 60 },
    ]);
    expect(basicNodeOutlinePoints('diamond', { width: 120, height: 60 })).toEqual([
      { x: 60, y: 0 },
      { x: 120, y: 30 },
      { x: 60, y: 60 },
      { x: 0, y: 30 },
    ]);
  });

  it('keeps rounded and capsule samples inside node bounds', () => {
    for (const shape of ['rounded', 'capsule'] as const) {
      const points = basicNodeOutlinePoints(shape, { width: 120, height: 60 });
      expect(points).toHaveLength(16);
      expect(points.every((point) => point.x >= 0 && point.x <= 120)).toBe(true);
      expect(points.every((point) => point.y >= 0 && point.y <= 60)).toBe(true);
    }
  });

  it('provides bounded deterministic outlines for the complete built-in catalog', () => {
    const shapes = [
      'circle', 'ellipse', 'hexagon', 'parallelogram', 'cylinder', 'cloud',
      'document', 'queue', 'database', 'actor',
    ] as const;
    for (const shape of shapes) {
      const first = basicNodeOutlinePoints(shape, { width: 160, height: 80 });
      expect(first.length).toBeGreaterThanOrEqual(4);
      expect(first.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)
        && x >= -1e-9 && x <= 160 + 1e-9 && y >= -1e-9 && y <= 80 + 1e-9)).toBe(true);
      expect(basicNodeOutlinePoints(shape, { width: 160, height: 80 })).toEqual(first);
    }
  });

  it('caches geometry by shape identity and dimensions', () => {
    clearBasicNodeOutlineCache();
    const first = basicNodeOutlinePoints('cloud', { width: 120, height: 60 });
    expect(basicNodeOutlinePoints('cloud', { width: 120, height: 60 })).toBe(first);
    expect(basicNodeOutlinePoints('cloud', { width: 121, height: 60 })).not.toBe(first);
  });
});
