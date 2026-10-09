import { afterEach, describe, expect, it, vi } from 'vitest';
import { savedOpen, saveOpen } from './mapDepth';

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
