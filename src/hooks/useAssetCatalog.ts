import { useEffect, useMemo, useState } from 'react';
import type { DomainLibraryCategory, DomainLibraryItem } from '@/services/domainLibrary';
import { loadDomainAssetCatalog } from '@/services/assetCatalog';
import { loadProviderShapePreview } from '@/services/shapeLibrary/providerCatalog';

interface UseAssetCatalogOptions {
  provider: string | null;
  loadCatalog?: (provider: DomainLibraryCategory) => Promise<DomainLibraryItem[]>;
}

export function useAssetCatalog({
  provider,
  loadCatalog = loadDomainAssetCatalog,
}: UseAssetCatalogOptions) {
  const [items, setItems] = useState<DomainLibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!provider) {
      return;
    }

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    loadCatalog(provider as DomainLibraryCategory)
      .then((result) => {
        if (!cancelled) {
          setItems(result);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [provider, loadCatalog]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((item) => item.providerShapeCategory)
            .filter((value): value is string => Boolean(value))
        )
      ).sort((left, right) => left.localeCompare(right)),
    [items]
  );

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items
      .filter((item) => {
        if (category !== 'all' && item.providerShapeCategory !== category) {
          return false;
        }
        if (!normalizedQuery) {
          return true;
        }
        return (
          item.label.toLowerCase().includes(normalizedQuery) ||
          item.description.toLowerCase().includes(normalizedQuery) ||
          (item.providerShapeCategory || '').toLowerCase().includes(normalizedQuery)
        );
      })
      .slice(0, 24);
  }, [category, query, items]);

  useEffect(() => {
    if (filteredItems.length === 0) {
      return;
    }

    let cancelled = false;
    Promise.all(
      filteredItems.map(async (item) => {
        if (!item.archIconPackId || !item.archIconShapeId || previewUrls[item.id]) {
          return null;
        }
        const preview = await loadProviderShapePreview(item.archIconPackId, item.archIconShapeId);
        return preview ? ([item.id, preview.previewUrl] as const) : null;
      })
    )
      .then((entries) => {
        if (cancelled) {
          return;
        }
        const loadedEntries = entries.filter(
          (entry): entry is readonly [string, string] => entry !== null
        );
        if (loadedEntries.length === 0) {
          return;
        }
        setPreviewUrls((current) => {
          const next = { ...current };
          loadedEntries.forEach(([itemId, previewUrl]) => {
            next[itemId] = previewUrl;
          });
          return next;
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [filteredItems, previewUrls]);

  return {
    items,
    setItems,
    categories,
    filteredItems,
    previewUrls,
    isLoading,
    query,
    setQuery,
    category,
    setCategory,
  };
}
