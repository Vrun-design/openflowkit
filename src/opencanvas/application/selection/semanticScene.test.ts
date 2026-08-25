import { describe, expect, it } from 'vitest';
import {
  createTestConnector,
  createTestDocument,
  createTestNode,
} from '../../testing/builders/documentBuilder';
import { buildSemanticSceneItems, semanticScenePageForItem } from './semanticScene';

describe('semantic scene projection', () => {
  it('projects visible nodes and bound connectors with useful descriptions', () => {
    const page = createTestDocument({
      nodes: [
        createTestNode('visible', { content: { label: 'Visible' } }),
        createTestNode('hidden', { content: { label: 'Hidden' } }),
      ],
      connectors: [createTestConnector('edge', 'visible', 'hidden')],
    }).pages[0];
    const hiddenLayer = { id: 'hidden-layer', name: 'Hidden', visible: false, locked: false };
    const projected = buildSemanticSceneItems({
      ...page,
      layers: [...page.layers, hiddenLayer],
      nodes: page.nodes.map((node) => node.id === 'hidden' ? { ...node, layerId: hiddenLayer.id } : node),
    });
    expect(projected).toEqual([{
      kind: 'node', id: 'visible', label: 'Visible', description: 'process node',
    }]);
  });

  it('locates items in bounded semantic pages', () => {
    const items = Array.from({ length: 205 }, (_, index) => ({
      kind: 'node' as const,
      id: `node-${index}`,
      label: `Node ${index}`,
      description: 'process node',
    }));
    expect(semanticScenePageForItem(items, 'node', 'node-0')).toBe(0);
    expect(semanticScenePageForItem(items, 'node', 'node-100')).toBe(1);
    expect(semanticScenePageForItem(items, 'node', 'node-204')).toBe(2);
    expect(semanticScenePageForItem(items, 'connector', 'node-0')).toBeNull();
  });
});
