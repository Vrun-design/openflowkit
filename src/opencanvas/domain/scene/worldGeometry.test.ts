import { describe, expect, it } from 'vitest';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { buildNodeWorldMatrices, nodeWorldBounds, nodeWorldCenter } from './worldGeometry';

describe('node world geometry', () => {
  it('composes nested parent translations into world bounds', () => {
    const parent = createTestNode('parent', {
      transform: { translation: { x: 100, y: 50 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
      size: { width: 400, height: 300 },
    });
    const child = createTestNode('child', {
      parentId: 'parent',
      transform: { translation: { x: 10, y: 20 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
      size: { width: 40, height: 30 },
    });
    const page = createTestDocument({ nodes: [parent, child] }).pages[0];
    const matrices = buildNodeWorldMatrices(page);

    expect(nodeWorldBounds(child, matrices.get('child')!)).toEqual({
      x: 110,
      y: 70,
      width: 40,
      height: 30,
    });
    expect(nodeWorldCenter(child, matrices.get('child')!)).toEqual({ x: 130, y: 85 });
  });

  it('maps a 90-degree rotation to swapped bounds extents and a rotated center', () => {
    const node = createTestNode('spun', {
      transform: {
        translation: { x: 200, y: 50 },
        rotationRadians: Math.PI / 2,
        scale: { x: 1, y: 1 },
      },
      size: { width: 100, height: 50 },
    });
    const page = createTestDocument({ nodes: [node] }).pages[0];
    const bounds = nodeWorldBounds(node, buildNodeWorldMatrices(page).get('spun')!);

    expect(bounds.x).toBeCloseTo(150, 4);
    expect(bounds.y).toBeCloseTo(50, 4);
    expect(bounds.width).toBeCloseTo(50, 4);
    expect(bounds.height).toBeCloseTo(100, 4);
    const center = nodeWorldCenter(node, buildNodeWorldMatrices(page).get('spun')!);
    expect(center.x).toBeCloseTo(175, 4);
    expect(center.y).toBeCloseTo(100, 4);
  });
});
