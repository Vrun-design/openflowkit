import { describe, expect, it } from 'vitest';
import { hashBytesToAssetId, isAssetId } from './assetHash';

describe('assetHash', () => {
  it('produces a stable content-addressed id for the same bytes', async () => {
    const bytes = new TextEncoder().encode('openflowkit-asset');
    const first = await hashBytesToAssetId(bytes);
    const second = await hashBytesToAssetId(bytes);
    expect(first).toBe(second);
    expect(isAssetId(first)).toBe(true);
  });

  it('produces different ids for different bytes', async () => {
    const left = await hashBytesToAssetId(new TextEncoder().encode('a'));
    const right = await hashBytesToAssetId(new TextEncoder().encode('b'));
    expect(left).not.toBe(right);
  });

  it('accepts sha256 and fnv1a id formats', () => {
    expect(isAssetId('sha256:abcdef0123456789')).toBe(true);
    expect(isAssetId('fnv1a:deadbeef:12')).toBe(true);
    expect(isAssetId('data:image/png;base64,abc')).toBe(false);
    expect(isAssetId('https://example.com/x.png')).toBe(false);
    expect(isAssetId('')).toBe(false);
  });
});
