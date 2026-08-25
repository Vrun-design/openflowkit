import { describe, expect, it } from 'vitest';
import { edgeScrollDelta, edgeScrollVelocity, hasEdgeScrollVelocity } from './edgeScroll';

describe('edge scroll', () => {
  const viewport = { width: 800, height: 600 };

  it('accelerates quadratically toward each viewport edge', () => {
    expect(edgeScrollVelocity({ x: 400, y: 300 }, viewport)).toEqual({ x: 0, y: 0 });
    expect(edgeScrollVelocity({ x: 28, y: 300 }, viewport)).toEqual({ x: 180, y: 0 });
    expect(edgeScrollVelocity({ x: 0, y: 600 }, viewport)).toEqual({ x: 720, y: -720 });
    expect(edgeScrollVelocity({ x: 800, y: 0 }, viewport)).toEqual({ x: -720, y: 720 });
    expect(edgeScrollVelocity({ x: 20, y: 20 }, { width: 40, height: 40 }))
      .toEqual({ x: 0, y: 0 });
  });

  it('bounds stalled frames and detects idle velocity', () => {
    expect(edgeScrollDelta({ x: 100, y: -200 }, 16)).toEqual({ x: 1.6, y: -3.2 });
    expect(edgeScrollDelta({ x: 100, y: -200 }, 10_000)).toEqual({ x: 4, y: -8 });
    expect(hasEdgeScrollVelocity({ x: 0, y: 0 })).toBe(false);
    expect(hasEdgeScrollVelocity({ x: 0, y: 1 })).toBe(true);
  });
});
