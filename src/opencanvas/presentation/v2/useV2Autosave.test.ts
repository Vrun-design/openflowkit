import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { createTestDocument } from '@/opencanvas/testing/builders/documentBuilder';
import type { V2DocumentRepository } from '../../../services/storage/v2/v2Repository';
import { useV2Autosave } from './useV2Autosave';

function fakeRepository() {
  const saveDocument = vi.fn(async (id: string, document: ReturnType<typeof createTestDocument>, revision: number) =>
    ({ status: 'saved' as const, record: { id, revision, schemaVersion: 1, document, savedAt: '' } }));
  return { saveDocument, loadDocument: vi.fn(), listDocuments: vi.fn(), deleteDocument: vi.fn() } as unknown as V2DocumentRepository & { saveDocument: typeof saveDocument };
}

const options = (repository: V2DocumentRepository, revision: number) => ({
  repository, documentId: 'doc-1', document: createTestDocument(), revision, baseRevision: 0, onConflict: () => undefined,
});

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('useV2Autosave', () => {
  it('never saves a new document nobody touched', async () => {
    const repository = fakeRepository();
    renderHook(() => useV2Autosave(options(repository, 0)));
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(repository.saveDocument).not.toHaveBeenCalled();
  });

  it('saves a pending edit at once when the editor goes away', async () => {
    const repository = fakeRepository();
    const { unmount } = renderHook(() => useV2Autosave(options(repository, 1)));
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(repository.saveDocument).toHaveBeenCalledWith('doc-1', expect.anything(), 1);
  });
});
