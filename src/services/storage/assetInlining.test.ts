import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FlowNode } from '@/lib/types';
import { inlineNodeAssetsForTransfer } from './assetInlining';

const IMAGE_ID = `sha256:${'1'.repeat(64)}`;
const ICON_ID = `sha256:${'2'.repeat(64)}`;

// jsdom's Blob has no arrayBuffer(), so stand in a minimal blob-like with the
// two members blobToDataUrl actually reads.
function fakeBlob(type: string): Blob {
  return {
    type,
    arrayBuffer: async () => new TextEncoder().encode('bytes').buffer,
  } as unknown as Blob;
}

vi.mock('./assetStore', () => ({
  isAssetStoreAvailable: vi.fn(() => true),
  getFlowAsset: vi.fn(async (assetId: string) =>
    assetId === `sha256:${'9'.repeat(64)}`
      ? null
      : { id: assetId, bytes: fakeBlob('image/png') }
  ),
}));

import { getFlowAsset, isAssetStoreAvailable } from './assetStore';

function node(id: string, data: FlowNode['data']): FlowNode {
  return { id, position: { x: 0, y: 0 }, data };
}

describe('inlineNodeAssetsForTransfer', () => {
  beforeEach(() => {
    vi.mocked(isAssetStoreAvailable).mockReturnValue(true);
    vi.mocked(getFlowAsset).mockClear();
  });

  it('swaps asset ids for inline data URLs so exports survive another machine', async () => {
    const [result] = await inlineNodeAssetsForTransfer([
      node('n1', { label: 'A', imageAssetId: IMAGE_ID, iconAssetId: ICON_ID }),
    ]);

    expect(result.data.imageUrl).toMatch(/^data:image\/png;base64,/);
    expect(result.data.customIconUrl).toMatch(/^data:image\/png;base64,/);
    // Ids must go: getNodeImageRef prefers the id, so leaving it would make the
    // importing browser resolve a missing asset and render nothing.
    expect(result.data.imageAssetId).toBeUndefined();
    expect(result.data.iconAssetId).toBeUndefined();
  });

  it('leaves nodes without asset ids untouched', async () => {
    const input = [node('n1', { label: 'B', imageUrl: 'https://example.com/a.png' })];
    const result = await inlineNodeAssetsForTransfer(input);
    expect(result[0]).toBe(input[0]);
    expect(getFlowAsset).not.toHaveBeenCalled();
  });

  it('keeps the id when the asset is missing instead of dropping the reference', async () => {
    const missing = `sha256:${'9'.repeat(64)}`;
    const [result] = await inlineNodeAssetsForTransfer([
      node('n1', { label: 'C', imageAssetId: missing }),
    ]);
    expect(result.data.imageAssetId).toBe(missing);
    expect(result.data.imageUrl).toBeUndefined();
  });

  it('no-ops when the asset store is disabled', async () => {
    vi.mocked(isAssetStoreAvailable).mockReturnValue(false);
    const input = [node('n1', { label: 'D', imageAssetId: IMAGE_ID })];
    expect(await inlineNodeAssetsForTransfer(input)).toBe(input);
  });
});
