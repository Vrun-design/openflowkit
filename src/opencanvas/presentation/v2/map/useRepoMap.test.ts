import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MapModel } from '../../../../dsl/map/types';
import { RepoError } from '../../../../services/discovery/githubRepo';
import type { LoadMapOptions } from '../../../../services/map/loadRepoMap';
import { clearRepoMapMemory, useRepoMap } from './useRepoMap';

const model = (files: number, sha = 'sha1') => ({ root: 'r', nodes: {}, links: [], source: { repo: 'a/b', ref: 'HEAD', sha }, stats: { files } }) as unknown as MapModel;
type Call = { ref: { owner: string; repo: string; ref: string }; opts: LoadMapOptions; resolve: (m: MapModel) => void; reject: (e: unknown) => void };
function fakeLoader() {
  const calls: Call[] = [];
  const load = vi.fn((ref: Call['ref'], opts: LoadMapOptions) => new Promise<MapModel>((resolve, reject) => { calls.push({ ref, opts, resolve, reject }); }));
  return { calls, load };
}
const src = { owner: 'a', repo: 'b' };

beforeEach(() => { clearRepoMapMemory(); sessionStorage.clear(); });

describe('useRepoMap', () => {
  it('is idle with no source and never loads', () => {
    const { load } = fakeLoader();
    const { result } = renderHook(() => useRepoMap(null, load));
    expect(result.current.status).toBe('idle');
    expect(load).not.toHaveBeenCalled();
  });

  it('shows the partial model while loading, then ready with the sha', async () => {
    const { calls, load } = fakeLoader();
    const { result } = renderHook(() => useRepoMap(src, load));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(result.current.status).toBe('loading');
    act(() => calls[0]!.opts.onSnapshot(model(3), { read: 0, total: 3, sampled: { read: 3, total: 9 } }));
    expect(result.current.model?.stats.files).toBe(3);
    expect(result.current.progress.sampled).toEqual({ read: 3, total: 9 });
    await act(async () => calls[0]!.resolve(model(3, 'abc')));
    expect(result.current.status).toBe('ready');
  });

  it('keeps the sampled note after finishing and on re-entry', async () => {
    const f = fakeLoader();
    const first = renderHook(() => useRepoMap(src, f.load));
    await waitFor(() => expect(f.calls).toHaveLength(1));
    act(() => f.calls[0]!.opts.onSnapshot(model(3), { read: 0, total: 3, sampled: { read: 3, total: 9 } }));
    await act(async () => f.calls[0]!.resolve(model(3)));
    expect(first.result.current.progress.sampled).toEqual({ read: 3, total: 9 });
    first.unmount();
    const again = renderHook(() => useRepoMap(src, f.load));
    expect(again.result.current.status).toBe('ready');
    expect(again.result.current.progress.sampled).toEqual({ read: 3, total: 9 });
  });

  it('remembers only the last 3 repos', async () => {
    const f = fakeLoader();
    for (const name of ['r1', 'r2', 'r3', 'r4']) {
      const v = renderHook(() => useRepoMap({ owner: 'a', repo: name }, f.load));
      await waitFor(() => expect(f.calls).toHaveLength(Number(name.slice(1))));
      await act(async () => f.calls[f.calls.length - 1]!.resolve(model(1)));
      v.unmount();
    }
    expect(renderHook(() => useRepoMap({ owner: 'a', repo: 'r4' }, f.load)).result.current.status).toBe('ready');
    const evicted = renderHook(() => useRepoMap({ owner: 'a', repo: 'r1' }, f.load));
    expect(evicted.result.current.status).toBe('loading');
  });

  it('re-entering in the same session is instant', async () => {
    const f = fakeLoader();
    const first = renderHook(() => useRepoMap(src, f.load));
    await waitFor(() => expect(f.calls).toHaveLength(1));
    await act(async () => f.calls[0]!.resolve(model(2)));
    first.unmount();
    const again = renderHook(() => useRepoMap(src, f.load));
    await waitFor(() => expect(again.result.current.status).toBe('ready'));
    expect(f.load).toHaveBeenCalledTimes(1);
  });

  it('aborts on source change and ignores the stale answer', async () => {
    const { calls, load } = fakeLoader();
    const { result, rerender } = renderHook(({ s }) => useRepoMap(s, load), { initialProps: { s: src } });
    await waitFor(() => expect(calls).toHaveLength(1));
    rerender({ s: { owner: 'c', repo: 'd' } });
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[0]!.opts.signal?.aborted).toBe(true);
    await act(async () => calls[0]!.resolve(model(5)));
    expect(result.current.status).toBe('loading');
  });

  it('aborts on unmount', async () => {
    const { calls, load } = fakeLoader();
    const { unmount } = renderHook(() => useRepoMap(src, load));
    await waitFor(() => expect(calls).toHaveLength(1));
    unmount();
    expect(calls[0]!.opts.signal?.aborted).toBe(true);
  });

  it('maps problem kinds; offline retries', async () => {
    const { calls, load } = fakeLoader();
    const { result } = renderHook(() => useRepoMap(src, load));
    await waitFor(() => expect(calls).toHaveLength(1));
    await act(async () => calls[0]!.reject(new RepoError({ kind: 'offline' }, 'x')));
    expect(result.current.problem?.retry).toBe(true);
    act(() => result.current.retry());
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(result.current.status).toBe('loading');
    await act(async () => calls[1]!.reject(new RepoError({ kind: 'not-found' }, 'x')));
    expect(result.current.problem?.title).toMatch(/not found/);
  });

  it('rate limit asks for a token; submitting keeps it and reads again with it; a rejected token is dropped', async () => {
    const { calls, load } = fakeLoader();
    const { result } = renderHook(() => useRepoMap(src, load));
    await waitFor(() => expect(calls).toHaveLength(1));
    await act(async () => calls[0]!.reject(new RepoError({ kind: 'rate-limited', resetAt: null }, 'x')));
    expect(result.current.problem?.askToken).toBe(true);
    act(() => result.current.submitToken('tok'));
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1]!.opts.token).toBe('tok');
    await act(async () => calls[1]!.reject(new RepoError({ kind: 'token-rejected' }, 'x')));
    expect(sessionStorage.getItem('ofk.github-token')).toBeNull();
    expect(result.current.problem?.askToken).toBe(true);
  });
});
