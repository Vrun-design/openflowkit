import type { FlowNode, NodeData } from '@/lib/types';
import { getNodeIconRef, getNodeImageRef, nodeHasInlineDataUrlMedia } from '@/lib/nodeMediaState';
import { ingestDataUrlAsAsset, isAssetStoreAvailable, isDataUrl } from './assetStore';

export interface MigrateNodeMediaResult {
  data: NodeData;
  changed: boolean;
  assetIds: string[];
}

/**
 * Migrate a single node's inline data: URLs into the asset store.
 * Leaves https:// URLs alone. Clears the large data URL once an asset id is stored.
 */
export async function migrateNodeMediaData(data: NodeData): Promise<MigrateNodeMediaResult> {
  if (!isAssetStoreAvailable() || !nodeHasInlineDataUrlMedia(data)) {
    return { data, changed: false, assetIds: [] };
  }

  let next: NodeData = { ...data };
  let changed = false;
  const assetIds: string[] = [];

  if (isDataUrl(next.imageUrl) && !getNodeImageRef(next).assetId) {
    const ingested = await ingestDataUrlAsAsset(next.imageUrl, 'image');
    if (ingested?.assetId) {
      next = {
        ...next,
        imageAssetId: ingested.assetId,
        // Drop embedded payload once the asset store owns the bytes.
        imageUrl: undefined,
      };
      changed = true;
      assetIds.push(ingested.assetId);
    }
  } else if (getNodeImageRef(next).assetId) {
    assetIds.push(getNodeImageRef(next).assetId as string);
  }

  if (isDataUrl(next.customIconUrl) && !getNodeIconRef(next).assetId) {
    const ingested = await ingestDataUrlAsAsset(next.customIconUrl, 'icon');
    if (ingested?.assetId) {
      next = {
        ...next,
        iconAssetId: ingested.assetId,
        customIconUrl: undefined,
      };
      changed = true;
      assetIds.push(ingested.assetId);
    }
  } else if (getNodeIconRef(next).assetId) {
    assetIds.push(getNodeIconRef(next).assetId as string);
  }

  return { data: next, changed, assetIds };
}

export async function migrateNodesMedia(nodes: FlowNode[]): Promise<{
  nodes: FlowNode[];
  changed: boolean;
  assetIds: string[];
}> {
  if (!isAssetStoreAvailable()) {
    return { nodes, changed: false, assetIds: [] };
  }

  let changed = false;
  const assetIds: string[] = [];
  const nextNodes: FlowNode[] = [];

  for (const node of nodes) {
    const migrated = await migrateNodeMediaData(node.data);
    if (migrated.changed) {
      changed = true;
      nextNodes.push({ ...node, data: migrated.data });
    } else {
      nextNodes.push(node);
    }
    assetIds.push(...migrated.assetIds);
  }

  return { nodes: nextNodes, changed, assetIds };
}
