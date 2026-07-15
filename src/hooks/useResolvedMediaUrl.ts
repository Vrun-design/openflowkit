import { useEffect, useState } from 'react';
import type { NodeData } from '@/lib/types';
import {
  getImmediateMediaUrl,
  getNodeIconRef,
  getNodeImageRef,
  type NodeMediaField,
} from '@/lib/nodeMediaState';
import { resolveAssetDisplayUrl } from '@/services/storage/assetStore';

/**
 * Resolve node image/icon media for display.
 * Asset ids are resolved asynchronously to cached blob: URLs.
 * Inline / remote URLs are returned immediately (no effect-driven setState).
 */
export function useResolvedMediaUrl(
  data: Partial<NodeData> | undefined,
  field: NodeMediaField
): string | undefined {
  const ref = field === 'image' ? getNodeImageRef(data) : getNodeIconRef(data);
  const immediate = getImmediateMediaUrl(data, field);
  const [resolvedCache, setResolvedCache] = useState<{
    assetId: string;
    url: string;
  } | null>(null);

  useEffect(() => {
    if (!ref.assetId) {
      return;
    }

    const assetId = ref.assetId;
    let cancelled = false;

    void resolveAssetDisplayUrl(assetId).then((url) => {
      if (!cancelled && url) {
        setResolvedCache({ assetId, url });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [ref.assetId]);

  if (ref.assetId) {
    if (resolvedCache?.assetId === ref.assetId) {
      return resolvedCache.url;
    }
    // Keep any interim inline URL while the asset resolves.
    return immediate;
  }

  return immediate;
}
