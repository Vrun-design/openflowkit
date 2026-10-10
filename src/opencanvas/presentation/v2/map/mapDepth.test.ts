import { afterEach, describe, expect, it, vi } from 'vitest';
import { firstMapVisit, forgetMapMode, savedOpen, saveOpen, savedMode, saveMode } from './mapDepth';

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });

describe('remembered open boxes', () => {
  it('round-trips a set per document and page', () => {
    saveOpen('d1', 'p1', new Set(['b', 'a']));
    expect(localStorage.getItem('ofk.map-open:d1:p1')).toBe('["a","b"]');
    expect([...savedOpen('d1', 'p1')!]).toEqual(['a', 'b']);
    expect(savedOpen('d1', 'p2')).toBeNull();
    expect(savedOpen('d2', 'p1')).toBeNull();
  });
  it('treats garbled or wrongly shaped values as nothing saved', () => {
    for (const bad of ['{not json', '{"a":1}', '[1,2]', '"x"']) {
      localStorage.setItem('ofk.map-open:d:p', bad);
      expect(savedOpen('d', 'p')).toBeNull();
    }
  });
  it('survives storage that throws, on read and write', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('full'); } });
    expect(savedOpen('d', 'p')).toBeNull();
    expect(() => saveOpen('d', 'p', new Set(['a']))).not.toThrow();
  });
  it('ignores a stored set past the id cap when reading', () => {
    localStorage.setItem('ofk.map-open:d:p', JSON.stringify(Array.from({ length: 2001 }, (_, i) => `n${i}`)));
    expect(savedOpen('d', 'p')).toBeNull();
  });
  it('does not write past the id cap', () => {
    saveOpen('d', 'p', new Set(Array.from({ length: 2001 }, (_, i) => `n${i}`)));
    expect(localStorage.getItem('ofk.map-open:d:p')).toBeNull();
  });
});

describe('remembered Canvas or Map', () => {
  it('round-trips per document and ignores anything else', () => {
    expect(savedMode('d1')).toBeNull();
    saveMode('d1', 'canvas');
    saveMode('d2', 'map');
    expect(savedMode('d1')).toBe('canvas');
    expect(savedMode('d2')).toBe('map');
    localStorage.setItem('ofk.map-mode:d3', 'sideways');
    expect(savedMode('d3')).toBeNull();
  });
  it('survives storage that throws', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('full'); } });
    expect(savedMode('d')).toBeNull();
    expect(() => saveMode('d', 'map')).not.toThrow();
  });
});

describe('forgetMapMode', () => {
  it('removes the saved choice and ignores blocked storage', () => {
    saveMode('gone', 'map');
    forgetMapMode('gone');
    expect(savedMode('gone')).toBeNull();
    vi.stubGlobal('localStorage', { removeItem: () => { throw new Error('blocked'); } });
    expect(() => forgetMapMode('gone')).not.toThrow();
  });
  it('removes the open boxes of every page of the document, and no other document\'s', () => {
    saveOpen('gone', 'p1', new Set(['a']));
    saveOpen('gone', 'p2', new Set(['b']));
    saveOpen('gone2', 'p1', new Set(['c']));
    forgetMapMode('gone');
    expect(savedOpen('gone', 'p1')).toBeNull();
    expect(savedOpen('gone', 'p2')).toBeNull();
    expect(savedOpen('gone2', 'p1')).not.toBeNull();
  });
});

describe('firstMapVisit', () => {
  it('is true once per document (the overview opens on a first visit only), and a deleted document starts over', () => {
    expect(firstMapVisit('d1')).toBe(true);
    expect(firstMapVisit('d1')).toBe(false);
    expect(firstMapVisit('d2')).toBe(true);
    forgetMapMode('d1');
    expect(firstMapVisit('d1')).toBe(true);
  });
  it('blocked storage is never a first visit (no panel popping open on every load)', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } });
    expect(firstMapVisit('d')).toBe(false);
  });
});
