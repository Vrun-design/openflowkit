import { useEffect, useState } from 'react';
import { loadProviderShapePreview } from '@/services/shapeLibrary/providerCatalog';

/** Resolves a provider shape icon URL from pack/shape IDs, with cancellation handling. */
export function useProviderShapePreview(
  packId: string | undefined,
  shapeId: string | undefined,
  customIconUrl: string | undefined
): string | null {
  const previewKey = packId && shapeId ? `${packId}:${shapeId}` : null;
  const [state, setState] = useState<{ key: string | null; url: string | null }>({
    key: null,
    url: null,
  });

  useEffect(() => {
    if (customIconUrl) return;
    if (!packId || !shapeId || !previewKey) return;

    let cancelled = false;
    loadProviderShapePreview(packId, shapeId)
      .then((preview) => {
        if (!cancelled) setState({ key: previewKey, url: preview?.previewUrl ?? null });
      })
      .catch(() => {
        if (!cancelled) setState({ key: previewKey, url: null });
      });

    return () => {
      cancelled = true;
    };
  }, [packId, shapeId, customIconUrl, previewKey]);

  if (customIconUrl) return customIconUrl;
  return state.key === previewKey ? state.url : null;
}
