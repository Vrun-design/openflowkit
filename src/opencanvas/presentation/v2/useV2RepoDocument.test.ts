import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { repoMapSourceOf, withRepoMapSource } from '../../application/map/repoMapSource';
import { createEmptyV2Document } from './v2Document';
import { useV2RepoDocument } from './useV2RepoDocument';

vi.mock('./map/useRepoMap', () => ({ useRepoMap: () => ({ status: 'idle', model: null, progress: { read: 0, total: 0 }, problem: null, retry: vi.fn(), submitToken: vi.fn() }) }));

describe('useV2RepoDocument', () => {
  const plain = createEmptyV2Document('d1');
  const repoDoc = withRepoMapSource(plain, { owner: 'a', repo: 'b' });

  it('a plain document is no repo document', () => {
    const { result } = renderHook(() => useV2RepoDocument(plain, null));
    expect(result.current.source).toBeNull();
    expect(result.current.lockedPageId).toBeNull();
    expect(result.current.initialize).toBeUndefined();
  });
  it('a repo document locks its first page only and names its source', () => {
    const { result } = renderHook(() => useV2RepoDocument(repoDoc, null));
    expect(result.current.source).toEqual({ owner: 'a', repo: 'b' });
    expect(result.current.lockedPageId).toBe(repoDoc.pages[0]!.id);
    expect(result.current.mismatch).toBe(false);
  });
  it('the intent shapes a fresh document with its source and the repo name', () => {
    const { result } = renderHook(() => useV2RepoDocument(null, { repoMap: { owner: 'a', repo: 'b', ref: 'dev' } }));
    const born = result.current.initialize!(plain);
    expect(repoMapSourceOf(born)).toEqual({ owner: 'a', repo: 'b', ref: 'dev' });
    expect(born.name).toBe('a/b');
  });
  it('a stored document of another repo under the intent is a mismatch, the same repo is not', () => {
    expect(renderHook(() => useV2RepoDocument(repoDoc, { repoMap: { owner: 'a', repo: 'c' } })).result.current.mismatch).toBe(true);
    expect(renderHook(() => useV2RepoDocument(repoDoc, { repoMap: { owner: 'a', repo: 'b' } })).result.current.mismatch).toBe(false);
  });
});
