import type { DocumentCommand } from './types';

/**
 * Whether a command writes to page `pageId`: any edit addressed to it, the page itself inserted or removed (a reorder is
 * both), or an insert at index 0, which would push a page that sits first (a locked one) along. Batches are walked.
 * The editor refuses such a command for a page that must stay as it is (a repo document's map page).
 */
export function commandTouchesPage(command: DocumentCommand, pageId: string): boolean {
  switch (command.kind) {
    case 'batch': return command.commands.some((child) => commandTouchesPage(child, pageId));
    case 'set-document-name': return false;
    case 'insert-page': return command.page.id === pageId || command.index === 0;
    case 'remove-page': return command.page.id === pageId;
    default: return command.pageId === pageId;
  }
}
