import { describe, expect, it } from 'vitest';
import type { DocumentCommand } from '../../domain/commands/types';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import {
  canRedoDocument,
  canUndoDocument,
  commitDocumentCommand,
  createDocumentHistory,
  redoDocumentCommand,
  undoDocumentCommand,
} from './history';

function editLabelCommand(label: string, previousLabel = 'node-1'): DocumentCommand {
  const before = createTestNode('node-1', { content: { label: previousLabel } });
  return {
    kind: 'set-node',
    id: `label-${label}`,
    label: 'Edit label',
    pageId: 'page-1',
    before,
    after: { ...before, content: { label } },
  };
}

describe('canonical document history', () => {
  it('commits, undoes, and redoes exact documents', () => {
    const document = createTestDocument({ nodes: [createTestNode('node-1')] });
    const committed = commitDocumentCommand(
      createDocumentHistory(document),
      editLabelCommand('Edited')
    );
    const undone = undoDocumentCommand(committed);
    const redone = redoDocumentCommand(undone);

    expect(committed.present.pages[0].nodes[0].content.label).toBe('Edited');
    expect(undone.present).toEqual(document);
    expect(redone.present).toEqual(committed.present);
    expect(canUndoDocument(committed)).toBe(true);
    expect(canRedoDocument(undone)).toBe(true);
  });

  it('returns the same state when undo or redo is unavailable', () => {
    const history = createDocumentHistory(createTestDocument());
    expect(undoDocumentCommand(history)).toBe(history);
    expect(redoDocumentCommand(history)).toBe(history);
  });

  it('bounds history and clears future entries after a new commit', () => {
    const document = createTestDocument({ nodes: [createTestNode('node-1')] });
    let history = createDocumentHistory(document, 2);
    history = commitDocumentCommand(history, editLabelCommand('one'));
    history = commitDocumentCommand(history, editLabelCommand('two', 'one'));
    history = commitDocumentCommand(history, editLabelCommand('three', 'two'));
    expect(history.past).toHaveLength(2);

    history = undoDocumentCommand(history);
    expect(history.future).toHaveLength(1);
    history = commitDocumentCommand(history, editLabelCommand('replacement', 'two'));
    expect(history.future).toEqual([]);
  });

  it('records a batch as one transaction', () => {
    const a = createTestNode('a');
    const b = createTestNode('b');
    const document = createTestDocument({ nodes: [a, b] });
    const history = commitDocumentCommand(createDocumentHistory(document), {
      kind: 'batch',
      id: 'move-both',
      label: 'Move both',
      commands: [a, b].map((node, index) => ({
        kind: 'set-node' as const,
        id: `move-${node.id}`,
        label: 'Move',
        pageId: 'page-1',
        before: node,
        after: {
          ...node,
          transform: {
            ...node.transform,
            translation: { x: (index + 1) * 10, y: (index + 1) * 20 },
          },
        },
      })),
    });

    expect(history.past).toHaveLength(1);
    expect(undoDocumentCommand(history).present).toEqual(document);
  });

  it('rejects invalid limits', () => {
    expect(() => createDocumentHistory(createTestDocument(), 0)).toThrow(/positive integer/);
    expect(() => createDocumentHistory(createTestDocument(), 1.5)).toThrow(/positive integer/);
  });
});
