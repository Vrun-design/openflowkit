import { describe, expect, it } from 'vitest';
import { AssetEncodeError, isDataUrl } from './assetEncode';

describe('assetEncode helpers', () => {
  it('detects data URLs', () => {
    expect(isDataUrl('data:image/png;base64,abc')).toBe(true);
    expect(isDataUrl('https://example.com/x.png')).toBe(false);
    expect(isDataUrl(undefined)).toBe(false);
  });

  it('AssetEncodeError carries a stable code', () => {
    const error = new AssetEncodeError('TOO_LARGE', 'too big');
    expect(error.code).toBe('TOO_LARGE');
    expect(error.message).toBe('too big');
    expect(error.name).toBe('AssetEncodeError');
  });
});
