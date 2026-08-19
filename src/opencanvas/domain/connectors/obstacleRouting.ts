import { boundsMaxX, boundsMaxY, expandBounds } from '../geometry/bounds';
import { dedupePolyline } from '../geometry/polyline';
import { distanceBetweenPoints } from '../geometry/point';
import type { Bounds2d, Point2d } from '../geometry/types';

const ROUTE_CLEARANCE = 16;

function segmentHitsBounds(start: Point2d, end: Point2d, bounds: Bounds2d): boolean {
  const minX = Math.min(start.x, end.x);
  const maxX = Math.max(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxY = Math.max(start.y, end.y);
  if (start.y === end.y) {
    return start.y > bounds.y && start.y < boundsMaxY(bounds)
      && maxX > bounds.x && minX < boundsMaxX(bounds);
  }
  if (start.x === end.x) {
    return start.x > bounds.x && start.x < boundsMaxX(bounds)
      && maxY > bounds.y && minY < boundsMaxY(bounds);
  }
  return true;
}

function routeIsClear(points: readonly Point2d[], obstacles: readonly Bounds2d[]): boolean {
  for (let index = 1; index < points.length; index += 1) {
    if (obstacles.some((bounds) => segmentHitsBounds(points[index - 1], points[index], bounds))) {
      return false;
    }
  }
  return true;
}

function routeLength(points: readonly Point2d[]): number {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += distanceBetweenPoints(points[index - 1], points[index]);
  }
  return length;
}

export function routeOrthogonalAroundObstacles(
  start: Point2d,
  end: Point2d,
  obstacleBounds: readonly Bounds2d[]
): readonly Point2d[] {
  const obstacles = obstacleBounds.map((bounds) => expandBounds(bounds, ROUTE_CLEARANCE));
  const candidates: Point2d[][] = [
    [start, { x: end.x, y: start.y }, end],
    [start, { x: start.x, y: end.y }, end],
  ];
  for (const obstacle of obstacles) {
    for (const y of [obstacle.y, boundsMaxY(obstacle)]) {
      candidates.push([start, { x: start.x, y }, { x: end.x, y }, end]);
    }
    for (const x of [obstacle.x, boundsMaxX(obstacle)]) {
      candidates.push([start, { x, y: start.y }, { x, y: end.y }, end]);
    }
  }
  const clear = candidates
    .map((points) => dedupePolyline(points))
    .filter((points) => routeIsClear(points, obstacles))
    .sort((left, right) => routeLength(left) - routeLength(right)
      || JSON.stringify(left).localeCompare(JSON.stringify(right)));
  return clear[0] ?? dedupePolyline([start, { x: (start.x + end.x) / 2, y: start.y }, {
    x: (start.x + end.x) / 2, y: end.y,
  }, end]);
}
