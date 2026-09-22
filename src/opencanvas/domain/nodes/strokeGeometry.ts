import type { Bounds2d, Point2d } from '../geometry/types';
import { createBounds2d } from '../geometry/bounds';

// Stroke maths for the ink tools: capture-time simplification, render-time
// smoothing, and the two hit tests the eraser and lasso need. Pure and small.

/** Ramer–Douglas–Peucker: drops points a straight run already passes within `tolerance` of. */
export function simplifyStroke(points: readonly Point2d[], tolerance: number): Point2d[] {
  if (points.length <= 2 || tolerance <= 0) return [...points];
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const dx = last.x - first.x;
  const dy = last.y - first.y;
  const length = Math.hypot(dx, dy);
  let index = -1;
  let worst = tolerance;
  for (let i = 1; i < points.length - 1; i += 1) {
    const point = points[i]!;
    const distance = length > 1e-9
      ? Math.abs(dy * point.x - dx * point.y + last.x * first.y - last.y * first.x) / length
      : Math.hypot(point.x - first.x, point.y - first.y);
    if (distance > worst) { worst = distance; index = i; }
  }
  if (index < 0) return [first, last];
  return [
    ...simplifyStroke(points.slice(0, index + 1), tolerance).slice(0, -1),
    ...simplifyStroke(points.slice(index), tolerance),
  ];
}

/**
 * Catmull-Rom through every point, so a hand-drawn stroke reads as a curve
 * instead of a chain of chords. Endpoints repeat their neighbour.
 */
export function smoothStroke(points: readonly Point2d[], samplesPerSegment = 6): Point2d[] {
  if (points.length < 3 || samplesPerSegment < 2) return [...points];
  const at = (index: number): Point2d => points[Math.min(points.length - 1, Math.max(0, index))]!;
  const result: Point2d[] = [points[0]!];
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = at(index - 1);
    const p1 = at(index);
    const p2 = at(index + 1);
    const p3 = at(index + 2);
    for (let step = 1; step <= samplesPerSegment; step += 1) {
      const t = step / samplesPerSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      result.push({
        x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t
          + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2
          + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t
          + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2
          + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  return result;
}

export function strokeBounds(points: readonly Point2d[]): Bounds2d {
  const xs = points.map(({ x }) => x);
  const ys = points.map(({ y }) => y);
  return createBounds2d(Math.min(...xs), Math.min(...ys),
    Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
}

function segmentDistance(a1: Point2d, a2: Point2d, b1: Point2d, b2: Point2d): number {
  const lengthSquared = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1; const dy = y2 - y1;
    return dx * dx + dy * dy;
  };
  const arm = lengthSquared(a1.x, a1.y, a2.x, a2.y);
  const armB = lengthSquared(b1.x, b1.y, b2.x, b2.y);
  const projection = (point: Point2d, start: Point2d, end: Point2d, span: number): number => {
    if (span <= 1e-12) return 0;
    return Math.min(1, Math.max(0, ((point.x - start.x) * (end.x - start.x)
      + (point.y - start.y) * (end.y - start.y)) / span));
  };
  const t = projection(a1, b1, b2, armB);
  const closestToA = { x: b1.x + (b2.x - b1.x) * t, y: b1.y + (b2.y - b1.y) * t };
  const s = projection(b1, a1, a2, arm);
  const closestToB = { x: a1.x + (a2.x - a1.x) * s, y: a1.y + (a2.y - a1.y) * s };
  const candidates = [
    Math.hypot(a1.x - closestToA.x, a1.y - closestToA.y),
    Math.hypot(a2.x - closestToA.x, a2.y - closestToA.y),
    Math.hypot(b1.x - closestToB.x, b1.y - closestToB.y),
    Math.hypot(b2.x - closestToB.x, b2.y - closestToB.y),
  ];
  return Math.min(...candidates);
}

/** True when `segment` passes within `radius` of any part of the stroke. */
export function strokeHitBySegment(
  points: readonly Point2d[], segment: readonly [Point2d, Point2d], radius: number
): boolean {
  if (points.length === 0) return false;
  if (points.length === 1) return segmentDistance(points[0]!, points[0]!, segment[0], segment[1]) <= radius;
  for (let index = 1; index < points.length; index += 1) {
    if (segmentDistance(points[index - 1]!, points[index]!, segment[0], segment[1]) <= radius) return true;
  }
  return false;
}

export function pointInPolygon(point: Point2d, polygon: readonly Point2d[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    if ((a.y > point.y) !== (b.y > point.y)
      && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** True when the polygon overlaps a node's box: a corner inside, or an edge crossing it. */
export function polygonIntersectsBounds(polygon: readonly Point2d[], bounds: Bounds2d): boolean {
  if (polygon.length < 3) return false;
  const left = bounds.x; const right = bounds.x + bounds.width;
  const top = bounds.y; const bottom = bounds.y + bounds.height;
  if ([left, right].some((x) => [top, bottom].some((y) => pointInPolygon({ x, y }, polygon)))) return true;
  const corners: readonly Point2d[] = [
    { x: left, y: top }, { x: right, y: top }, { x: right, y: bottom }, { x: left, y: bottom },
  ];
  if (corners.some((corner) => pointInPolygon(corner, polygon))) return true;
  const edges: readonly (readonly [Point2d, Point2d])[] = [
    [corners[0]!, corners[1]!], [corners[1]!, corners[2]!],
    [corners[2]!, corners[3]!], [corners[3]!, corners[0]!],
  ];
  for (let index = 0; index < polygon.length; index += 1) {
    const a = polygon[index]!;
    const b = polygon[(index + 1) % polygon.length]!;
    if (edges.some(([c, d]) => segmentDistance(a, b, c, d) <= 0)) return true;
  }
  return false;
}
