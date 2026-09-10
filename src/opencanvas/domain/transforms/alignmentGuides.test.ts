import { describe, expect, it } from 'vitest';
import { computeAlignmentSnap } from './alignmentGuides';

const other = { x: 100, y: 100, width: 100, height: 50 };

describe('computeAlignmentSnap', () => {
  it('snaps a near-aligned left edge and centre line', () => {
    const snap = computeAlignmentSnap({ x: 104, y: 300, width: 60, height: 50 }, [other], 8);
    expect(snap.x).toBe(100);
    expect(snap.dx).toBe(-4);
    expect(snap.y).toBeNull();
    // Vertical centre of the mover at 325 vs other's 125: no horizontal guide.
    expect(snap.dy).toBe(0);
  });

  it('prefers the closest candidate and ignores far ones', () => {
    const snap = computeAlignmentSnap({ x: 147, y: 121, width: 10, height: 10 }, [other], 8);
    // Mover centre x=152 vs other centre 150 (distance 2) beats left 147→? none within 8 except centre.
    expect(snap.x).toBe(150);
    expect(snap.dx).toBe(-2);
    expect(snap.y).toBe(125);
    expect(snap.dy).toBe(-1);
  });

  it('returns no snap without candidates', () => {
    expect(computeAlignmentSnap(other, [], 8)).toEqual({ x: null, y: null, dx: 0, dy: 0 });
    expect(computeAlignmentSnap({ x: 900, y: 900, width: 10, height: 10 }, [other], 8).x).toBeNull();
  });
});
