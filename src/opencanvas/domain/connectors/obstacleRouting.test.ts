import { describe, expect, it } from 'vitest';
import { createBounds2d } from '../geometry/bounds';
import { routeOrthogonalAroundObstacles, routeOrthogonalBetweenSides } from './obstacleRouting';

describe('orthogonal obstacle routing', () => {
  it('chooses a deterministic clear lane around a blocking node', () => {
    const route = routeOrthogonalAroundObstacles(
      { x: 0, y: 50 }, { x: 300, y: 50 }, [createBounds2d(120, 10, 60, 80)]
    );
    expect(route).toEqual([
      { x: 0, y: 50 }, { x: 0, y: -2 }, { x: 300, y: -2 }, { x: 300, y: 50 },
    ]);
  });

  it('keeps the shortest clear orthogonal path when no obstacle blocks it', () => {
    expect(routeOrthogonalAroundObstacles(
      { x: 0, y: 0 }, { x: 100, y: 80 }, [createBounds2d(200, 200, 20, 20)]
    )).toEqual([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 80 }]);
  });

  it('prefers the Z lane on the requested axis when it is clear', () => {
    expect(routeOrthogonalAroundObstacles(
      { x: 0, y: 0 }, { x: 100, y: 80 }, [], { midSplit: 'x' }
    )).toEqual([{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 80 }, { x: 100, y: 80 }]);
  });

  it('leaves each side through a stub and treats the own nodes as obstacles', () => {
    const source = createBounds2d(0, 0, 100, 50);
    const target = createBounds2d(300, 200, 100, 50);
    const route = routeOrthogonalBetweenSides(
      { x: 100, y: 25 }, 'right', { x: 300, y: 225 }, 'left', [source, target]
    );
    expect(route).toEqual([
      { x: 100, y: 25 }, { x: 200, y: 25 }, { x: 200, y: 225 }, { x: 300, y: 225 },
    ]);
    // Facing the wrong way round: the lane must not cut back through the box it left.
    const back = routeOrthogonalBetweenSides(
      { x: 100, y: 25 }, 'right', { x: 50, y: 50 }, 'bottom', [source]
    );
    expect(back[1]).toEqual({ x: 120, y: 25 });
    expect(back.every((p, i) => i === 0 || p.x >= 50)).toBe(true);
  });

  it('routes 200 obstacles far inside any per-frame budget', () => {
    const obstacles = Array.from({ length: 200 }, (_, index) =>
      createBounds2d((index % 20) * 90 + 10, Math.floor(index / 20) * 90 + 10, 60, 60));
    const started = performance.now();
    for (let index = 0; index < 20; index += 1) {
      routeOrthogonalAroundObstacles({ x: 0, y: 450 }, { x: 1800, y: 450 }, obstacles);
    }
    // 200× headroom over the 0.5 ms/route budget: catches algorithmic
    // regressions, never flakes on machine speed.
    expect(performance.now() - started).toBeLessThan(2000);
  });

  it('routes around a wall of blockers without testing the whole page', () => {
    const obstacles = Array.from({ length: 40 }, (_, index) =>
      createBounds2d(120 + (index % 10) * 12, -40 + Math.floor(index / 10) * 30, 8, 20));
    const route = routeOrthogonalAroundObstacles({ x: 0, y: 50 }, { x: 300, y: 50 }, obstacles);
    expect(route.length).toBeGreaterThan(2);
    expect(route[0]).toEqual({ x: 0, y: 50 });
    expect(route.at(-1)).toEqual({ x: 300, y: 50 });
    const padded = obstacles.map((obstacle) => createBounds2d(
      obstacle.x - 12, obstacle.y - 12, obstacle.width + 24, obstacle.height + 24));
    for (let index = 1; index < route.length; index += 1) {
      const a = route[index - 1];
      const b = route[index];
      for (const box of padded) {
        if (a.y === b.y) {
          const crosses = a.y > box.y && a.y < box.y + box.height
            && Math.max(a.x, b.x) > box.x && Math.min(a.x, b.x) < box.x + box.width;
          expect(crosses).toBe(false);
        } else {
          const crosses = a.x > box.x && a.x < box.x + box.width
            && Math.max(a.y, b.y) > box.y && Math.min(a.y, b.y) < box.y + box.height;
          expect(crosses).toBe(false);
        }
      }
    }
  });
});
