// Page lifecycle for the v2 document bar: every action becomes exactly one
// reversible command through the shared production builders. Pages never share
// connectors — a page owns its own node/connector lists, so add/remove/move
// cannot cross-link them.
import { useCallback } from 'react';
import {
  buildProductionDuplicatePageCommand,
  buildProductionInsertPageCommand,
  buildProductionRemovePageCommand,
  buildProductionRenamePageCommand,
  buildProductionReorderPageCommand,
} from '../../application/active-document/productionPages';
import type { DocumentCommand } from '../../domain/commands/types';
import type { SceneDocumentV1, ScenePage } from '../../domain/document/types';

export interface V2PagesOptions {
  readonly document: SceneDocumentV1 | null;
  readonly pageId: string | null;
  readonly readOnly: boolean;
  readonly commit: (command: DocumentCommand) => void;
  readonly onSelect: (pageId: string) => void;
  readonly mintId: (prefix: string) => string;
  readonly announce: (message: string) => void;
}

export function useV2Pages(options: V2PagesOptions) {
  const { document, pageId, readOnly, commit, onSelect, mintId, announce } = options;
  const pages: readonly ScenePage[] = document?.pages ?? [];
  const activePage = pages.find((page) => page.id === pageId) ?? pages[0] ?? null;

  const run = useCallback((build: () => DocumentCommand | null, done: (command: DocumentCommand) => string) => {
    if (!document || readOnly) return;
    try {
      const command = build();
      if (!command) return;
      commit(command);
      announce(done(command));
    } catch (error) {
      announce(error instanceof Error ? error.message : 'Page action failed.');
    }
  }, [document, readOnly, commit, announce]);

  const add = useCallback(() => {
    if (!document) return;
    const id = mintId('page');
    const name = `Page ${document.pages.length + 1}`;
    run(() => buildProductionInsertPageCommand(document, id, name), () => `Added ${name}.`);
    onSelect(id);
  }, [document, mintId, run, onSelect]);

  const duplicate = useCallback((sourceId: string) => {
    if (!document) return;
    const id = mintId('page');
    run(() => buildProductionDuplicatePageCommand(document, sourceId, id), () => 'Page duplicated.');
    onSelect(id);
  }, [document, mintId, run, onSelect]);

  const rename = useCallback((targetId: string, name: string) => {
    if (!document) return;
    run(() => buildProductionRenamePageCommand(document, targetId, name), () => `Renamed page to ${name.trim()}.`);
  }, [document, run]);

  const remove = useCallback((targetId: string) => {
    if (!document) return;
    const index = document.pages.findIndex((page) => page.id === targetId);
    const next = document.pages[index + 1] ?? document.pages[index - 1] ?? null;
    const name = document.pages[index]?.name ?? 'page';
    run(() => buildProductionRemovePageCommand(document, targetId), () => `Deleted ${name}.`);
    if (pageId === targetId && next) onSelect(next.id);
  }, [document, run, pageId, onSelect]);

  const move = useCallback((targetId: string, direction: 'left' | 'right') => {
    if (!document) return;
    run(() => buildProductionReorderPageCommand(document, targetId, direction), () => 'Reordered pages.');
  }, [document, run]);

  return { pages, activePage, select: onSelect, add, duplicate, rename, remove, move, readOnly };
}
