import { describe, expect, it } from 'vitest';
import { shapeIconPath } from './shapeIcon';
import { SHAPE_OPTIONS } from './v2ToolCatalog';

const numbers = (path: string) => (path.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

describe('shapeIconPath', () => {
  it.each([...SHAPE_OPTIONS.map((option) => option.id), 'rectangle', 'ellipse'] as const)(
    '%s: a closed outline inside the 24px box', (shape) => {
      const path = shapeIconPath(shape as Parameters<typeof shapeIconPath>[0]);
      expect(path).toMatch(/^M[^Z]+Z/);
      const values = numbers(path);
      expect(values.length).toBeGreaterThanOrEqual(6);
      expect(values.every((value) => value >= 0 && value <= 24)).toBe(true);
    });

  it('keeps the shape proportions: a pill is wide, a circle square', () => {
    const span = (shape: Parameters<typeof shapeIconPath>[0]) => {
      const values = numbers(shapeIconPath(shape));
      const xs = values.filter((_, index) => index % 2 === 0);
      const ys = values.filter((_, index) => index % 2 === 1);
      return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    };
    const pill = span('capsule');
    expect(pill.w / pill.h).toBeGreaterThan(2);
    const circle = span('circle');
    expect(Math.abs(circle.w - circle.h)).toBeLessThan(0.5);
  });
});
