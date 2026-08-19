import { describe, expect, it } from 'vitest';
import { applyDocumentCommand } from '../../domain/commands/execute';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { buildProductionScopedLayoutCommand } from './productionScopedLayout';

describe('production scoped layout', () => {
  it('lays out only a selected hierarchy, preserves pinned nodes and routes, and reverses', async () => {
    const root = createTestNode('root');
    const child = createTestNode('child', { parentId: 'root' });
    const pinned = createTestNode('pinned', { content: { pinned: true },
      transform: { ...createTestNode('x').transform, translation: { x: 50, y: 60 } } });
    const outside = createTestNode('outside');
    const document = createTestDocument({ nodes: [root, child, pinned, outside] });
    const command = await buildProductionScopedLayoutCommand(document, 'page-1', ['root', 'pinned'], {},
      async (nodes, edges) => ({ edges, nodes: nodes.map((node, index) => ({ ...node,
        position: { x: 100 + index * 20, y: 200 + index * 10 } })) }));
    const applied = applyDocumentCommand(document, command!);
    expect(applied.document.pages[0].nodes.map((node) => node.transform.translation)).toEqual([
      { x: 100, y: 200 }, { x: 120, y: 210 }, { x: 50, y: 60 }, { x: 0, y: 0 },
    ]);
    expect(applyDocumentCommand(applied.document, applied.inverse).document).toEqual(document);
  });

  it('rejects unknown scope and invalid layout geometry', async () => {
    const document = createTestDocument({ nodes: [createTestNode('a')] });
    await expect(buildProductionScopedLayoutCommand(document, 'page-1', ['missing']))
      .rejects.toThrow(/unknown node/);
    await expect(buildProductionScopedLayoutCommand(document, 'page-1', [], {},
      async (nodes, edges) => ({ edges, nodes: nodes.map((node) => ({ ...node,
        position: { x: Number.NaN, y: 0 } })) }))).rejects.toThrow(/finite geometry/);
  });
});
