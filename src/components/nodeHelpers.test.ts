import { describe, expect, it } from 'vitest';
import type { FlowNode } from '@/lib/types';
import { getIconAssetNodeMinSize, resolveNodeSize } from './nodeHelpers';

function createNode(data: Partial<FlowNode['data']> = {}): FlowNode {
  return {
    id: 'node-1',
    type: 'custom',
    position: { x: 0, y: 0 },
    data: {
      label: '',
      ...data,
    },
  } as FlowNode;
}

describe('nodeHelpers sizing', () => {
  it('returns stable icon asset minimums without a label', () => {
    expect(getIconAssetNodeMinSize(false)).toEqual({ minWidth: 96, minHeight: 88 });
  });

  it('returns stable icon asset minimums with a label', () => {
    expect(getIconAssetNodeMinSize(true)).toEqual({ minWidth: 116, minHeight: 118 });
  });

  it('uses icon asset sizing for asset presentation nodes', () => {
    const iconNode = createNode({
      label: 'Backend Bunjs',
      assetPresentation: 'icon',
    });

    expect(resolveNodeSize(iconNode)).toEqual({ width: 116, height: 118 });
  });

  it('prefers explicit dimensions when present', () => {
    const iconNode = createNode({
      label: 'Backend Bunjs',
      assetPresentation: 'icon',
      width: 180,
      height: 140,
    });

    expect(resolveNodeSize(iconNode)).toEqual({ width: 180, height: 140 });
  });
});
