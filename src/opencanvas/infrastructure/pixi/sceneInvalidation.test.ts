import { describe, expect, it } from 'vitest';
import { createPixiSpikePage } from './spikeFixture';
import { shouldRedrawNodes } from './sceneInvalidation';

describe('Pixi scene invalidation', () => {
  it('keeps node display objects for connector-only immutable updates', () => {
    const page = createPixiSpikePage(4);
    const connectorUpdate = { ...page, connectors: page.connectors.slice(1) };

    expect(shouldRedrawNodes(page, connectorUpdate)).toBe(false);
  });

  it('redraws nodes for initial load and node collection changes', () => {
    const page = createPixiSpikePage(4);

    expect(shouldRedrawNodes(null, page)).toBe(true);
    expect(shouldRedrawNodes(page, { ...page, nodes: [...page.nodes] })).toBe(true);
    expect(shouldRedrawNodes(page, {
      ...page,
      layers: page.layers.map((layer) => ({ ...layer, visible: false })),
    })).toBe(true);
  });
});
