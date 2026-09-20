import { describe, expect, it } from 'vitest';
import { anchoredMarqueeBounds, type AnchoredMarqueePointerOperation } from './pointerOperations';

describe('production pointer operations', () => {
  it('keeps the marquee world origin anchored while the camera scrolls', () => {
    const operation: AnchoredMarqueePointerOperation = {
      kind: 'marquee',
      pointerId: 1,
      startScreen: { x: 100, y: 100 },
      startWorld: { x: 36, y: 36 },
      currentScreen: { x: 790, y: 300 },
      additive: false,
    };

    expect(anchoredMarqueeBounds(operation, { x: 64, y: 64, zoom: 1 }))
      .toEqual({ x: 100, y: 100, width: 690, height: 200 });
    expect(anchoredMarqueeBounds(operation, { x: 44, y: 64, zoom: 1 }))
      .toEqual({ x: 80, y: 100, width: 710, height: 200 });
  });
});
