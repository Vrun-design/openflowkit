import type { Point2d } from '../../domain/geometry/types';

/**
 * The dashes of a marching line: `on` long, every `on + off`, along `points` from the first to the last. A growing
 * `phase` slides them toward the end. Each dash is a polyline (it may turn corners); lengths share one unit.
 */
export function flowDashes(points: readonly Point2d[], on: number, off: number, phase: number): Point2d[][] {
  const period = on + off;
  if (points.length < 2 || on <= 0 || period <= 0) return [];
  const cumulative = [0];
  for (let i = 1; i < points.length; i += 1) {
    cumulative.push(cumulative[i - 1]! + Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.y - points[i - 1]!.y));
  }
  const length = cumulative[cumulative.length - 1]!;
  const at = (distance: number, segment: number): Point2d => {
    const from = points[segment]!;
    const to = points[segment + 1]!;
    const span = cumulative[segment + 1]! - cumulative[segment]!;
    const t = span > 0 ? (distance - cumulative[segment]!) / span : 0;
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
  };
  const dashes: Point2d[][] = [];
  let segment = 0;
  for (let start = (((phase % period) + period) % period) - period; start < length; start += period) {
    const a = Math.max(0, start);
    const b = Math.min(length, start + on);
    if (b <= a) continue;
    while (segment < points.length - 2 && cumulative[segment + 1]! <= a) segment += 1;
    const dash = [at(a, segment)];
    let cursor = segment;
    while (cursor < points.length - 2 && cumulative[cursor + 1]! < b) { cursor += 1; dash.push(points[cursor]!); }
    dash.push(at(b, cursor));
    dashes.push(dash);
  }
  return dashes;
}
