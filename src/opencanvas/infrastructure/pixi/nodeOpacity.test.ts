import { describe, expect, it } from 'vitest';
import { createSceneIndex } from '../../domain/scene/spatialIndex';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { PixiNodeRenderer } from './PixiNodeRenderer';

describe('Pixi node opacity', () => {
  it('dims the label container of a basic node by appearance.opacity', () => {
    const dimmed = createTestNode('dimmed', { appearance: { opacity: 0.2 } });
    const plain = createTestNode('plain');
    const page = createTestDocument({ nodes: [dimmed, plain] }).pages[0];
    const renderer = new PixiNodeRenderer();
    renderer.draw(page, createSceneIndex(page));
    expect(renderer.labels.children[0]?.alpha).toBeCloseTo(0.2);
    expect(renderer.labels.children[1]?.alpha).toBe(1);
  });
});
