import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { MapModel } from '../../../../dsl/map/types';
import { useMapLayers } from './useMapLayers';

const node = (id: string, parent: string | null, kind: 'dir' | 'file' = 'file') => ({ id, name: id, kind, parent, children: [] as string[], files: 1, loc: 1, path: id });
function model(links: { from: string; to: string; kind: 'import' | 'call' }[]): MapModel {
  const root = { ...node('root', null, 'dir'), children: ['a', 'b'] };
  return { root: 'root', nodes: { root, a: node('a', 'root'), b: node('b', 'root') }, links: links.map((l) => ({ ...l, evidence: [{ file: 'a', line: 1, text: 't' }] })), source: {}, stats: { files: 2, loc: 2, imports: 0, unresolved: 0 } } as unknown as MapModel;
}
const open = new Set<string>();

describe('useMapLayers', () => {
  it('is off for a map that is not a repo map', () => {
    const { result } = renderHook(() => useMapLayers(model([]), open, false, 'k'));
    expect(result.current.shown).toBeUndefined();
    expect(result.current.all).toBe(false);
  });
  it('shows the control for two kinds, and keeps it while one kind is off', () => {
    const m = model([{ from: 'a', to: 'b', kind: 'import' }, { from: 'b', to: 'a', kind: 'call' }]);
    const { result } = renderHook(() => useMapLayers(m, open, true, 'k'));
    expect(result.current.layers?.map((l) => l.kind)).toEqual(['import', 'call']);
    act(() => result.current.toggle('call'));
    expect(result.current.shown).toEqual(['import', 'data', 'build']);
    expect(result.current.layers?.find((l) => l.kind === 'call')?.on).toBe(false);
  });
  it('hides the control for a single kind, and a kind that is off but absent is not listed', () => {
    const m = model([{ from: 'a', to: 'b', kind: 'import' }]);
    const { result } = renderHook(() => useMapLayers(m, open, true, 'k'));
    expect(result.current.layers).toBeUndefined();
    act(() => result.current.toggle('data'));
    expect(result.current.layers).toBeUndefined();
  });
  it('does not carry the choices to another document', () => {
    const m = model([{ from: 'a', to: 'b', kind: 'import' }, { from: 'b', to: 'a', kind: 'call' }]);
    const { result, rerender } = renderHook(({ k }) => useMapLayers(m, open, true, k), { initialProps: { k: 'one' } });
    act(() => { result.current.toggle('call'); result.current.toggleAll(); });
    expect(result.current.all).toBe(true);
    rerender({ k: 'two' });
    expect(result.current.shown).toEqual(['import', 'call', 'data', 'build']);
    expect(result.current.all).toBe(false);
  });
});
