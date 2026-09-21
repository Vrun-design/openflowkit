import { boundsMaxX, boundsMaxY, containsPoint, expandBounds } from '../geometry/bounds';
import { dedupePolyline } from '../geometry/polyline';
import { distanceBetweenPoints } from '../geometry/point';
import type { Bounds2d, Point2d } from '../geometry/types';
import type { ConnectSide } from './connectHandles';

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
    if (candidate.length < best.length) best = candidate;
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
export interface OrthogonalRouteOptions {
  /** Lane with a middle segment perpendicular to this axis is tried first (the Z shape). */
  readonly midSplit?: 'x' | 'y';
}

export function routeOrthogonalAroundObstacles(
  start: Point2d,
  end: Point2d,
  obstacleBounds: readonly Bounds2d[],
  options: OrthogonalRouteOptions = {}
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
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  // Candidate order is the tie-break: equal-length lanes resolve to the
  // earliest, so the Z for the requested axis wins over an L when both clear.
  const lanes: CandidateLane[] = [
    ...(options.midSplit === 'x'
      ? [makeJsonLane([start, { x: midX, y: start.y }, { x: midX, y: end.y }, end])]
      : options.midSplit === 'y'
        ? [makeJsonLane([start, { x: start.x, y: midY }, { x: end.x, y: midY }, end])]
        : []),
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

const STUB_LENGTH = 20;

function sideNormal(side: ConnectSide): Point2d {
  switch (side) {
    case 'top': return { x: 0, y: -1 };
    case 'right': return { x: 1, y: 0 };
    case 'bottom': return { x: 0, y: 1 };
    case 'left': return { x: -1, y: 0 };
  }
}

function sideAxis(side: ConnectSide): 'x' | 'y' {
  return side === 'left' || side === 'right' ? 'x' : 'y';
}

// The stub stops short of any clearance zone it would otherwise end inside
// (nodes packed tighter than stub + clearance), so the lane router still
// starts from a legal point instead of falling back to a crossing route.
function stubEnd(start: Point2d, side: ConnectSide | null, obstacles: readonly Bounds2d[]): Point2d {
  if (!side) return start;
  const normal = sideNormal(side);
  let length = STUB_LENGTH;
  for (const bounds of obstacles) {
    const zone = expandBounds(bounds, ROUTE_CLEARANCE);
    if (containsPoint(zone, start)) continue;
    const end = { x: start.x + normal.x * length, y: start.y + normal.y * length };
    if (!containsPoint(zone, end)) continue;
    const edge = normal.x > 0 ? zone.x : normal.x < 0 ? boundsMaxX(zone) : normal.y > 0 ? zone.y : boundsMaxY(zone);
    const reach = Math.abs(normal.x !== 0 ? edge - start.x : edge - start.y) - 0.5;
    length = Math.max(0, Math.min(length, reach));
  }
  return { x: start.x + normal.x * length, y: start.y + normal.y * length };
}

// A bound end leaves its node perpendicular to the side for one stub, then
// the lane router takes over between the stubs. Own nodes belong in the
// obstacle list: they are what stops a lane from doubling back through the
// shape it just left. Free ends have no side and no stub.
export function routeOrthogonalBetweenSides(
  start: Point2d,
  startSide: ConnectSide | null,
  end: Point2d,
  endSide: ConnectSide | null,
  obstacleBounds: readonly Bounds2d[]
): readonly Point2d[] {
  // A box enclosing an end point (a container around the node, an
  // overlapping shape) would block every lane; it is context, not an obstacle.
  const obstacles = obstacleBounds.filter(
    (bounds) => !containsPoint(bounds, start) && !containsPoint(bounds, end)
  );
  const stubStart = stubEnd(start, startSide, obstacles);
  const stubEndPoint = stubEnd(end, endSide, obstacles);
  const axis = startSide ? sideAxis(startSide) : endSide ? sideAxis(endSide) : null;
  const opposite = startSide && endSide && sideAxis(startSide) === sideAxis(endSide);
  const lane = routeOrthogonalAroundObstacles(stubStart, stubEndPoint, obstacles, {
    midSplit: opposite && axis ? axis : undefined,
  });
  return dropCollinear(dedupePolyline([start, ...lane, end]));
}

// Stubs usually continue straight into the first lane segment; a vertex on
// a straight run would only grow a pointless segment handle. A vertex where
// the run reverses (a user corner) stays.
export function dropCollinear(points: readonly Point2d[]): readonly Point2d[] {
  return points.filter((point, index) => {
    if (index === 0 || index === points.length - 1) return true;
    const previous = points[index - 1];
    const next = points[index + 1];
    const straightX = previous.x === point.x && point.x === next.x
      && Math.sign(point.y - previous.y) === Math.sign(next.y - point.y);
    const straightY = previous.y === point.y && point.y === next.y
      && Math.sign(point.x - previous.x) === Math.sign(next.x - point.x);
    return !(straightX || straightY);
  });
}
