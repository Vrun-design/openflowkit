import { boundsMaxX, boundsMaxY, expandBounds } from '../geometry/bounds';
import { dedupePolyline } from '../geometry/polyline';
import { distanceBetweenPoints } from '../geometry/point';
import type { Bounds2d, Point2d } from '../geometry/types';

const ROUTE_CLEARANCE = 12;
const MAX_DETOUR_ROUNDS = 4;
const MAX_BLOCKERS_PER_ROUND = 8;

function routeLength(points: readonly Point2d[]): number {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += distanceBetweenPoints(points[index - 1], points[index]);
  }
  return length;
}

function shortestRoute(routes: readonly CandidateLane[]): CandidateLane {
  let best = routes[0];
  for (let index = 1; index < routes.length; index += 1) {
    const candidate = routes[index];
    if (candidate.length < best.length
      || (candidate.length === best.length && candidate.key.localeCompare(best.key) < 0)) {
      best = candidate;
    }
  }
  return best;
}

interface CandidateLane {
  readonly key: string;
  readonly points: Point2d[];
  readonly length: number;
}

interface DetourLane {
  readonly key: string;
  readonly points: Point2d[];
}

function makeLane(key: string, points: readonly Point2d[]): CandidateLane {
  const deduped = dedupePolyline(points) as Point2d[];
  return { key, points: deduped, length: routeLength(deduped) };
}

function makeJsonLane(points: readonly Point2d[]): CandidateLane {
  const deduped = dedupePolyline(points) as Point2d[];
  return { key: JSON.stringify(deduped), points: deduped, length: routeLength(deduped) };
}

function detourLanes(start: Point2d, end: Point2d, obstacle: Bounds2d): DetourLane[] {
  const lanes: DetourLane[] = [];
  for (const y of [obstacle.y, boundsMaxY(obstacle)]) {
    lanes.push({
      key: `h${y}`,
      points: dedupePolyline([start, { x: start.x, y }, { x: end.x, y }, end]) as Point2d[],
    });
  }
  for (const x of [obstacle.x, boundsMaxX(obstacle)]) {
    lanes.push({
      key: `v${x}`,
      points: dedupePolyline([start, { x, y: start.y }, { x, y: end.y }, end]) as Point2d[],
    });
  }
  return lanes;
}

// Orthogonal lanes around obstacles, recomputed live every preview frame.
// Cost follows conflicts, not page size: each candidate lane tests only the
// obstacles intersecting its own segments (one inline pass, no allocation),
// and detour lanes generate around blocking obstacles alone.
export function routeOrthogonalAroundObstacles(
  start: Point2d,
  end: Point2d,
  obstacleBounds: readonly Bounds2d[]
): readonly Point2d[] {
  const count = obstacleBounds.length;
  const minX = new Array<number>(count);
  const minY = new Array<number>(count);
  const maxX = new Array<number>(count);
  const maxY = new Array<number>(count);
  for (let index = 0; index < count; index += 1) {
    const expanded = expandBounds(obstacleBounds[index], ROUTE_CLEARANCE);
    minX[index] = expanded.x;
    minY[index] = expanded.y;
    maxX[index] = boundsMaxX(expanded);
    maxY[index] = boundsMaxY(expanded);
  }
  // Exact hit test: the bbox cull uses the same strict inequalities as the
  // crossing test, so a culled obstacle can never intersect the segment.
  const segmentHits = (ax: number, ay: number, bx: number, by: number): boolean => {
    const horizontal = ay === by;
    const segMinX = ax < bx ? ax : bx;
    const segMaxX = ax > bx ? ax : bx;
    const segMinY = ay < by ? ay : by;
    const segMaxY = ay > by ? ay : by;
    for (let index = 0; index < count; index += 1) {
      if (maxX[index] <= segMinX || minX[index] >= segMaxX
        || maxY[index] <= segMinY || minY[index] >= segMaxY) continue;
      if (horizontal) {
        if (ay > minY[index] && ay < maxY[index]) return true;
      } else if (ax === bx) {
        return true;
      } else {
        return true;
      }
    }
    return false;
  };
  const laneIsClear = (points: readonly Point2d[]): boolean => {
    for (let index = 1; index < points.length; index += 1) {
      const a = points[index - 1];
      const b = points[index];
      if (segmentHits(a.x, a.y, b.x, b.y)) return false;
    }
    return true;
  };
  const laneHits = (points: readonly Point2d[], obstacle: number): boolean => {
    for (let index = 1; index < points.length; index += 1) {
      const a = points[index - 1];
      const b = points[index];
      const horizontal = a.y === b.y;
      const segMinX = a.x < b.x ? a.x : b.x;
      const segMaxX = a.x > b.x ? a.x : b.x;
      const segMinY = a.y < b.y ? a.y : b.y;
      const segMaxY = a.y > b.y ? a.y : b.y;
      if (maxX[obstacle] <= segMinX || minX[obstacle] >= segMaxX
        || maxY[obstacle] <= segMinY || minY[obstacle] >= segMaxY) continue;
      if (horizontal) {
        if (a.y > minY[obstacle] && a.y < maxY[obstacle]) return true;
      } else if (a.x !== b.x || a.y === b.y) {
        if (a.x > minX[obstacle] && a.x < maxX[obstacle]) return true;
      } else {
        return true;
      }
    }
    return false;
  };
  const lanes: CandidateLane[] = [
    makeJsonLane([start, { x: end.x, y: start.y }, end]),
    makeJsonLane([start, { x: start.x, y: end.y }, end]),
  ];
  const direct = lanes.filter((lane) => laneIsClear(lane.points));
  if (direct.length > 0) return shortestRoute(direct).points;
  const seen = new Set<string>(lanes.map((lane) => lane.key));
  let frontier = [...lanes];
  const processed = new Set<number>();
  for (let round = 0; round < MAX_DETOUR_ROUNDS; round += 1) {
    const best = shortestRoute(frontier);
    const blockers: number[] = [];
    for (let index = 0; index < count && blockers.length < MAX_BLOCKERS_PER_ROUND; index += 1) {
      if (!processed.has(index) && laneHits(best.points, index)) blockers.push(index);
    }
    if (blockers.length === 0) break;
    for (const blocker of blockers) processed.add(blocker);
    const fresh: CandidateLane[] = [];
    for (const blocker of blockers) {
      const expanded = {
        x: minX[blocker], y: minY[blocker],
        width: maxX[blocker] - minX[blocker], height: maxY[blocker] - minY[blocker],
      };
      for (const lane of detourLanes(start, end, expanded)) {
        if (seen.has(lane.key)) continue;
        seen.add(lane.key);
        fresh.push(makeLane(lane.key, lane.points));
      }
    }
    const clear = fresh.filter((lane) => laneIsClear(lane.points));
    if (clear.length > 0) return shortestRoute(clear).points;
    frontier = frontier.concat(fresh);
    if (fresh.length === 0) break;
  }
  return dedupePolyline([start, { x: (start.x + end.x) / 2, y: start.y }, {
    x: (start.x + end.x) / 2, y: end.y,
  }, end]);
}
