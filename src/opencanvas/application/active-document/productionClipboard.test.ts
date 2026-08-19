import { describe, expect, it } from 'vitest';
import { applyDocumentCommand } from '../../domain/commands/execute';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { buildPasteProductionNodeStyleCommand, buildPasteProductionSelectionCommand,
  copyProductionNodeStyle, copyProductionSelection } from './productionClipboard';

describe('production clipboard', () => {
  it('copies a hierarchy and internal connectors, remaps ids, offsets, and reverses atomically', () => {
    const root = createTestNode('root', { zIndex: 1 });
    const child = createTestNode('child', { parentId: 'root', zIndex: 2 });
    const outside = createTestNode('outside');
    const document = createTestDocument({ nodes: [root, child, outside], connectors: [{
      id: 'edge', source: { nodeId: 'root', portId: null, anchor: null },
      target: { nodeId: 'child', portId: null, anchor: null },
      route: { kind: 'direct', ownership: 'automatic' }, waypoints: [], labels: [],
      appearance: {}, semantics: {}, metadata: {}, extensions: {},
    }] });
    const snapshot = copyProductionSelection(document.pages[0], ['root']);
    let sequence = 0;
    const result = buildPasteProductionSelectionCommand(document.pages[0], snapshot,
      (kind) => `${kind}-copy-${++sequence}`, { x: 10, y: 20 });
    const applied = applyDocumentCommand(document, result.command);
    expect(result.pastedNodeIds).toEqual(['node-copy-1', 'node-copy-2']);
    expect(applied.document.pages[0].nodes.at(-1)).toMatchObject({ id: 'node-copy-2', parentId: 'node-copy-1' });
    expect(applied.document.pages[0].connectors.at(-1)).toMatchObject({
      id: 'connector-copy-3', source: { nodeId: 'node-copy-1' }, target: { nodeId: 'node-copy-2' },
    });
    expect(applyDocumentCommand(applied.document, applied.inverse).document).toEqual(document);
  });

  it('copies only style fields without replacing semantic content', () => {
    const source = createTestNode('source', { appearance: { opacity: 0.5 },
      content: { label: 'Source', color: 'red', shape: 'diamond', journeyScore: 4 } });
    const target = createTestNode('target', { content: { label: 'Target', color: 'blue', journeyScore: 1 } });
    const document = createTestDocument({ nodes: [source, target] });
    const command = buildPasteProductionNodeStyleCommand(document.pages[0], 'target', copyProductionNodeStyle(source))!;
    expect(command.kind === 'set-node' && command.after).toMatchObject({
      appearance: { opacity: 0.5 }, content: { label: 'Target', color: 'red', shape: 'diamond', journeyScore: 1 },
    });
  });
});
