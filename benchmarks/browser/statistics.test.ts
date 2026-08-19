import { describe, expect, it } from 'vitest';
import { subtractNullable, summarizeSamples } from './statistics';

describe('browser benchmark statistics', () => {
  it('summarizes an empty sample without fabricated values', () => {
    expect(summarizeSamples([])).toEqual({
      count: 0,
      median: null,
      p95: null,
      worst: null,
    });
  });

  it('uses a deterministic nearest-rank p95', () => {
    expect(summarizeSamples([8, 4, 12, 16, 20])).toEqual({
      count: 5,
      median: 12,
      p95: 20,
      worst: 20,
    });
  });

  it('computes heap deltas only when both measurements exist', () => {
    expect(subtractNullable(18.125, 10)).toBe(8.125);
    expect(subtractNullable(null, 10)).toBeNull();
    expect(subtractNullable(18, null)).toBeNull();
  });
});
