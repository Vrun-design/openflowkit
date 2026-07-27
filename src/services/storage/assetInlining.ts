import type { FlowNode, NodeData } from '@/lib/types';
import { getNodeIconRef, getNodeImageRef } from '@/lib/nodeMediaState';
import { blobToDataUrl } from './assetEncode';
import { getFlowAsset, isAssetStoreAvailable } from './assetStore';
import { reportStorageTelemetry } from './storageTelemetry';

/**
 * Asset ids only mean something inside the browser that stored the bytes.
 * Anything leaving this machine (JSON export, clipboard copy) has to carry the
 * bytes inline, so we swap `imageAssetId` / `iconAssetId` back for data URLs and
 * drop the ids — `getNodeImageRef` prefers the id, so leaving both would make the
 * importing browser resolve a missing asset and render nothing.
 */
async function inlineAssetIdsForNodeData(data: NodeData): Promise<NodeData | null> {
  const imageRef = getNodeImageRef(data);
  const iconRef = getNodeIconRef(data);
  if (!imageRef.assetId && !iconRef.assetId) {
    return null;
  }

  let next: NodeData = { ...data };

  if (imageRef.assetId) {
    const asset = await getFlowAsset(imageRef.assetId);
    if (asset?.bytes) {
      next = { ...next, imageUrl: await blobToDataUrl(asset.bytes), imageAssetId: undefined };
    }
  }

  if (iconRef.assetId) {
    const asset = await getFlowAsset(iconRef.assetId);
    if (asset?.bytes) {
      next = { ...next, customIconUrl: await blobToDataUrl(asset.bytes), iconAssetId: undefined };
    }
  }

  return next;
}

/**
 * Replace asset references with inline data URLs so an exported document is
 * self-contained. Missing assets keep their id rather than silently vanishing,
 * so a failed lookup is visible instead of looking like an image that was never set.
 */
export async function inlineNodeAssetsForTransfer(nodes: FlowNode[]): Promise<FlowNode[]> {
  if (!isAssetStoreAvailable()) {
    return nodes;
  }

  try {
    return await Promise.all(
      nodes.map(async (node) => {
        const inlined = await inlineAssetIdsForNodeData(node.data);
        return inlined ? { ...node, data: inlined } : node;
      })
    );
  } catch (error) {
    reportStorageTelemetry({
      area: 'persist',
      code: 'ASSET_INLINE_FAILED',
      severity: 'warning',
      message: `Failed to inline assets for export; exported media may be missing. ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
    return nodes;
  }
}
