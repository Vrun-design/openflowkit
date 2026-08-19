import { describe, expect, it } from 'vitest';
import { createBounds2d } from '../geometry/bounds';
import { routeOrthogonalAroundObstacles } from './obstacleRouting';

describe('orthogonal obstacle routing', () => {
  it('chooses a deterministic clear lane around a blocking node', () => {
    const route = routeOrthogonalAroundObstacles(
      { x: 0, y: 50 }, { x: 300, y: 50 }, [createBounds2d(120, 10, 60, 80)]
    );
    expect(route).toEqual([
      { x: 0, y: 50 }, { x: 0, y: -6 }, { x: 300, y: -6 }, { x: 300, y: 50 },
    ]);
  });

  it('keeps the shortest clear orthogonal path when no obstacle blocks it', () => {
    expect(routeOrthogonalAroundObstacles(
      { x: 0, y: 0 }, { x: 100, y: 80 }, [createBounds2d(200, 200, 20, 20)]
    )).toEqual([{ x: 0, y: 0 }, { x: 0, y: 80 }, { x: 100, y: 80 }]);
  });
});
