import { describe, expect, it } from 'vitest';
import { LIBRARY_SHAPES } from './shapeNode';
import { basicNodeOutlinePoints } from './basicNodeOutline';
import { basicNodeDecorations } from './basicNodeDecorations';

const SIZE = { width: 160, height: 100 };

function bounds(points: readonly { readonly x: number; readonly y: number }[]) {
  return {
    minX: Math.min(...points.map(({ x }) => x)),
    maxX: Math.max(...points.map(({ x }) => x)),
    minY: Math.min(...points.map(({ y }) => y)),
    maxY: Math.max(...points.map(({ y }) => y)),
  };
}

const CURVED = [
  'circle', 'ellipse', 'cloud', 'cylinder', 'venn', 'heart', 'pin', 'half-round',
  'brace', 'callout-stack', 'list-card', 'filled-bar', 'target',
  'check-circle', 'cross-circle', 'numbered-circle',
] as const;

describe('library shape outlines', () => {
  it.each(LIBRARY_SHAPES)('%s: finite points inside the node box', (shape) => {
    const points = basicNodeOutlinePoints(shape, SIZE);
    expect(points.length).toBeGreaterThanOrEqual(3);
    expect(points.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y))).toBe(true);
    const box = bounds(points);
    expect(box.minX).toBeGreaterThanOrEqual(-1e-9);
    expect(box.minY).toBeGreaterThanOrEqual(-1e-9);
    expect(box.maxX).toBeLessThanOrEqual(SIZE.width + 1e-9);
    expect(box.maxY).toBeLessThanOrEqual(SIZE.height + 1e-9);
  });

  it.each(LIBRARY_SHAPES)('%s: fills the box on at least one axis', (shape) => {
    const box = bounds(basicNodeOutlinePoints(shape, SIZE));
    const spansWidth = box.maxX - box.minX > SIZE.width * 0.6;
    const spansHeight = box.maxY - box.minY > SIZE.height * 0.6;
    expect(spansWidth || spansHeight).toBe(true);
  });

  it.each(CURVED)('%s: curves carry at least 12 samples', (shape) => {
    expect(basicNodeOutlinePoints(shape, SIZE).length).toBeGreaterThanOrEqual(12);
  });

  it.each(LIBRARY_SHAPES)('%s: stable point count, deterministic, grows with the box', (shape) => {
    const small = basicNodeOutlinePoints(shape, SIZE);
    const wide = basicNodeOutlinePoints(shape, { width: 320, height: 200 });
    expect(wide).toHaveLength(small.length);
    const smallBox = bounds(small);
    const wideBox = bounds(wide);
    // Clamped shapes (cylinder rims, parallelogram skew) grow a little less
    // than the box; none may grow more.
    expect(wideBox.maxX - wideBox.minX).toBeGreaterThan(smallBox.maxX - smallBox.minX);
    expect(wideBox.maxY - wideBox.minY).toBeGreaterThan(smallBox.maxY - smallBox.minY);
    expect(basicNodeOutlinePoints(shape, SIZE)).toEqual(small);
  });

  it.each(['rectangle', 'diamond', 'triangle', 'star', 'octagon', 'plus', 'arrow-up'] as const)(
    '%s: scales with its box point for point',
    (shape) => {
      const small = basicNodeOutlinePoints(shape, SIZE);
      const wide = basicNodeOutlinePoints(shape, { width: 320, height: 200 });
      wide.forEach((point, index) => {
        expect(point.x).toBeCloseTo(small[index]!.x * 2, 6);
        expect(point.y).toBeCloseTo(small[index]!.y * 2, 6);
      });
    }
  );

  it('keeps symmetric shapes symmetric about the vertical axis', () => {
    for (const shape of ['triangle', 'diamond', 'ellipse', 'hexagon', 'octagon',
      'plus', 'star', 'target', 'arrow-up', 'arrow-down', 'circle'] as const) {
      const points = basicNodeOutlinePoints(shape, SIZE);
      const mirrored = points.map(({ x, y }) => ({ x: SIZE.width - x, y }));
      for (const point of mirrored) {
        expect(points.some((candidate) =>
          Math.abs(candidate.x - point.x) < 1e-6 && Math.abs(candidate.y - point.y) < 1e-6
        )).toBe(true);
      }
    }
  });

  it('points the four block arrows in four directions', () => {
    const up = basicNodeOutlinePoints('arrow-up', SIZE);
    const tipUp = up.reduce((best, point) => (point.y < best.y ? point : best), up[0]!);
    const down = basicNodeOutlinePoints('arrow-down', SIZE);
    const tipDown = down.reduce((best, point) => (point.y > best.y ? point : best), down[0]!);
    const right = basicNodeOutlinePoints('arrow-right', SIZE);
    const tipRight = right.reduce((best, point) => (point.x > best.x ? point : best), right[0]!);
    expect(tipUp.y).toBeCloseTo(0, 6);
    expect(tipDown.y).toBeCloseTo(SIZE.height, 6);
    expect(tipRight.x).toBeCloseTo(SIZE.width, 6);
  });
});

describe('library shape decorations', () => {
  const DECORATED = [
    'venn', 'target', 'cube', 'prism', 'page', 'check-circle', 'cross-circle',
    'list-card', 'layer-stack', 'callout-stack', 'panel',
  ] as const;

  it.each(DECORATED)('%s: draws inside the shape box', (shape) => {
    const lines = basicNodeDecorations(shape, SIZE);
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line.length).toBeGreaterThanOrEqual(2);
      const box = bounds(line);
      expect(box.minX).toBeGreaterThanOrEqual(-1e-9);
      expect(box.minY).toBeGreaterThanOrEqual(-1e-9);
      expect(box.maxX).toBeLessThanOrEqual(SIZE.width + 1e-9);
      expect(box.maxY).toBeLessThanOrEqual(SIZE.height + 1e-9);
    }
  });

  it('leaves plain shapes undecorated', () => {
    for (const shape of ['rectangle', 'diamond', 'ellipse', 'star', 'heart'] as const) {
      expect(basicNodeDecorations(shape, SIZE)).toEqual([]);
    }
  });
});
