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
        imageAssetId: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        imageUrl: 'data:image/png;base64,xx',
      })
    ).toEqual({ assetId: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' });
  });

  it('falls back to imageUrl when no asset id', () => {
    expect(getNodeImageRef({ imageUrl: 'https://example.com/a.png' })).toEqual({
      url: 'https://example.com/a.png',
    });
  });

  it('prefers iconAssetId over customIconUrl', () => {
    expect(
      getNodeIconRef({
        iconAssetId: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        customIconUrl: 'data:image/svg+xml;base64,abc',
      })
    ).toEqual({ assetId: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' });
  });

  it('creates image and icon media payloads', () => {
    expect(createImageMediaData({ imageAssetId: 'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc' })).toEqual({
      imageUrl: undefined,
      imageAssetId: 'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    });
    expect(createIconMediaData({ iconAssetId: 'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd' })).toMatchObject({
      icon: undefined,
      iconAssetId: 'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
      archIconPackId: undefined,
    });
  });

  it('detects inline data URLs', () => {
    expect(nodeHasInlineDataUrlMedia({ imageUrl: 'data:image/png;base64,aa' })).toBe(true);
    expect(nodeHasInlineDataUrlMedia({ imageUrl: 'https://x' })).toBe(false);
  });

  it('collects referenced asset ids from nodes', () => {
    const ids = collectReferencedAssetIds([
      { data: { imageAssetId: 'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' } },
      { data: { iconAssetId: 'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', imageUrl: 'https://x' } },
      { data: { imageUrl: 'data:image/png;base64,z' } },
    ]);
    expect(ids.sort()).toEqual(['sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff']);
  });

  it('returns immediate urls only for non-asset refs', () => {
    expect(getImmediateMediaUrl({ imageUrl: 'https://x' }, 'image')).toBe('https://x');
    expect(getImmediateMediaUrl({ imageAssetId: 'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' }, 'image')).toBeUndefined();
  });
});
