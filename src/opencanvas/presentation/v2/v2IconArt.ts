// Icon art for exports. The exporters are synchronous and catalog-free; this
// loads every provider icon a document draws, once, as a self-contained data
// URL (an SVG opened on its own, or rasterised to PNG, cannot fetch a
// relative asset path), and hands them over keyed `packId:shapeId`.
import { loadProviderShapePreview } from '@/services/shapeLibrary/providerCatalog';
import type { SceneDocumentV1 } from '../../domain/document/types';
import { collectIconArt, iconArtKey } from '../../infrastructure/export/canonicalSvg';

const cache = new Map<string, Promise<string | null>>();

async function dataUrl(packId: string, shapeId: string): Promise<string | null> {
  const preview = await loadProviderShapePreview(packId, shapeId);
  const url = preview?.previewUrl;
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  const response = await fetch(url);
  if (!response.ok) return null;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(await response.text())}`;
}

/** Every provider icon the document draws, as data URLs. A failed load is retried next export. */
export function loadIconArt(document: SceneDocumentV1): Promise<Record<string, string>> {
  return collectIconArt(document, async (packId, shapeId) => {
    const key = iconArtKey(packId, shapeId);
    if (!cache.has(key)) cache.set(key, dataUrl(packId, shapeId).catch(() => null));
    const art = await cache.get(key)!;
    if (art === null) cache.delete(key);
    return art;
  });
}
