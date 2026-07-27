import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FlowNode, NodeData } from '@/lib/types';
import { migrateNodeMediaData, migrateNodesMedia } from './assetMigration';

vi.mock('./assetStore', () => ({
  isAssetStoreAvailable: vi.fn(() => true),
  isDataUrl: (value: unknown) => typeof value === 'string' && value.startsWith('data:'),
  ingestDataUrlAsAsset: vi.fn(async (dataUrl: string, kind: 'image' | 'icon') => ({
    assetId: kind === 'image' ? 'sha256:1111111111111111111111111111111111111111111111111111111111111111' : 'sha256:2222222222222222222222222222222222222222222222222222222222222222',
    displayUrl: dataUrl,
    mimeType: 'image/png',
    byteLength: 12,
  })),
}));

import { ingestDataUrlAsAsset, isAssetStoreAvailable } from './assetStore';

function node(data: NodeData): FlowNode {
  return {
    id: 'n1',
    position: { x: 0, y: 0 },
    data,
  };
}

describe('assetMigration', () => {
  beforeEach(() => {
    vi.mocked(isAssetStoreAvailable).mockReturnValue(true);
    vi.mocked(ingestDataUrlAsAsset).mockClear();
  });

  it('migrates image data URLs into imageAssetId and clears imageUrl', async () => {
    const result = await migrateNodeMediaData({
      label: 'Img',
      imageUrl: 'data:image/png;base64,aaa',
    });
    expect(result.changed).toBe(true);
    expect(result.data.imageAssetId).toBe('sha256:1111111111111111111111111111111111111111111111111111111111111111');
    expect(result.data.imageUrl).toBeUndefined();
    expect(result.assetIds).toContain('sha256:1111111111111111111111111111111111111111111111111111111111111111');
  });

  it('migrates custom icon data URLs into iconAssetId', async () => {
    const result = await migrateNodeMediaData({
      label: 'Icon',
      customIconUrl: 'data:image/svg+xml;base64,bbb',
    });
    expect(result.changed).toBe(true);
    expect(result.data.iconAssetId).toBe('sha256:2222222222222222222222222222222222222222222222222222222222222222');
    expect(result.data.customIconUrl).toBeUndefined();
  });

  it('leaves https URLs alone', async () => {
    const result = await migrateNodeMediaData({
      label: 'Remote',
      imageUrl: 'https://example.com/a.png',
    });
    expect(result.changed).toBe(false);
    expect(ingestDataUrlAsAsset).not.toHaveBeenCalled();
  });

  it('no-ops when the asset store is disabled', async () => {
    vi.mocked(isAssetStoreAvailable).mockReturnValue(false);
    const result = await migrateNodesMedia([
      node({ label: 'A', imageUrl: 'data:image/png;base64,aaa' }),
    ]);
    expect(result.changed).toBe(false);
    expect(result.nodes[0].data.imageUrl).toBe('data:image/png;base64,aaa');
  });
});
