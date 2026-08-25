import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DomainLibraryItem } from '@/services/domainLibrary';
import type { FlowTemplate } from '@/services/templates';
import { useFederatedCommandSearch } from './useFederatedCommandSearch';

const searchCatalogs = vi.hoisted(() => vi.fn());
const resolveItem = vi.hoisted(() => vi.fn());

vi.mock('@/services/search/federatedEditorSearch', () => ({
  searchFederatedEditorCatalogs: searchCatalogs,
}));
vi.mock('@/services/assetCatalog', () => ({
  resolveDomainLibraryItemForInsertion: resolveItem,
}));

const template = {
  id: 'template-1',
  name: 'Service map',
  description: 'Architecture template',
} as FlowTemplate;
const shape: DomainLibraryItem = {
  id: 'shape-1',
  category: 'icons',
  label: 'Diamond',
  description: 'Decision shape',
  icon: 'Shapes',
  color: 'slate',
  shape: 'diamond',
};

describe('useFederatedCommandSearch', () => {
  beforeEach(() => {
    searchCatalogs.mockReset();
    resolveItem.mockReset();
  });

  it('maps executable template and shape results and resolves asset previews', async () => {
    searchCatalogs.mockResolvedValue([
      {
        id: 'template:template-1',
        kind: 'template',
        label: template.name,
        description: template.description,
        keywords: ['architecture'],
        score: 10,
        template,
      },
      {
        id: 'shape:diamond',
        kind: 'shape',
        label: shape.label,
        description: shape.description,
        keywords: ['decision'],
        score: 9,
        item: shape,
      },
    ]);
    resolveItem.mockResolvedValue({ ...shape, previewUrl: 'shape.svg' });
    const onSelectTemplate = vi.fn();
    const onAddDomainLibraryItem = vi.fn();
    const { result } = renderHook(() =>
      useFederatedCommandSearch({
        query: 'decision shape',
        onSelectTemplate,
        onAddDomainLibraryItem,
      })
    );

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.items.map((item) => item.badge)).toEqual(['Template', 'Shape']);
    act(() => {
      void result.current.items[0]?.action?.();
    });
    await act(async () => {
      await result.current.items[1]?.action?.();
    });
    expect(onSelectTemplate).toHaveBeenCalledWith(template);
    expect(onAddDomainLibraryItem).toHaveBeenCalledWith({
      ...shape,
      previewUrl: 'shape.svg',
    });
  });

  it('does not search catalogs before two characters or without handlers', () => {
    const { rerender } = renderHook(({ query }) => useFederatedCommandSearch({ query }), {
      initialProps: { query: 'a' },
    });
    rerender({ query: 'architecture' });

    expect(searchCatalogs).not.toHaveBeenCalled();
  });

  it('ignores an older query that resolves after the current query', async () => {
    let resolveFirstQuery: (results: unknown[]) => void = () => undefined;
    const firstQuery = new Promise<unknown[]>((resolve) => {
      resolveFirstQuery = resolve;
    });
    const currentTemplate = { ...template, id: 'current', name: 'Current result' };
    searchCatalogs.mockReturnValueOnce(firstQuery).mockResolvedValueOnce([
      {
        id: 'template:current',
        kind: 'template',
        label: currentTemplate.name,
        description: currentTemplate.description,
        keywords: [],
        score: 10,
        template: currentTemplate,
      },
    ]);
    const onSelectTemplate = vi.fn();
    const { result, rerender } = renderHook(
      ({ query }) => useFederatedCommandSearch({ query, onSelectTemplate }),
      { initialProps: { query: 'older query' } }
    );

    rerender({ query: 'current query' });
    await waitFor(() => expect(result.current.items[0]?.label).toBe('Current result'));
    await act(async () => {
      resolveFirstQuery([
        {
          id: 'template:stale',
          kind: 'template',
          label: 'Stale result',
          description: 'Must not publish',
          keywords: [],
          score: 20,
          template,
        },
      ]);
      await firstQuery;
    });

    expect(result.current.items.map((item) => item.label)).toEqual(['Current result']);
  });
});
