import { describe, expect, it } from 'vitest';
import { formatStars, readCachedStars } from './homeStars';

describe('homeStars', () => {
  it('formats counts the way GitHub does', () => {
    expect([0, 999, 1000, 1234, 9_960, 12_345, 1_500_000].map(formatStars))
      .toEqual(['0', '999', '1k', '1.2k', '10k', '12k', '1.5M']);
  });

  it('trusts a cached lookup for a day only, a failed one too', () => {
    const now = 10 * 86_400_000;
    expect(readCachedStars(JSON.stringify({ count: 42, at: now - 1000 }), now)).toEqual({ count: 42 });
    // Rate-limited or offline: no number, and no new request until tomorrow.
    expect(readCachedStars(JSON.stringify({ count: null, at: now - 1000 }), now)).toEqual({ count: null });
    expect(readCachedStars(JSON.stringify({ count: 42, at: now - 86_400_001 }), now)).toBeNull();
    expect(readCachedStars('{bad', now)).toBeNull();
    expect(readCachedStars(null, now)).toBeNull();
  });
});
