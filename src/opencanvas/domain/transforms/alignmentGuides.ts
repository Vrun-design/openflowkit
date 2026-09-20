import type { Bounds2d } from '../geometry/types';

export interface AlignmentSnap {
  /** World x of the vertical guide the selection snapped to, if any. */
  readonly x: number | null;
  /** World y of the horizontal guide the selection snapped to, if any. */
  readonly y: number | null;
  /** Translation to apply to the moving bounds to sit on the guides. */
  readonly dx: number;
  readonly dy: number;
}

const NO_SNAP: AlignmentSnap = { x: null, y: null, dx: 0, dy: 0 };

// Centre first: `nearest` keeps the first of equal distances, so ties prefer centre.
function xAnchors(bounds: Bounds2d): readonly number[] {
  return [bounds.x + bounds.width / 2, bounds.x, bounds.x + bounds.width];
}

function yAnchors(bounds: Bounds2d): readonly number[] {
  return [bounds.y + bounds.height / 2, bounds.y, bounds.y + bounds.height];
}

function nearest(
  moving: readonly number[],
  candidates: readonly number[],
  threshold: number
): { readonly guide: number | null; readonly delta: number } {
  let best = { guide: null as number | null, delta: 0, distance: Number.POSITIVE_INFINITY };
  for (const anchor of moving) {
    for (const candidate of candidates) {
      const distance = Math.abs(candidate - anchor);
      if (distance <= threshold && distance < best.distance) {
        best = { guide: candidate, delta: candidate - anchor, distance };
      }
    }
  }
  return best;
}

/**
 * Edges and centres of the moving bounds snap to the nearest edge/centre of
 * any other bounds within `threshold` world units, per axis.
 */
export function computeAlignmentSnap(
  moving: Bounds2d,
  others: readonly Bounds2d[],
  threshold: number
): AlignmentSnap {
  if (others.length === 0 || threshold <= 0) return NO_SNAP;
  const xs = others.flatMap(xAnchors);
  const ys = others.flatMap(yAnchors);
  const x = nearest(xAnchors(moving), xs, threshold);
  const y = nearest(yAnchors(moving), ys, threshold);
  if (x.guide === null && y.guide === null) return NO_SNAP;
  return { x: x.guide, y: y.guide, dx: x.delta, dy: y.delta };
}
