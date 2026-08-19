import { describe, expect, it } from 'vitest';
import { mindmapNodeOutlinePoints } from './mindmapNodeOutline';

describe('mindmap node outline', () => {
  it('creates deterministic ellipse and hexagon geometry inside local bounds', () => {
    const size = { width: 180, height: 72 };
    for (const shape of ['ellipse', 'hexagon'] as const) {
      const points = mindmapNodeOutlinePoints(shape, size);
      expect(points.length).toBeGreaterThanOrEqual(6);
      expect(
        points.every(({ x, y }) => x >= 0 && x <= size.width && y >= 0 && y <= size.height)
      ).toBe(true);
    }
  });
});
