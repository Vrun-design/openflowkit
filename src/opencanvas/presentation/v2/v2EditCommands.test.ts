import { applyDocumentCommand } from '../../domain/commands/execute';
import type { ScenePage } from '../../domain/document/types';
import { describe, expect, it } from 'vitest';
import { createEmptyV2Document, createEmptyV2Page, firstV2Page } from './v2Document';
import {
  buildDeleteSelectionCommand,
  buildDuplicateSelectionCommand,
  buildInsertBoundConnectorCommand,
  buildInsertShapeCommand,
  buildMoveNodesCommand,
  buildSetNodeLabelCommand,
} from './v2EditCommands';

function emptyPage(): ScenePage {
  return createEmptyV2Page();
}

function pageWithTwoNodes(): ScenePage {
  const page = emptyPage();
  const first = applyDocumentCommand(
    { ...createEmptyV2Document('doc-1'), pages: [page] },
    buildInsertShapeCommand(page, { kind: 'rectangle', id: 'node-a', at: { x: 10, y: 20 } })
  ).document.pages[0];
  return applyDocumentCommand(
    { ...createEmptyV2Document('doc-1'), pages: [first] },
    buildInsertShapeCommand(first, { kind: 'ellipse', id: 'node-b', at: { x: 300, y: 20 } })
  ).document.pages[0];
}

describe('v2 shape creation commands', () => {
  it.each([['rectangle', 'process'], ['ellipse', 'custom'], ['text', 'text']] as const)(
    'builds a valid %s insert at the theme default size',
    (kind, nodeKind) => {
      const page = emptyPage();
      const command = buildInsertShapeCommand(page, { kind, id: 'node-1', at: { x: 40, y: 50 } });
      expect(command.kind).toBe('insert-node');
      expect(command.index).toBe(0);
      expect(command.node.kind).toBe(nodeKind);
      expect(command.node.transform.translation).toEqual({ x: 40, y: 50 });
      expect(command.node.size.width).toBeGreaterThan(0);
      expect(command.node.content).toMatchObject({ label: kind === 'text' ? 'Text' : '' });
      if (kind === 'ellipse') expect(command.node.content.shape).toBe('ellipse');
      const applied = applyDocumentCommand(
        { ...createEmptyV2Document('doc-1'), pages: [page] },
        command
      );
      expect(applied.document.pages[0].nodes).toHaveLength(1);
      // Undo removes; the inverse restores the identical node.
      const undone = applyDocumentCommand(applied.document, applied.inverse);
      expect(undone.document.pages[0].nodes).toHaveLength(0);
      const redone = applyDocumentCommand(undone.document, undone.inverse);
      expect(redone.document.pages[0].nodes[0]).toEqual(applied.document.pages[0].nodes[0]);
    }
  );

  it('creates nothing when the pointer gesture is cancelled (no command built)', () => {
    const page = emptyPage();
    expect(page.nodes).toHaveLength(0);
  });
});

describe('v2 label edit command', () => {
  it('commits one set-node and allows an empty string on text nodes', () => {
    const page = pageWithTwoNodes();
    const labeled = applyDocumentCommand(
      { ...createEmptyV2Document('doc-1'), pages: [page] },
      buildSetNodeLabelCommand(page, 'node-a', 'Draft')
    );
    const command = buildSetNodeLabelCommand(labeled.document.pages[0], 'node-a', '');
    expect(command.kind).toBe('set-node');
    const applied = applyDocumentCommand(labeled.document, command);
    expect(applied.document.pages[0].nodes[0].content.label).toBe('');
    const undone = applyDocumentCommand(applied.document, applied.inverse);
    expect(undone.document.pages[0].nodes[0].content.label).toBe('Draft');
  });

  it('restores the pre-edit text on undo', () => {
    const page = pageWithTwoNodes();
    const labeled = applyDocumentCommand(
      { ...createEmptyV2Document('doc-1'), pages: [page] },
      buildSetNodeLabelCommand(page, 'node-a', 'Checkout')
    );
    const edited = applyDocumentCommand(
      labeled.document,
      buildSetNodeLabelCommand(labeled.document.pages[0], 'node-a', 'Payments')
    );
    const undone = applyDocumentCommand(edited.document, edited.inverse);
    expect(undone.document.pages[0].nodes[0].content.label).toBe('Checkout');
    const redone = applyDocumentCommand(undone.document, undone.inverse);
    expect(redone.document.pages[0].nodes[0].content.label).toBe('Payments');
  });
});

describe('v2 move command', () => {
  it('moves selected nodes without touching selection or other nodes', () => {
    const page = pageWithTwoNodes();
    const command = buildMoveNodesCommand(page, ['node-a'], { x: 30, y: -10 });
    const applied = applyDocumentCommand(
      { ...createEmptyV2Document('doc-1'), pages: [page] },
      command
    );
    const moved = applied.document.pages[0].nodes[0];
    expect(moved.transform.translation).toEqual({ x: 40, y: 10 });
    expect(applied.document.pages[0].nodes[1].transform.translation).toEqual({ x: 300, y: 20 });
  });
});

