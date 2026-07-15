import type { FlowNode, NodeData } from '@/lib/types';
import { isAssetId } from '@/services/storage/assetHash';
import { isDataUrl } from '@/services/storage/assetEncode';

export type NodeMediaField = 'image' | 'icon';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function createImageMediaData(input: {
  imageUrl?: string;
  imageAssetId?: string;
}): Partial<NodeData> {
  return {
    imageUrl: input.imageUrl,
    imageAssetId: input.imageAssetId,
  };
}

export function createIconMediaData(input: {
  customIconUrl?: string;
  iconAssetId?: string;
}): Partial<NodeData> {
  return {
    icon: undefined,
    customIconUrl: input.customIconUrl,
    iconAssetId: input.iconAssetId,
    assetProvider: undefined,
    assetCategory: undefined,
    archIconPackId: undefined,
    archIconShapeId: undefined,
  };
}

/**
 * Prefer asset id for storage-efficient references; fall back to inline URL.
 */
export function getNodeImageRef(data: Partial<NodeData> | undefined): {
  assetId?: string;
  url?: string;
} {
  if (!data) {
    return {};
  }
  if (isNonEmptyString(data.imageAssetId) && isAssetId(data.imageAssetId)) {
    return { assetId: data.imageAssetId.trim() };
  }
  if (isNonEmptyString(data.imageUrl)) {
    return { url: data.imageUrl };
  }
  return {};
}

export function getNodeIconRef(data: Partial<NodeData> | undefined): {
  assetId?: string;
  url?: string;
} {
  if (!data) {
    return {};
  }
  if (isNonEmptyString(data.iconAssetId) && isAssetId(data.iconAssetId)) {
    return { assetId: data.iconAssetId.trim() };
  }
  if (isNonEmptyString(data.customIconUrl)) {
    return { url: data.customIconUrl };
  }
  return {};
}

/**
 * Synchronous display source for places that already have a resolved URL
 * or a non-asset URL (https / remaining data URLs). Asset ids need async resolve.
 */
export function getImmediateMediaUrl(data: Partial<NodeData> | undefined, field: NodeMediaField): string | undefined {
  const ref = field === 'image' ? getNodeImageRef(data) : getNodeIconRef(data);
  if (ref.url) {
    return ref.url;
  }
  return undefined;
}

export function collectReferencedAssetIds(nodes: Iterable<FlowNode | { data?: Partial<NodeData> }>): string[] {
  const ids = new Set<string>();
  for (const node of nodes) {
    const imageRef = getNodeImageRef(node.data);
    if (imageRef.assetId) {
      ids.add(imageRef.assetId);
    }
    const iconRef = getNodeIconRef(node.data);
    if (iconRef.assetId) {
      ids.add(iconRef.assetId);
    }
  }
  return Array.from(ids);
}

export function nodeHasInlineDataUrlMedia(data: Partial<NodeData> | undefined): boolean {
  if (!data) {
    return false;
  }
  return isDataUrl(data.imageUrl) || isDataUrl(data.customIconUrl);
}
