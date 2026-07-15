import { describe, expect, it } from 'vitest';
import {
  collectReferencedAssetIds,
  createIconMediaData,
  createImageMediaData,
  getImmediateMediaUrl,
  getNodeIconRef,
  getNodeImageRef,
  nodeHasInlineDataUrlMedia,
} from './nodeMediaState';

describe('nodeMediaState', () => {
  it('prefers imageAssetId over imageUrl', () => {
    expect(
      getNodeImageRef({
        imageAssetId: 'sha256:abc',
        imageUrl: 'data:image/png;base64,xx',
      })
    ).toEqual({ assetId: 'sha256:abc' });
  });

  it('falls back to imageUrl when no asset id', () => {
    expect(getNodeImageRef({ imageUrl: 'https://example.com/a.png' })).toEqual({
      url: 'https://example.com/a.png',
    });
  });

  it('prefers iconAssetId over customIconUrl', () => {
    expect(
      getNodeIconRef({
        iconAssetId: 'sha256:abcdef0123456789',
        customIconUrl: 'data:image/svg+xml;base64,abc',
      })
    ).toEqual({ assetId: 'sha256:abcdef0123456789' });
  });

  it('creates image and icon media payloads', () => {
    expect(createImageMediaData({ imageAssetId: 'sha256:1' })).toEqual({
      imageUrl: undefined,
      imageAssetId: 'sha256:1',
    });
    expect(createIconMediaData({ iconAssetId: 'sha256:2' })).toMatchObject({
      icon: undefined,
      iconAssetId: 'sha256:2',
      archIconPackId: undefined,
    });
  });

  it('detects inline data URLs', () => {
    expect(nodeHasInlineDataUrlMedia({ imageUrl: 'data:image/png;base64,aa' })).toBe(true);
    expect(nodeHasInlineDataUrlMedia({ imageUrl: 'https://x' })).toBe(false);
  });

  it('collects referenced asset ids from nodes', () => {
    const ids = collectReferencedAssetIds([
      { data: { imageAssetId: 'sha256:a' } },
      { data: { iconAssetId: 'sha256:b', imageUrl: 'https://x' } },
      { data: { imageUrl: 'data:image/png;base64,z' } },
    ]);
    expect(ids.sort()).toEqual(['sha256:a', 'sha256:b']);
  });

  it('returns immediate urls only for non-asset refs', () => {
    expect(getImmediateMediaUrl({ imageUrl: 'https://x' }, 'image')).toBe('https://x');
    expect(getImmediateMediaUrl({ imageAssetId: 'sha256:a' }, 'image')).toBeUndefined();
  });
});
