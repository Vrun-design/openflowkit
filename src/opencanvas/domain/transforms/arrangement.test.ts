import { describe, expect, it } from 'vitest';
import { applyDocumentCommand } from '../commands/execute';
import { createTransformCommand } from './transformSelection';
import { buildNodeWorldMatrices, nodeWorldBounds } from '../scene/worldGeometry';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { alignNodes, distributeNodes, gridNodes, packNodes, stackNodes, tidyNodes } from './arrangement';

function worldBounds(page: ReturnType<typeof createTestDocument>['pages'][number], id: string) {
  const node = page.nodes.find((candidate) => candidate.id === id)!;
  return nodeWorldBounds(node, buildNodeWorldMatrices(page).get(id)!);
}

describe('canonical arrangement transforms', () => {
  it('aligns parented nodes in world space and reverses exactly', () => {
    const parent = createTestNode('parent', { transform: {
      translation: { x: 100, y: 50 }, rotationRadians: Math.PI / 2, scale: { x: 1, y: 1 },
    } });
    const child = createTestNode('child', { parentId: 'parent', transform: {
      translation: { x: 20, y: 30 }, rotationRadians: 0, scale: { x: 1, y: 1 },
    } });
    const peer = createTestNode('peer', { transform: {
      translation: { x: 220, y: 90 }, rotationRadians: 0, scale: { x: 1, y: 1 },
    } });
    const document = createTestDocument({ nodes: [parent, child, peer] });
    const result = alignNodes(document.pages[0], ['child', 'peer'], 'left');
    const before = result.nodes.map((node) => document.pages[0].nodes.find(({ id }) => id === node.id)!);
    const command = createTransformCommand(document.pages[0].id, before, result.nodes, 'Align');
    const applied = applyDocumentCommand(document, command);
    expect(worldBounds(applied.document.pages[0], 'child').x)
      .toBeCloseTo(worldBounds(applied.document.pages[0], 'peer').x);
    expect(applyDocumentCommand(applied.document, applied.inverse).document).toEqual(document);
  });

  it('distributes three nodes with equal edge gaps', () => {
    const nodes = [
      createTestNode('a', { transform: { translation: { x: 0, y: 0 }, rotationRadians: 0, scale: { x: 1, y: 1 } } }),
      createTestNode('b', { transform: { translation: { x: 270, y: 0 }, rotationRadians: 0, scale: { x: 1, y: 1 } } }),
      createTestNode('c', { transform: { translation: { x: 500, y: 0 }, rotationRadians: 0, scale: { x: 1, y: 1 } } }),
    ];
    const page = createTestDocument({ nodes }).pages[0];
    const result = distributeNodes(page, ['a', 'b', 'c'], 'horizontal');
    const preview = {
      ...page,
      nodes: page.nodes.map((node) => result.nodes.find(({ id }) => id === node.id) ?? node),
    };
    const a = worldBounds(preview, 'a');
    const b = worldBounds(preview, 'b');
    const c = worldBounds(preview, 'c');
    expect(b.x - a.x - a.width).toBeCloseTo(c.x - b.x - b.width);
  });

  it('stacks, grids, tidies, and packs deterministically', () => {
    const nodes = ['d', 'b', 'a', 'c'].map((id, index) => createTestNode(id, {
      transform: { translation: { x: index * 150, y: index * 35 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
    }));
    const page = createTestDocument({ nodes }).pages[0];
    expect(stackNodes(page, nodes.map(({ id }) => id), 'vertical', 10).nodes).toHaveLength(3);
    expect(gridNodes(page, nodes.map(({ id }) => id), 2, 10)).toEqual(
      tidyNodes(page, nodes.map(({ id }) => id), 10)
    );
    const packed = packNodes(page, nodes.map(({ id }) => id), 8);
    expect(packed.bounds.width).toBeLessThan(
      gridNodes(page, nodes.map(({ id }) => id), 2, 24).bounds.width
    );
    expect(packNodes(page, nodes.map(({ id }) => id), 8)).toEqual(packed);
  });

  it('moves only selected roots when an ancestor and descendant are both selected', () => {
    const parent = createTestNode('parent');
    const child = createTestNode('child', { parentId: 'parent' });
    const peer = createTestNode('peer', { transform: {
      translation: { x: 200, y: 0 }, rotationRadians: 0, scale: { x: 1, y: 1 },
    } });
    const result = alignNodes(
      createTestDocument({ nodes: [parent, child, peer] }).pages[0],
      ['parent', 'child', 'peer'], 'left'
    );
    expect(result.nodes.map(({ id }) => id)).not.toContain('child');
  });
});
