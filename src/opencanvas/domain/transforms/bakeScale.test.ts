import { describe, expect, it } from 'vitest';
import { createTestNode } from '../../testing/builders/documentBuilder';
import { bakeTransformScale } from './bakeScale';

describe('bakeTransformScale', () => {
  it('returns the same node when scale is identity', () => {
    const node = createTestNode('a');
    expect(bakeTransformScale(node)).toBe(node);
  });

  it('folds scale into size and resets it', () => {
    const node = createTestNode('a', {
      size: { width: 120, height: 60 },
      transform: { translation: { x: 0, y: 0 }, rotationRadians: 0.3, scale: { x: 2, y: 1.5 } },
    });
    const baked = bakeTransformScale(node);
    expect(baked.size).toEqual({ width: 240, height: 90 });
    expect(baked.transform).toEqual({ ...node.transform, scale: { x: 1, y: 1 } });
  });

  it('scales stroke points that live in content', () => {
    const node = createTestNode('pen', {
      kind: 'pen',
      content: { points: [{ x: 0, y: 0 }, { x: 10, y: 4, pressure: 0.5 }] },
      transform: { translation: { x: 0, y: 0 }, rotationRadians: 0, scale: { x: 2, y: 3 } },
    });
    expect(bakeTransformScale(node).content.points).toEqual([{ x: 0, y: 0 }, { x: 20, y: 12, pressure: 0.5 }]);
  });
});
