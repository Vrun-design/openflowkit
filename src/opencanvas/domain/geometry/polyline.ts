import { boundsFromPoints } from './bounds';
import { GEOMETRY_EPSILON, requireFiniteNumber, requireNonNegativeNumber } from './finite';
import {
  arePointsNearlyEqual,
  createPoint2d,
  distanceBetweenPoints,
  dotProduct,
  lerpPoint,
  subtractPoints,
} from './point';
import type { Bounds2d, Point2d } from './types';

export interface ClosestPolylinePoint {
  readonly point: Point2d;
  readonly distance: number;
  readonly segmentIndex: number;
  readonly segmentRatio: number;
  readonly pathRatio: number;
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function copyPolyline(points: readonly Point2d[]): readonly Point2d[] {
  return points.map((point) => createPoint2d(point.x, point.y));
}

export function dedupePolyline(
  points: readonly Point2d[],
  epsilon = GEOMETRY_EPSILON
): readonly Point2d[] {
  const safeEpsilon = requireNonNegativeNumber(epsilon, 'epsilon');
  const deduped: Point2d[] = [];
  for (const point of points) {
    const previous = deduped[deduped.length - 1];
    if (!previous || !arePointsNearlyEqual(previous, point, safeEpsilon)) {
      deduped.push(createPoint2d(point.x, point.y));
    }
  }
  return deduped;
}

export function polylineLength(points: readonly Point2d[]): number {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += distanceBetweenPoints(points[index - 1], points[index]);
  }
  return length;
}

export function pointAtPolylineRatio(points: readonly Point2d[], ratio: number): Point2d | null {
  if (points.length === 0) {
    return null;
  }
  if (points.length === 1) {
    return createPoint2d(points[0].x, points[0].y);
  }

  const clampedRatio = clampUnit(requireFiniteNumber(ratio, 'ratio'));
  const totalLength = polylineLength(points);
  if (totalLength <= GEOMETRY_EPSILON) {
    return createPoint2d(points[0].x, points[0].y);
  }

  let remainingDistance = totalLength * clampedRatio;
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const segmentLength = distanceBetweenPoints(start, end);
    if (remainingDistance <= segmentLength && segmentLength > GEOMETRY_EPSILON) {
      return lerpPoint(start, end, remainingDistance / segmentLength);
    }
    remainingDistance -= segmentLength;
  }

  const lastPoint = points[points.length - 1];
  return createPoint2d(lastPoint.x, lastPoint.y);
}

export function polylineBounds(points: readonly Point2d[]): Bounds2d | null {
  return boundsFromPoints(points);
}

export function isOrthogonalPolyline(
  points: readonly Point2d[],
  epsilon = GEOMETRY_EPSILON
): boolean {
  const safeEpsilon = requireNonNegativeNumber(epsilon, 'epsilon');
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const horizontal = Math.abs(start.y - end.y) <= safeEpsilon;
    const vertical = Math.abs(start.x - end.x) <= safeEpsilon;
    if (!horizontal && !vertical) {
      return false;
    }
  }
  return true;
}

export function closestPointOnPolyline(
  points: readonly Point2d[],
  target: Point2d
): ClosestPolylinePoint | null {
  if (points.length === 0) {
    return null;
  }
  if (points.length === 1) {
    return {
      point: createPoint2d(points[0].x, points[0].y),
      distance: distanceBetweenPoints(points[0], target),
      segmentIndex: 0,
      segmentRatio: 0,
      pathRatio: 0,
    };
  }

  const totalLength = polylineLength(points);
  let traversedLength = 0;
  let closest: ClosestPolylinePoint | null = null;

  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const segment = subtractPoints(end, start);
    const segmentLengthSquared = dotProduct(segment, segment);
    const segmentLength = Math.sqrt(segmentLengthSquared);
    const targetFromStart = subtractPoints(target, start);
    const segmentRatio =
      segmentLengthSquared <= GEOMETRY_EPSILON * GEOMETRY_EPSILON
        ? 0
        : clampUnit(dotProduct(targetFromStart, segment) / segmentLengthSquared);
    const point = lerpPoint(start, end, segmentRatio);
    const distance = distanceBetweenPoints(point, target);
    const pathRatio =
      totalLength <= GEOMETRY_EPSILON
        ? 0
        : (traversedLength + segmentLength * segmentRatio) / totalLength;

    if (!closest || distance < closest.distance) {
      closest = {
        point,
        distance,
        segmentIndex: index - 1,
        segmentRatio,
        pathRatio,
      };
    }
    traversedLength += segmentLength;
  }

  return closest;
}

// Quadratic corner arcs sampled as short segments, so solid and dashed
// walkers share one rounded path. Degenerate vertices pass through sharp.
export function roundPolylineCorners(
  points: readonly Point2d[],
  radius: number
): readonly Point2d[] {
  if (points.length < 3 || !(radius > 0)) return points;
  const rounded: Point2d[] = [createPoint2d(points[0].x, points[0].y)];
  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const vertex = points[index];
    const next = points[index + 1];
    const inLength = distanceBetweenPoints(previous, vertex);
    const outLength = distanceBetweenPoints(vertex, next);
    const arc = Math.min(radius, inLength / 2, outLength / 2);
    if (!(arc > GEOMETRY_EPSILON)) {
      rounded.push(createPoint2d(vertex.x, vertex.y));
      continue;
    }
    const start = lerpPoint(vertex, previous, arc / inLength);
    const end = lerpPoint(vertex, next, arc / outLength);
    rounded.push(start);
    const steps = 4;
    for (let step = 1; step < steps; step += 1) {
      const ratio = step / steps;
      const inverse = 1 - ratio;
      rounded.push(createPoint2d(
        inverse * inverse * start.x + 2 * inverse * ratio * vertex.x + ratio * ratio * end.x,
        inverse * inverse * start.y + 2 * inverse * ratio * vertex.y + ratio * ratio * end.y
      ));
    }
    rounded.push(end);
  }
  const last = points[points.length - 1];
  rounded.push(createPoint2d(last.x, last.y));
  return rounded;
}
