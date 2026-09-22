import { describe, expect, it } from 'vitest';
import { createBounds2d } from '../geometry/bounds';
import {
  pointInPolygon, polygonIntersectsBounds, simplifyStroke, smoothStroke, strokeBounds,
  strokeHitBySegment,
} from './strokeGeometry';

const line = Array.from({ length: 11 }, (_, index) => ({ x: index * 10, y: 0 }));

describe('simplifyStroke', () => {
  it('collapses a straight run to its ends', () => {
    expect(simplifyStroke(line, 0.75)).toEqual([{ x: 0, y: 0 }, { x: 100, y: 0 }]);
  });

  it('keeps a corner the tolerance cannot flatten', () => {
    const corner = [{ x: 0, y: 0 }, { x: 50, y: 40 }, { x: 100, y: 0 }];
    expect(simplifyStroke(corner, 0.75)).toEqual(corner);
  });

  it('drops jitter smaller than the tolerance', () => {
    const jittery = line.map((point, index) => ({ x: point.x, y: index % 2 === 0 ? 0.2 : -0.2 }));
    expect(simplifyStroke(jittery, 0.75).length).toBeLessThan(jittery.length);
  });

  it('handles the degenerate cases', () => {
    expect(simplifyStroke([], 1)).toEqual([]);
    expect(simplifyStroke([{ x: 1, y: 1 }], 1)).toEqual([{ x: 1, y: 1 }]);
    expect(simplifyStroke(line, 0)).toEqual(line);
  });
});

describe('smoothStroke', () => {
  it('passes through every original point and adds samples between', () => {
    const corner = [{ x: 0, y: 0 }, { x: 50, y: 40 }, { x: 100, y: 0 }];
    const smooth = smoothStroke(corner, 4);
    expect(smooth.length).toBe(1 + (corner.length - 1) * 4);
    expect(smooth[0]).toEqual(corner[0]);
    expect(smooth.at(-1)).toEqual(corner.at(-1));
    expect(smooth[4]).toEqual(corner[1]);
  });

  it('leaves short strokes alone', () => {
    expect(smoothStroke([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toHaveLength(2);
  });
});

describe('strokeBounds', () => {
  it('wraps every point', () => {
    expect(strokeBounds([{ x: 5, y: 7 }, { x: 9, y: 2 }])).toEqual(createBounds2d(5, 2, 4, 5));
  });
});

describe('strokeHitBySegment', () => {
  it('hits a stroke the eraser crosses and misses one beside it', () => {
    expect(strokeHitBySegment(line, [{ x: 50, y: -20 }, { x: 50, y: 20 }], 6)).toBe(true);
    expect(strokeHitBySegment(line, [{ x: 50, y: 20 }, { x: 50, y: 40 }], 6)).toBe(false);
    expect(strokeHitBySegment([{ x: 5, y: 5 }], [{ x: 0, y: 0 }, { x: 10, y: 10 }], 1)).toBe(true);
    expect(strokeHitBySegment([], [{ x: 0, y: 0 }, { x: 10, y: 10 }], 1)).toBe(false);
  });
});

describe('lasso geometry', () => {
  const triangle = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 100 }];

  it('tests a point against the polygon', () => {
    expect(pointInPolygon({ x: 50, y: 40 }, triangle)).toBe(true);
    expect(pointInPolygon({ x: 5, y: 90 }, triangle)).toBe(false);
  });

  it('selects a box inside, overlapping or crossing the lasso', () => {
    expect(polygonIntersectsBounds(triangle, createBounds2d(40, 20, 20, 20))).toBe(true);
    // Straddles the left edge: the box is outside but the edge crosses it.
    expect(polygonIntersectsBounds(triangle, createBounds2d(-10, 20, 30, 20))).toBe(true);
    expect(polygonIntersectsBounds(triangle, createBounds2d(200, 200, 20, 20))).toBe(false);
    expect(polygonIntersectsBounds([], createBounds2d(0, 0, 10, 10))).toBe(false);
  });
});
