import { describe, expect, it } from 'vitest';
import { createBounds2d } from '../geometry/bounds';
import { snapBoundsToObjects } from './objectSnap';

const b = createBounds2d;

describe('snapBoundsToObjects', () => {
  it('snaps left edge to left edge', () => {
    const r = snapBoundsToObjects(b(104, 300, 50, 50), [b(100, 0, 80, 40)]);
    expect(r.bounds).toEqual(b(100, 300, 50, 50));
    expect(r.guideX).toBe(100);
    expect(r.guideY).toBeNull();
  });

  it('snaps centre to centre', () => {
    // other centre x = 140; moving centre x = 143
    const r = snapBoundsToObjects(b(118, 300, 50, 50), [b(100, 0, 80, 40)]);
    expect(r.bounds.x).toBe(115);
    expect(r.guideX).toBe(140);
  });

  it('snaps right edge to another left edge', () => {
    // moving right = 97, other left = 100
    const r = snapBoundsToObjects(b(47, 300, 50, 50), [b(100, 0, 80, 40)]);
    expect(r.bounds.x).toBe(50);
    expect(r.guideX).toBe(100);
  });

  it('snaps both axes at once', () => {
    const r = snapBoundsToObjects(b(103, 4, 50, 50), [b(100, 0, 80, 40)]);
    expect(r.bounds).toEqual(b(100, 0, 50, 50));
    expect(r.guideX).toBe(100);
    expect(r.guideY).toBe(0);
  });

  it('does nothing beyond the threshold', () => {
    const moving = b(300, 300, 50, 50);
    const r = snapBoundsToObjects(moving, [b(100, 0, 80, 40)], 6);
    expect(r.bounds).toBe(moving);
    expect(r.guideX).toBeNull();
    expect(r.guideY).toBeNull();
  });

  it('prefers centre on ties', () => {
    // other: left 100, centre 125, right 150 (width 50). moving width 50 at x=102:
    // left→left delta -2, centre(127)→centre delta -2. Tie → centre.
    const r = snapBoundsToObjects(b(102, 300, 50, 50), [b(100, 0, 50, 40)]);
    expect(r.guideX).toBe(125);
    expect(r.bounds.x).toBe(100);
  });

  it('returns the input unchanged for empty others', () => {
    const moving = b(1, 2, 3, 4);
    const r = snapBoundsToObjects(moving, []);
    expect(r).toEqual({ bounds: moving, guideX: null, guideY: null });
  });
});
