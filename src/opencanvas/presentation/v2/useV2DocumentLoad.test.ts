import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { V2DocumentRepository } from '../../../services/storage/v2/v2Repository';
import { repoMapSourceOf, withRepoMapSource } from '../../application/map/repoMapSource';
import { createEmptyV2Document } from './v2Document';
import { useV2DocumentLoad } from './useV2DocumentLoad';

const stamp = (d: ReturnType<typeof createEmptyV2Document>) => ({ ...d, name: 'initialized' });
const repo = (result: unknown) => ({ loadDocument: vi.fn().mockResolvedValue(result), saveDocument: vi.fn().mockResolvedValue({ status: 'saved' }) }) as unknown as V2DocumentRepository;
const run = (repository: V2DocumentRepository | null, extra: object = {}) => {
  const openDocument = vi.fn();
  const view = renderHook(() => useV2DocumentLoad({ documentId: 'd1', repository, openDocument, onRecovered: vi.fn(), initialize: stamp, ...extra }));
  return { openDocument, view };
};

describe('useV2DocumentLoad initialize', () => {
  it('shapes a document created fresh', async () => {
    const { openDocument, view } = run(repo({ status: 'missing' }));
    await waitFor(() => expect(view.result.current.phase).toBe('ready'));
    expect(openDocument.mock.calls[0]![0].name).toBe('initialized');
  });
  it('saves the fresh document at once, at revision 1, and opens it from there', async () => {
    const repository = repo({ status: 'missing' });
    const { openDocument, view } = run(repository);
    await waitFor(() => expect(view.result.current.phase).toBe('ready'));
    expect(repository.saveDocument).toHaveBeenCalledWith('d1', openDocument.mock.calls[0]![0], 1);
    expect(view.result.current.baseRevision).toBe(1);
  });
  it('after a reload the saved repo-map document opens with its source, and initialize is not applied again', async () => {
    const stored = new Map<string, unknown>();
    const repository = {
      loadDocument: async (id: string) => (stored.has(id) ? { status: 'ok', record: stored.get(id) } : { status: 'missing' }),
      saveDocument: async (id: string, document: unknown, revision: number) => { stored.set(id, { document, revision }); return { status: 'saved' }; },
    } as unknown as V2DocumentRepository;
    const init = (d: ReturnType<typeof createEmptyV2Document>) => withRepoMapSource(d, { owner: 'a', repo: 'b' });
    const first = run(repository, { initialize: init });
    await waitFor(() => expect(first.view.result.current.phase).toBe('ready'));
    const second = run(repository, { initialize: vi.fn() });
    await waitFor(() => expect(second.view.result.current.phase).toBe('ready'));
    expect(repoMapSourceOf(second.openDocument.mock.calls[0]![0])).toEqual({ owner: 'a', repo: 'b' });
    expect(second.view.result.current.baseRevision).toBe(1);
  });
  it('leaves a stored document alone', async () => {
    const stored = createEmptyV2Document('d1', 'stored');
    const { openDocument, view } = run(repo({ status: 'ok', record: { document: stored, revision: 3 } }));
    await waitFor(() => expect(view.result.current.phase).toBe('ready'));
    expect(openDocument).toHaveBeenCalledWith(stored);
  });
  it('leaves a read-only stored document and a fixed one alone', async () => {
    const stored = createEmptyV2Document('d1', 'stored');
    const ro = run(repo({ status: 'read-only', record: { document: stored, revision: 1 } }));
    await waitFor(() => expect(ro.view.result.current.readOnly).toBe(true));
    expect(ro.openDocument).toHaveBeenCalledWith(stored);
    const fixed = createEmptyV2Document('s', 'shared');
    const fx = run(null, { fixed });
    await waitFor(() => expect(fx.view.result.current.phase).toBe('ready'));
    expect(fx.openDocument).toHaveBeenCalledWith(fixed);
  });
  it('without initialize a fresh document is the plain empty one', async () => {
    const { openDocument, view } = run(repo({ status: 'missing' }), { initialize: undefined });
    await waitFor(() => expect(view.result.current.phase).toBe('ready'));
    expect(openDocument.mock.calls[0]![0].name).not.toBe('initialized');
  });
});
