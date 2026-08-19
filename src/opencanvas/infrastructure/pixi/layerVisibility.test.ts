import { describe, expect, it } from 'vitest';
import { createSceneIndex } from '../../domain/scene/spatialIndex';
import { createTestConnector, createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { PixiConnectorRenderer } from './PixiConnectorRenderer';
import { PixiNodeRenderer } from './PixiNodeRenderer';

const layers = [
  { id: 'default', name: 'Default', visible: true, locked: false },
  { id: 'hidden', name: 'Hidden', visible: false, locked: false },
];

describe('Pixi canonical layer visibility', () => {
  it('omits hidden nodes and connectors from display records', () => {
    const visible = createTestNode('visible');
    const hidden = createTestNode('hidden-node', { layerId: 'hidden' });
    const page = createTestDocument({
      nodes: [visible, hidden],
      connectors: [createTestConnector('cross-layer', 'visible', 'hidden-node')],
      layers,
    }).pages[0];
    const nodes = new PixiNodeRenderer();
    nodes.draw(page, createSceneIndex(page), false, true, true, true, true, true, true, true, true);
    expect(nodes.getDebugSnapshot().map(({ id }) => id)).toEqual(['visible']);
    const connectors = new PixiConnectorRenderer();
    connectors.draw(page, true);
    expect(connectors.getDebugSnapshot().connectors).toBe(0);
  });
});
