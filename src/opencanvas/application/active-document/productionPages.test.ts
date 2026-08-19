import { describe, expect, it } from 'vitest';
import { applyDocumentCommand } from '../../domain/commands/execute';
import { createTestDocument } from '../../testing/builders/documentBuilder';
import {
  buildProductionDuplicatePageCommand,
  buildProductionInsertPageCommand,
  buildProductionRemovePageCommand,
  buildProductionRenamePageCommand,
  buildProductionReorderPageCommand,
} from './productionPages';

describe('production page organization', () => {
  it('adds, renames, duplicates, reorders, deletes, and reverses pages', () => {
    const document = createTestDocument();
    const inserted = applyDocumentCommand(document,
      buildProductionInsertPageCommand(document, 'page-2', ' Page 2 '));
    const renamed = applyDocumentCommand(inserted.document,
      buildProductionRenamePageCommand(inserted.document, 'page-2', 'Details')!);
    const duplicated = applyDocumentCommand(renamed.document,
      buildProductionDuplicatePageCommand(renamed.document, 'page-2', 'page-3'));
    expect(duplicated.document.pages.map((page) => page.name))
      .toEqual(['Page 1', 'Details', 'Details Copy']);
    const reordered = applyDocumentCommand(duplicated.document,
      buildProductionReorderPageCommand(duplicated.document, 'page-3', 'left')!);
    expect(reordered.document.pages.map((page) => page.id)).toEqual(['page-1', 'page-3', 'page-2']);
    expect(applyDocumentCommand(reordered.document, reordered.inverse).document)
      .toEqual(duplicated.document);
    const removed = applyDocumentCommand(duplicated.document,
      buildProductionRemovePageCommand(duplicated.document, 'page-2'));
    expect(removed.document.pages.map((page) => page.id)).toEqual(['page-1', 'page-3']);
    expect(applyDocumentCommand(removed.document, removed.inverse).document)
      .toEqual(duplicated.document);
  });

  it('rejects deleting the only page and detects rename no-ops', () => {
    const document = createTestDocument();
    expect(() => buildProductionRemovePageCommand(document, 'page-1')).toThrow(/at least one/);
    expect(buildProductionRenamePageCommand(document, 'page-1', 'Page 1')).toBeNull();
  });
});
