import { describe, expect, it } from 'vitest';
import {
  createTestConnector,
  createTestDocument,
  createTestNode,
} from '../../testing/builders/documentBuilder';
import { applyDocumentCommand } from './execute';
import type { BatchDocumentCommand, DocumentCommand } from './types';

describe('canonical document commands', () => {
  it('applies and exactly inverts a node replacement without mutating input', () => {
    const beforeNode = createTestNode('node-1');
    const afterNode = { ...beforeNode, content: { label: 'Edited' } };
    const document = createTestDocument({ nodes: [beforeNode] });
    const snapshot = structuredClone(document);
    const command: DocumentCommand = {
      kind: 'set-node',
      id: 'edit-node',
      label: 'Edit node',
      pageId: 'page-1',
      before: beforeNode,
      after: afterNode,
    };

    const applied = applyDocumentCommand(document, command);
    const restored = applyDocumentCommand(applied.document, applied.inverse);

    expect(applied.document.pages[0].nodes[0]).toEqual(afterNode);
    expect(restored.document).toEqual(document);
    expect(document).toEqual(snapshot);
    expect(applied.document).not.toBe(document);
  });

  it('rejects stale, no-op, and ID-changing node commands', () => {
    const node = createTestNode('node-1');
    const document = createTestDocument({ nodes: [node] });
    const base = { kind: 'set-node', id: 'edit', label: 'Edit', pageId: 'page-1' } as const;

    expect(() =>
      applyDocumentCommand(document, { ...base, before: { ...node, zIndex: 2 }, after: node })
    ).toThrow(/precondition/);
    expect(() => applyDocumentCommand(document, { ...base, before: node, after: node })).toThrow(
      /must change/
    );
    expect(() =>
      applyDocumentCommand(document, { ...base, before: node, after: { ...node, id: 'other' } })
    ).toThrow(/cannot change/);
  });

  it('sets and exactly inverts a layer', () => {
    const document = createTestDocument();
    const before = document.pages[0].layers[0];
    const applied = applyDocumentCommand(document, {
      kind: 'set-layer', id: 'hide-layer', label: 'Hide layer', pageId: 'page-1',
      before, after: { ...before, name: 'Main', visible: false, locked: true },
    });
    expect(applied.document.pages[0].layers[0]).toMatchObject({
      name: 'Main', visible: false, locked: true,
    });
    expect(applyDocumentCommand(applied.document, applied.inverse).document).toEqual(document);
  });

  it('inserts, removes, and exactly inverts layers', () => {
    const document = createTestDocument();
    const layer = { id: 'notes', name: 'Notes', visible: true, locked: false };
    const inserted = applyDocumentCommand(document, {
      kind: 'insert-layer', id: 'add-layer', label: 'Add layer', pageId: 'page-1',
      index: 1, layer,
    });
    expect(inserted.document.pages[0].layers).toHaveLength(2);
    expect(applyDocumentCommand(inserted.document, inserted.inverse).document).toEqual(document);
  });

  it('sets, inserts, removes, and exactly inverts pages', () => {
    const document = createTestDocument();
    const before = document.pages[0];
    const renamed = applyDocumentCommand(document, {
      kind: 'set-page', id: 'rename-page', label: 'Rename page', pageId: before.id,
      before, after: { ...before, name: 'Renamed' },
    });
    expect(renamed.document.pages[0].name).toBe('Renamed');
    expect(applyDocumentCommand(renamed.document, renamed.inverse).document).toEqual(document);
    const second = { ...before, id: 'page-2', name: 'Page 2' };
    const inserted = applyDocumentCommand(document, {
      kind: 'insert-page', id: 'add-page', label: 'Add page', index: 1, page: second,
    });
    expect(inserted.document.pages.map((page) => page.id)).toEqual(['page-1', 'page-2']);
    expect(applyDocumentCommand(inserted.document, inserted.inverse).document).toEqual(document);
    expect(() => applyDocumentCommand(document, {
      kind: 'remove-page', id: 'remove-only', label: 'Remove page', index: 0, page: before,
    })).toThrow(/Result document is invalid/);
  });

  it('inverts node and connector insertion/removal at exact collection positions', () => {
    const a = createTestNode('a');
    const b = createTestNode('b');
    const inserted = createTestNode('inserted');
    const connector = createTestConnector('a-b', 'a', 'b');
    const document = createTestDocument({ nodes: [a, b] });
    const commands: DocumentCommand[] = [
      {
        kind: 'insert-node',
        id: 'insert-node',
        label: 'Insert',
        pageId: 'page-1',
        index: 1,
        node: inserted,
      },
      {
        kind: 'insert-connector',
        id: 'insert-edge',
        label: 'Connect',
        pageId: 'page-1',
        index: 0,
        connector,
      },
    ];
    let current = document;
    const inverses: DocumentCommand[] = [];
    for (const command of commands) {
      const result = applyDocumentCommand(current, command);
      current = result.document;
      inverses.unshift(result.inverse);
    }
    expect(current.pages[0].nodes.map((node) => node.id)).toEqual(['a', 'inserted', 'b']);
    expect(current.pages[0].connectors).toEqual([connector]);
    for (const inverse of inverses) current = applyDocumentCommand(current, inverse).document;
    expect(current).toEqual(document);
  });

  it('sets and inverts connector routing', () => {
    const nodes = [createTestNode('a'), createTestNode('b')];
    const before = createTestConnector('edge', 'a', 'b');
    const after = {
      ...before,
      route: { kind: 'orthogonal', ownership: 'manual' } as const,
      waypoints: [{ x: 50, y: 80 }],
    };
    const document = createTestDocument({ nodes, connectors: [before] });
    const applied = applyDocumentCommand(document, {
      kind: 'set-connector',
      id: 'route',
      label: 'Route',
      pageId: 'page-1',
      before,
      after,
    });

    expect(applied.document.pages[0].connectors[0]).toEqual(after);
    expect(applyDocumentCommand(applied.document, applied.inverse).document).toEqual(document);
  });

  it('applies dependent removals atomically and inverts the whole batch exactly', () => {
    const a = createTestNode('a');
    const b = createTestNode('b');
    const connector = createTestConnector('edge', 'a', 'b');
    const document = createTestDocument({ nodes: [a, b], connectors: [connector] });
    const command: BatchDocumentCommand = {
      kind: 'batch',
      id: 'delete-selection',
      label: 'Delete selection',
      commands: [
        {
          kind: 'remove-connector',
          id: 'remove-edge',
          label: 'Remove edge',
          pageId: 'page-1',
          index: 0,
          connector,
        },
        {
          kind: 'remove-node',
          id: 'remove-node',
          label: 'Remove node',
          pageId: 'page-1',
          index: 0,
          node: a,
        },
      ],
    };

    const applied = applyDocumentCommand(document, command);
    expect(applied.document.pages[0].nodes).toEqual([b]);
    expect(applied.document.pages[0].connectors).toEqual([]);
    expect(applyDocumentCommand(applied.document, applied.inverse).document).toEqual(document);
  });

  it('rejects commands whose final document is invalid', () => {
    const a = createTestNode('a');
    const b = createTestNode('b');
    const connector = createTestConnector('edge', 'a', 'b');
    const document = createTestDocument({ nodes: [a, b], connectors: [connector] });

    expect(() =>
      applyDocumentCommand(document, {
        kind: 'remove-node',
        id: 'remove',
        label: 'Remove',
        pageId: 'page-1',
        index: 0,
        node: a,
      })
    ).toThrow(/Result document is invalid/);
    expect(() =>
      applyDocumentCommand(createTestDocument({ nodes: [a] }), {
        kind: 'insert-connector',
        id: 'add',
        label: 'Add',
        pageId: 'page-1',
        index: 0,
        connector,
      })
    ).toThrow(/Result document is invalid/);
  });

  it('rejects empty and nested batches', () => {
    const document = createTestDocument();
    const empty: BatchDocumentCommand = {
      kind: 'batch',
      id: 'empty',
      label: 'Empty',
      commands: [],
    };
    expect(() => applyDocumentCommand(document, empty)).toThrow(/at least one/);
    expect(() =>
      applyDocumentCommand(document, {
        kind: 'batch',
        id: 'outer',
        label: 'Outer',
        commands: [empty],
      })
    ).toThrow(/Nested/);
  });
});
