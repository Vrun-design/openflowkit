import { describe, expect, it } from 'vitest';
import { formatStars, readCachedStars } from './homeStars';

describe('homeStars', () => {
  it('formats counts the way GitHub does', () => {
    expect([0, 999, 1000, 1234, 9_960, 12_345, 1_500_000].map(formatStars))
      .toEqual(['0', '999', '1k', '1.2k', '10k', '12k', '1.5M']);
  });

  it('trusts a cached count for a day only', () => {
    const now = 10 * 86_400_000;
    expect(readCachedStars(JSON.stringify({ count: 42, at: now - 1000 }), now)).toBe(42);
    expect(readCachedStars(JSON.stringify({ count: 42, at: now - 86_400_001 }), now)).toBeNull();
    expect(readCachedStars('{bad', now)).toBeNull();
    expect(readCachedStars(null, now)).toBeNull();
  });
});