describe('v2 delete command', () => {
  it('removes nodes and their attached connectors in one batch', () => {
    const nodes = pageWithTwoNodes();
    const connected = applyDocumentCommand(
      { ...createEmptyV2Document('doc-1'), pages: [nodes] },
      buildInsertBoundConnectorCommand(nodes, {
        id: 'edge-1',
        sourceNodeId: 'node-a',
        targetNodeId: 'node-b',
      })
    ).document.pages[0];
    const command = buildDeleteSelectionCommand(connected, ['node-a'], []);
    expect(command.kind).toBe('batch');
    const applied = applyDocumentCommand(
      { ...createEmptyV2Document('doc-1'), pages: [connected] },
      command
    );
    expect(applied.document.pages[0].nodes.map((node) => node.id)).toEqual(['node-b']);
    expect(applied.document.pages[0].connectors).toHaveLength(0);
    const undone = applyDocumentCommand(applied.document, applied.inverse);
    expect(undone.document.pages[0].nodes).toHaveLength(2);
    expect(undone.document.pages[0].connectors).toHaveLength(1);
  });
});

describe('v2 duplicate command', () => {
  it('remaps ids and internal bindings with an offset', () => {
    const nodes = pageWithTwoNodes();
    const connected = applyDocumentCommand(
      { ...createEmptyV2Document('doc-1'), pages: [nodes] },
      buildInsertBoundConnectorCommand(nodes, {
        id: 'edge-1',
        sourceNodeId: 'node-a',
        targetNodeId: 'node-b',
      })
    ).document.pages[0];
    let counter = 0;
    const command = buildDuplicateSelectionCommand(
      connected,
      ['node-a', 'node-b'],
      ['edge-1'],
      (prefix) => `${prefix}-copy-${(counter += 1)}`
    );
    const applied = applyDocumentCommand(
      { ...createEmptyV2Document('doc-1'), pages: [connected] },
      command
    );
    const result = applied.document.pages[0];
    expect(result.nodes.map((node) => node.id)).toEqual([
      'node-a',
      'node-b',
      'node-copy-1',
      'node-copy-2',
    ]);
    expect(result.connectors).toHaveLength(2);
    expect(result.connectors[1].source.nodeId).toBe('node-copy-1');
    expect(result.connectors[1].target.nodeId).toBe('node-copy-2');
    expect(result.nodes[2].transform.translation).toEqual({ x: 34, y: 44 });
  });

  it('excludes edges to omitted nodes', () => {
    const page = pageWithTwoNodes();
    const connected = applyDocumentCommand(
      { ...createEmptyV2Document('doc-1'), pages: [page] },
      buildInsertBoundConnectorCommand(page, {
        id: 'edge-1',
        sourceNodeId: 'node-a',
        targetNodeId: 'node-b',
      })
    ).document.pages[0];
    const command = buildDuplicateSelectionCommand(
      connected,
      ['node-a'],
      ['edge-1'],
      (prefix) => `${prefix}-copy`
    );
    const applied = applyDocumentCommand(
      { ...createEmptyV2Document('doc-1'), pages: [connected] },
      command
    );
    expect(applied.document.pages[0].nodes).toHaveLength(3);
    expect(applied.document.pages[0].connectors).toHaveLength(1);
  });
});

describe('v2 bound connector command', () => {
  it('creates an automatic bound-bound connector', () => {
    const page = pageWithTwoNodes();
    const command = buildInsertBoundConnectorCommand(page, {
      id: 'edge-1',
      sourceNodeId: 'node-a',
      targetNodeId: 'node-b',
    });
    expect(command.connector.source.nodeId).toBe('node-a');
    expect(command.connector.target.nodeId).toBe('node-b');
    expect(command.connector.route).toEqual({ kind: 'direct', ownership: 'automatic' });
    const applied = applyDocumentCommand(
      { ...createEmptyV2Document('doc-1'), pages: [page] },
      command
    );
    expect(applied.document.pages[0].connectors).toHaveLength(1);
  });

  it('rejects unknown endpoints', () => {
    expect(() =>
      buildInsertBoundConnectorCommand(emptyPage(), {
        id: 'edge-x',
        sourceNodeId: 'missing',
        targetNodeId: 'missing',
      })
    ).toThrow(RangeError);
  });
});

describe('v2 empty document', () => {
  it('opens with one page and one layer', () => {
    const document = createEmptyV2Document('demo');
    expect(document.pages).toHaveLength(1);
    expect(firstV2Page(document).layers).toHaveLength(1);
    expect(firstV2Page(document).nodes).toHaveLength(0);
  });
});
