import { describe, expect, it } from 'vitest';
import { createTestDocument } from '../../testing/builders/documentBuilder';
import { commandTouchesPage } from './pageTouch';
import type { DocumentCommand } from './types';

const LOCKED = 'locked';
const doc = createTestDocument({ nodes: [] });
const page = doc.pages[0]!;
const node = { id: 'n', kind: 'rectangle' } as never;
const edit = (kind: string, pageId: string, extra: object = {}) => ({ kind, id: `${kind}-1`, label: kind, pageId, ...extra }) as unknown as DocumentCommand;

describe('commandTouchesPage', () => {
  it('is true for every edit addressed to the page and false for another page', () => {
    for (const kind of ['set-node', 'set-layer', 'insert-layer', 'remove-layer', 'set-page', 'insert-node', 'remove-node', 'set-connector', 'insert-connector', 'remove-connector']) {
      expect(commandTouchesPage(edit(kind, LOCKED, { node }), LOCKED), kind).toBe(true);
      expect(commandTouchesPage(edit(kind, 'other', { node }), LOCKED), kind).toBe(false);
    }
  });
  it('document-level renames touch no page', () => {
    expect(commandTouchesPage({ kind: 'set-document-name', id: 'x', label: 'x', before: 'a', after: 'b' }, LOCKED)).toBe(false);
  });
  it('inserting or removing the page itself touches it; inserting another page at the end does not', () => {
    expect(commandTouchesPage({ kind: 'insert-page', id: 'i', label: 'i', index: 3, page: { ...page, id: LOCKED } }, LOCKED)).toBe(true);
    expect(commandTouchesPage({ kind: 'remove-page', id: 'r', label: 'r', index: 0, page: { ...page, id: LOCKED } }, LOCKED)).toBe(true);
    expect(commandTouchesPage({ kind: 'remove-page', id: 'r', label: 'r', index: 2, page: { ...page, id: 'other' } }, LOCKED)).toBe(false);
    expect(commandTouchesPage({ kind: 'insert-page', id: 'i', label: 'i', index: 3, page: { ...page, id: 'other' } }, LOCKED)).toBe(false);
  });
  it('an insert at index 0 shifts the first page, so it counts', () => {
    expect(commandTouchesPage({ kind: 'insert-page', id: 'i', label: 'i', index: 0, page: { ...page, id: 'other' } }, LOCKED)).toBe(true);
  });
  it('walks batches, including a reorder (remove + insert of the page)', () => {
    const reorder: DocumentCommand = {
      kind: 'batch', id: 'b', label: 'Reorder page', commands: [
        { kind: 'remove-page', id: 'r', label: 'r', index: 1, page: { ...page, id: LOCKED } },
        { kind: 'insert-page', id: 'i', label: 'i', index: 2, page: { ...page, id: LOCKED } },
      ],
    };
    expect(commandTouchesPage(reorder, LOCKED)).toBe(true);
    expect(commandTouchesPage({ kind: 'batch', id: 'b', label: 'b', commands: [edit('set-node', 'other', { node })] }, LOCKED)).toBe(false);
    expect(commandTouchesPage({ kind: 'batch', id: 'b', label: 'b', commands: [{ kind: 'batch', id: 'c', label: 'c', commands: [edit('set-page', LOCKED)] }] }, LOCKED)).toBe(true);
  });
});
