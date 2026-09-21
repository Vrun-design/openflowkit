import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DocumentCommand } from '../../domain/commands/types';
import { createTestDocument } from '../../testing/builders/documentBuilder';
import { useV2Pages } from './useV2Pages';

// Page ops are unit-tested as commands at the source (productionPages.test.ts);
// this proves the bar's hook wires them the way a user expects: one command per
// action, selection follows the new page, and the last page cannot be deleted.
function setup() {
  let document = createTestDocument({ nodes: [] });
  const apply = (command: DocumentCommand): void => {
    if (command.kind === 'insert-page') {
      const pages = [...document.pages];
      pages.splice(command.index, 0, command.page);
      document = { ...document, pages };
    } else if (command.kind === 'remove-page') {
      document = { ...document, pages: document.pages.filter(({ id }) => id !== command.page.id) };
    } else if (command.kind === 'set-page') {
      document = { ...document, pages: document.pages.map((page) => (page.id === command.pageId ? command.after : page)) };
    } else if (command.kind === 'batch') {
      for (const child of command.commands) apply(child);
    }
  };
  const commit = vi.fn(apply);
  let counter = 0;
  const selected: string[] = [];
  const announce = vi.fn();
  const hook = renderHook(
    (props: { pageId: string | null }) => useV2Pages({
      document, pageId: props.pageId, readOnly: false, commit,
      onSelect: (pageId) => selected.push(pageId),
      mintId: (prefix) => `${prefix}-new-${++counter}`,
      announce,
    }),
    { initialProps: { pageId: document.pages[0]!.id } },
  );
  // Like the editor, each commit re-renders the hook with the new document.
  const act1 = (run: (api: ReturnType<typeof useV2Pages>) => void): void => act(() => {
    run(hook.result.current);
    hook.rerender({ pageId: hook.result.current.activePage?.id ?? null });
  });
  return { hook, commit, selected, announce, document: () => document, act: act1 };
}

describe('useV2Pages', () => {
  it('adds, duplicates, renames, reorders and removes one command per action', () => {
    const { commit, selected, document, act: act1 } = setup();

    act1((api) => api.add());
    expect(commit.mock.calls[0]![0]).toMatchObject({ kind: 'insert-page', index: 1, page: { name: 'Page 2' } });
    expect(selected).toEqual(['page-new-1']);

    const second = document().pages[1]!;
    act1((api) => api.duplicate(second.id));
    expect(commit.mock.calls[1]![0]).toMatchObject({ kind: 'insert-page', index: 2, page: { name: 'Page 2 Copy' } });

    act1((api) => api.rename(second.id, '  Checkout  '));
    expect(commit.mock.calls[2]![0]).toMatchObject({ kind: 'set-page', pageId: second.id, after: { name: 'Checkout' } });

    act1((api) => api.move(second.id, 'left'));
    expect(commit.mock.calls[3]![0]).toMatchObject({ kind: 'batch', id: `reorder-page:${second.id}:left` });

    act1((api) => api.remove(second.id));
    expect(commit.mock.calls[4]![0]).toMatchObject({ kind: 'remove-page', page: { id: second.id } });
    expect(document().pages.map(({ name }) => name)).toEqual(['Page 1', 'Page 2 Copy']);
  });

  it('never removes the last page and says why', () => {
    const { commit, announce, document, act: act1 } = setup();
    const only = document().pages[0]!;
    act1((api) => api.remove(only.id));
    expect(commit).not.toHaveBeenCalled();
    expect(announce).toHaveBeenCalledWith(expect.stringMatching(/at least one page/));
  });

  it('does nothing while the document is read-only', () => {
    const document = createTestDocument({ nodes: [] });
    const commit = vi.fn();
    const hook = renderHook(() => useV2Pages({
      document, pageId: document.pages[0]!.id, readOnly: true, commit,
      onSelect: vi.fn(), mintId: (prefix) => `${prefix}-new-1`, announce: vi.fn(),
    }));
    act(() => hook.result.current.add());
    act(() => hook.result.current.rename(document.pages[0]!.id, 'Nope'));
    expect(commit).not.toHaveBeenCalled();
  });
});
