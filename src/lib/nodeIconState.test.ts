import { describe, expect, it } from 'vitest';
import {
  createBuiltInIconData,
  createProviderIconData,
  createUploadedIconData,
  inferAssetProviderFromPackId,
  normalizeNodeIconData,
} from './nodeIconState';

describe('nodeIconState', () => {
  it('infers provider from known pack ids', () => {
    expect(inferAssetProviderFromPackId('aws-official-starter-v1')).toBe('aws');
    expect(inferAssetProviderFromPackId('developer-icons-v1')).toBe('developer');
  });

  it('normalizes pack and shape to a canonical provider icon payload', () => {
    expect(
      normalizeNodeIconData({
        archIconPackId: 'aws-official-starter-v1',
        archIconShapeId: 'compute-lambda',
      })
    ).toMatchObject({
      archIconPackId: 'aws-official-starter-v1',
      archIconShapeId: 'compute-lambda',
      assetProvider: 'aws',
    });
  });

  it('createBuiltInIconData clears provider and upload fields', () => {
    expect(createBuiltInIconData('Database')).toEqual({
      icon: 'Database',
      customIconUrl: undefined,
      iconAssetId: undefined,
      assetProvider: undefined,
      assetCategory: undefined,
      archIconPackId: undefined,
      archIconShapeId: undefined,
    });
  });

  it('createProviderIconData clears built-in and upload fields', () => {
    expect(
      createProviderIconData({
        packId: 'aws-official-starter-v1',
        shapeId: 'compute-lambda',
        provider: 'aws',
        category: 'Compute',
      })
    ).toEqual({
      icon: undefined,
      customIconUrl: undefined,
      iconAssetId: undefined,
      archIconPackId: 'aws-official-starter-v1',
      archIconShapeId: 'compute-lambda',
      assetProvider: 'aws',
      assetCategory: 'Compute',
    });
  });

  it('createUploadedIconData clears built-in and provider fields', () => {
    expect(createUploadedIconData('data:image/svg+xml;base64,abc')).toEqual({
      icon: undefined,
      customIconUrl: 'data:image/svg+xml;base64,abc',
      iconAssetId: undefined,
      assetProvider: undefined,
      assetCategory: undefined,
      archIconPackId: undefined,
      archIconShapeId: undefined,
    });
  });

  it('createUploadedIconData accepts iconAssetId without inline url', () => {
    expect(createUploadedIconData(undefined, 'sha256:abc')).toEqual({
      icon: undefined,
      customIconUrl: undefined,
      iconAssetId: 'sha256:abc',
      assetProvider: undefined,
      assetCategory: undefined,
      archIconPackId: undefined,
      archIconShapeId: undefined,
    });
  });
});
