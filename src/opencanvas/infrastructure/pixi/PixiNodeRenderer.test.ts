import { describe, expect, it } from 'vitest';
import { createSceneIndex } from '../../domain/scene/spatialIndex';
import { createPixiSpikePage } from './spikeFixture';
import { PixiContainerRenderer } from './PixiContainerRenderer';
import { PixiNodeRenderer } from './PixiNodeRenderer';

describe('Pixi node renderer', () => {
  // A v1 import once handed the canvas 0-wide class and architecture nodes; one
  // negative rect threw and took the whole renderer down with it.
  it.each([
    { width: 0, height: 0 },
    { width: 1, height: 1 },
    { width: 12, height: 8 },
  ])('draws every node kind at $width×$height without throwing', (size) => {
    const spike = createPixiSpikePage(40);
    const page = { ...spike, nodes: spike.nodes.map((node) => ({ ...node, size })) };
    const index = createSceneIndex(page);

    expect(() => new PixiNodeRenderer().draw(page, index)).not.toThrow();
    expect(() => new PixiContainerRenderer().draw(page, index)).not.toThrow();
  });
});
