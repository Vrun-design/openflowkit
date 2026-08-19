import { describe, expect, it } from 'vitest';
import {
  closestPointOnPolyline,
  copyPolyline,
  dedupePolyline,
  isOrthogonalPolyline,
  pointAtPolylineRatio,
  polylineBounds,
  polylineLength,
} from './polyline';

describe('polylines', () => {
  const path = [
    { x: 0, y: 0 },
    { x: 3, y: 0 },
    { x: 3, y: 4 },
  ] as const;

  it('copies points without retaining mutable input references', () => {
    const input = [{ x: 1, y: 2 }];
    const copy = copyPolyline(input);

    expect(copy).toEqual(input);
    expect(copy[0]).not.toBe(input[0]);
  });

  it('deduplicates only consecutive nearly-equal points', () => {
    expect(
      dedupePolyline(
        [
          { x: 0, y: 0 },
          { x: 0.001, y: 0.001 },
          { x: 2, y: 0 },
          { x: 0, y: 0 },
        ],
        0.01
      )
    ).toEqual([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 0 },
    ]);
  });

  it('measures path length and samples by arc length', () => {
    expect(polylineLength(path)).toBe(7);
    expect(pointAtPolylineRatio(path, 0.5)).toEqual({ x: 3, y: 0.5 });
    expect(pointAtPolylineRatio(path, -1)).toEqual(path[0]);
    expect(pointAtPolylineRatio(path, 2)).toEqual(path[2]);
    expect(pointAtPolylineRatio([], 0.5)).toBeNull();
    expect(pointAtPolylineRatio([{ x: 1, y: 2 }], 0.5)).toEqual({ x: 1, y: 2 });
    expect(() => pointAtPolylineRatio(path, Number.NaN)).toThrow(RangeError);
  });

  it('handles degenerate paths deterministically', () => {
    const points = [
      { x: 2, y: 3 },
      { x: 2, y: 3 },
    ];
    expect(pointAtPolylineRatio(points, 1)).toEqual(points[0]);
    expect(closestPointOnPolyline(points, { x: 5, y: 7 })).toEqual({
      point: { x: 2, y: 3 },
      distance: 5,
      segmentIndex: 0,
      segmentRatio: 0,
      pathRatio: 0,
    });
  });

  it('derives bounds and detects orthogonal paths with tolerance', () => {
    expect(polylineBounds(path)).toEqual({ x: 0, y: 0, width: 3, height: 4 });
    expect(isOrthogonalPolyline(path)).toBe(true);
    expect(
      isOrthogonalPolyline([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ])
    ).toBe(false);
    expect(
      isOrthogonalPolyline(
        [
          { x: 0, y: 0 },
          { x: 1, y: 0.001 },
        ],
        0.01
      )
    ).toBe(true);
  });

  it('projects onto the closest segment and reports segment and path ratios', () => {
    const result = closestPointOnPolyline(path, { x: 5, y: 2 });

    expect(result).not.toBeNull();
    expect(result!.point).toEqual({ x: 3, y: 2 });
    expect(result!.distance).toBe(2);
    expect(result!.segmentIndex).toBe(1);
    expect(result!.segmentRatio).toBe(0.5);
    expect(result!.pathRatio).toBeCloseTo(5 / 7);
    expect(closestPointOnPolyline([], { x: 0, y: 0 })).toBeNull();
  });
});
