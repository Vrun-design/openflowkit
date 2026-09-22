import { describe, expect, it } from 'vitest';
import { createTestDocument } from '../../testing/builders/documentBuilder';
import { createImageNode, fitImageSize, MAX_IMAGE_SIDE } from './imageNode';

const page = () => createTestDocument({ nodes: [] }).pages[0];

describe('fitImageSize', () => {
  it('shrinks the long side to the cap and keeps the ratio', () => {
    expect(fitImageSize({ width: 960, height: 480 })).toEqual({ width: MAX_IMAGE_SIDE, height: 240 });
    expect(fitImageSize({ width: 480, height: 960 })).toEqual({ width: 240, height: MAX_IMAGE_SIDE });
  });

  it('never enlarges a small image', () => {
    expect(fitImageSize({ width: 120, height: 60 })).toEqual({ width: 120, height: 60 });
  });

  it('survives a zero-sized source', () => {
    expect(fitImageSize({ width: 0, height: 0 })).toEqual({ width: 1, height: 1 });
  });
});

describe('createImageNode', () => {
  it('keeps the asset id and the exportable url apart', () => {
    const node = createImageNode(page(), {
      id: 'img-1', at: { x: 10, y: 20 }, size: { width: 240, height: 120 },
      assetId: 'asset-1', url: 'data:image/png;base64,AA==',
    });
    expect(node.kind).toBe('image');
    expect(node.content).toMatchObject({
      imageAssetId: 'asset-1', imageUrl: 'data:image/png;base64,AA==', label: 'Image',
    });
    expect(node.transform.translation).toEqual({ x: 10, y: 20 });
  });

  it('omits the keys it has no value for', () => {
    const node = createImageNode(page(), { id: 'img-2', at: { x: 0, y: 0 }, size: { width: 10, height: 10 } });
    expect(node.content.imageAssetId).toBeUndefined();
    expect(node.content.imageUrl).toBeUndefined();
  });
});
