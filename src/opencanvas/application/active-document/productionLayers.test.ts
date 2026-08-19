import { describe, expect, it } from 'vitest';
import { applyDocumentCommand } from '../../domain/commands/execute';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import {
  buildProductionLayerCommand,
  buildProductionInsertLayerCommand,
  buildProductionNodeLayerCommand,
  buildProductionRemoveLayerCommand,
  buildProductionReorderLayerCommand,
  isNodeEditableOnLayer,
} from './productionLayers';

const layers = [
  { id: 'default', name: 'Default', visible: true, locked: false },
  { id: 'hidden', name: 'Hidden', visible: false, locked: false },
  { id: 'locked', name: 'Locked', visible: true, locked: true },
];

describe('production layer organization', () => {
  it('edits a layer with validation, no-op detection, and exact inverse', () => {
    const document = createTestDocument({ layers });
    const command = buildProductionLayerCommand(document.pages[0], 'default', {
      name: 'Primary', visible: false, locked: true,
    })!;
    const applied = applyDocumentCommand(document, command);
    expect(applied.document.pages[0].layers[0]).toMatchObject({
      name: 'Primary', visible: false, locked: true,
    });
    expect(applyDocumentCommand(applied.document, applied.inverse).document).toEqual(document);
    expect(buildProductionLayerCommand(document.pages[0], 'default', {})).toBeNull();
    expect(() => buildProductionLayerCommand(document.pages[0], 'default', { name: ' ' }))
      .toThrow(/must not be empty/);
  });

  it('moves a hierarchy atomically to keep descendants organizationally coherent', () => {
    const parent = createTestNode('parent');
    const child = createTestNode('child', { parentId: 'parent' });
    const document = createTestDocument({ nodes: [parent, child], layers });
    const command = buildProductionNodeLayerCommand(document.pages[0], 'parent', 'locked')!;
    const applied = applyDocumentCommand(document, command);
    expect(applied.document.pages[0].nodes.map((node) => node.layerId)).toEqual(['locked', 'locked']);
    expect(applyDocumentCommand(applied.document, applied.inverse).document).toEqual(document);
  });

  it('reports editability from canonical visibility and lock state', () => {
    const page = createTestDocument({
      nodes: [
        createTestNode('editable'),
        createTestNode('hidden-node', { layerId: 'hidden' }),
        createTestNode('locked-node', { layerId: 'locked' }),
      ],
      layers,
    }).pages[0];
    expect(isNodeEditableOnLayer(page, 'editable')).toBe(true);
    expect(isNodeEditableOnLayer(page, 'hidden-node')).toBe(false);
    expect(isNodeEditableOnLayer(page, 'locked-node')).toBe(false);
  });

  it('adds, reorders, and deletes layers with exact atomic inverses', () => {
    const node = createTestNode('node', { layerId: 'locked' });
    const document = createTestDocument({ nodes: [node], layers });
    const added = applyDocumentCommand(document,
      buildProductionInsertLayerCommand(document.pages[0], 'notes', ' Notes '));
    expect(added.document.pages[0].layers.at(-1)?.name).toBe('Notes');
    const reorder = buildProductionReorderLayerCommand(document.pages[0], 'locked', 'up')!;
    const reordered = applyDocumentCommand(document, reorder);
    expect(reordered.document.pages[0].layers.map((layer) => layer.id))
      .toEqual(['default', 'locked', 'hidden']);
    expect(applyDocumentCommand(reordered.document, reordered.inverse).document).toEqual(document);
    const remove = buildProductionRemoveLayerCommand(document.pages[0], 'locked', 'default');
    const removed = applyDocumentCommand(document, remove);
    expect(removed.document.pages[0].layers.map((layer) => layer.id)).not.toContain('locked');
    expect(removed.document.pages[0].nodes[0].layerId).toBe('default');
    expect(applyDocumentCommand(removed.document, removed.inverse).document).toEqual(document);
  });
});
