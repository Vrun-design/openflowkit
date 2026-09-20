// Object-to-object snapping for v2 transforms: bounds in, snapped bounds + guide lines out.
// Thin wrapper over computeAlignmentSnap so v2 and legacy share one snap algorithm.
import { createBounds2d } from '../geometry/bounds';
import type { Bounds2d } from '../geometry/types';
import { computeAlignmentSnap } from './alignmentGuides';

export interface ObjectSnapResult {
  readonly bounds: Bounds2d;
  readonly guideX: number | null;
  readonly guideY: number | null;
}

export function snapBoundsToObjects(
  bounds: Bounds2d,
  others: readonly Bounds2d[],
  threshold = 6
): ObjectSnapResult {
  const snap = computeAlignmentSnap(bounds, others, threshold);
  if (snap.x === null && snap.y === null) return { bounds, guideX: null, guideY: null };
  return {
    bounds: createBounds2d(bounds.x + snap.dx, bounds.y + snap.dy, bounds.width, bounds.height),
    guideX: snap.x,
    guideY: snap.y,
  };
}
