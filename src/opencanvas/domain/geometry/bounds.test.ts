import { describe, expect, it } from 'vitest';
import {
  boundsCenter,
  boundsCorners,
  boundsFromPoints,
  containsPoint,
  createBounds2d,
  expandBounds,
  intersectBounds,
  intersectsBounds,
  isBounds2d,
  translateBounds,
  unionBounds,
} from './bounds';
import { createSize2d, isSize2d, sizeArea } from './size';

describe('sizes', () => {
  it('allows zero-sized geometry and rejects negative or non-finite dimensions', () => {
    expect(createSize2d(0, 4)).toEqual({ width: 0, height: 4 });
    expect(isSize2d({ width: 0, height: 4 })).toBe(true);
    expect(isSize2d({ width: -1, height: 4 })).toBe(false);
    expect(() => createSize2d(-1, 4)).toThrow(RangeError);
    expect(() => createSize2d(Number.NaN, 4)).toThrow(RangeError);
    expect(sizeArea({ width: 3, height: 4 })).toBe(12);
  });
});

describe('bounds', () => {
  it('constructs valid top-left bounds', () => {
    expect(createBounds2d(-10, 20, 30, 40)).toEqual({
      x: -10,
      y: 20,
      width: 30,
      height: 40,
    });
    expect(isBounds2d({ x: -10, y: 20, width: 30, height: 40 })).toBe(true);
    expect(isBounds2d({ x: 0, y: 0, width: -1, height: 1 })).toBe(false);
    expect(() => createBounds2d(0, 0, 1, -1)).toThrow(RangeError);
  });

  it('derives bounds, center, and clockwise corners from points', () => {
    const bounds = boundsFromPoints([
      { x: 5, y: -2 },
      { x: -3, y: 7 },
      { x: 1, y: 4 },
    ]);

    expect(bounds).toEqual({ x: -3, y: -2, width: 8, height: 9 });
    expect(boundsCenter(bounds!)).toEqual({ x: 1, y: 2.5 });
    expect(boundsCorners(bounds!)).toEqual([
      { x: -3, y: -2 },
      { x: 5, y: -2 },
      { x: 5, y: 7 },
      { x: -3, y: 7 },
    ]);
    expect(boundsFromPoints([])).toBeNull();
  });

  it('uses inclusive containment and intersection boundaries', () => {
    const left = createBounds2d(0, 0, 10, 10);
    const touching = createBounds2d(10, 2, 5, 4);

    expect(containsPoint(left, { x: 10, y: 10 })).toBe(true);
    expect(containsPoint(left, { x: 10.01, y: 10 })).toBe(false);
    expect(intersectsBounds(left, touching)).toBe(true);
    expect(intersectBounds(left, touching)).toEqual({ x: 10, y: 2, width: 0, height: 4 });
    expect(intersectBounds(left, createBounds2d(11, 0, 1, 1))).toBeNull();
  });

  it('unions, translates, and expands bounds', () => {
    const first = createBounds2d(0, 2, 10, 4);
    const second = createBounds2d(-5, 5, 8, 10);

    expect(unionBounds(first, second)).toEqual({ x: -5, y: 2, width: 15, height: 13 });
    expect(translateBounds(first, { x: -2, y: 3 })).toEqual({
      x: -2,
      y: 5,
      width: 10,
      height: 4,
    });
    expect(expandBounds(first, 2)).toEqual({ x: -2, y: 0, width: 14, height: 8 });
    expect(() => expandBounds(first, -1)).toThrow(RangeError);
  });
});
