import {
    DOMAIN_LIBRARY_ITEMS,
    type DomainLibraryCategory,
    type DomainLibraryItem,
} from '@/services/domainLibrary';
import {
    getProviderCatalogCount,
    loadProviderCatalog,
    loadProviderCatalogSuggestions,
} from '@/services/shapeLibrary/providerCatalog';
import { loadIconAssetCatalog } from '@/services/iconAssetCatalog';

const PROVIDER_BACKED_ASSET_CATEGORIES: DomainLibraryCategory[] = ['aws', 'azure', 'gcp', 'cncf', 'developer'];

export function isProviderBackedAssetCategory(category: DomainLibraryCategory): boolean {
    return PROVIDER_BACKED_ASSET_CATEGORIES.includes(category);
}

function getEmbeddedIconAssetItems(): DomainLibraryItem[] {
    return DOMAIN_LIBRARY_ITEMS
        .filter((item) => item.category === 'network' || item.category === 'c4' || item.category === 'security')
        .map((item) => ({
            ...item,
            category: 'icons',
            assetPresentation: 'icon',
            providerShapeCategory: item.category === 'network'
                ? 'Network'
                : item.category === 'c4'
                    ? 'C4'
                    : 'Security',
        }));
}

export function loadDomainAssetCatalog(category: DomainLibraryCategory): Promise<DomainLibraryItem[]> {
    if (category === 'icons') {
        return Promise.resolve([
            ...loadIconAssetCatalog(),
            ...getEmbeddedIconAssetItems(),
        ]);
    }

    if (isProviderBackedAssetCategory(category)) {
        return loadProviderCatalog(category);
    }

    return Promise.resolve(DOMAIN_LIBRARY_ITEMS.filter((item) => item.category === category));
}

interface LoadDomainAssetSuggestionsOptions {
    category?: string;
    excludeIcon?: string;
    excludeShapeId?: string;
    limit?: number;
    query?: string;
}

export function loadDomainAssetSuggestions(
    category: DomainLibraryCategory,
    options: LoadDomainAssetSuggestionsOptions = {},
): Promise<DomainLibraryItem[]> {
    if (category === 'icons') {
        const normalizedQuery = options.query?.trim().toLowerCase() ?? '';
        const items = [
            ...loadIconAssetCatalog(),
            ...getEmbeddedIconAssetItems(),
        ];

        const filteredItems = items.filter((item) => {
            if (options.excludeIcon && item.icon === options.excludeIcon) {
                return false;
            }
            if (options.category && options.category !== 'all' && item.providerShapeCategory !== options.category) {
                return false;
            }
            if (!normalizedQuery) {
                return true;
            }
            return item.label.toLowerCase().includes(normalizedQuery)
                || item.description.toLowerCase().includes(normalizedQuery)
                || (item.providerShapeCategory || '').toLowerCase().includes(normalizedQuery);
        });

        return Promise.resolve(filteredItems.slice(0, options.limit ?? 18));
    }

    if (isProviderBackedAssetCategory(category)) {
        return loadProviderCatalogSuggestions(category, {
            category: options.category,
            excludeShapeId: options.excludeShapeId,
            limit: options.limit,
            query: options.query,
        });
    }

    const normalizedQuery = options.query?.trim().toLowerCase() ?? '';
    const filteredItems = DOMAIN_LIBRARY_ITEMS.filter((item) => {
        if (item.category !== category) {
            return false;
        }
        if (options.category && options.category !== 'all' && item.providerShapeCategory !== options.category) {
            return false;
        }
        if (!normalizedQuery) {
            return true;
        }
        return item.label.toLowerCase().includes(normalizedQuery)
            || item.description.toLowerCase().includes(normalizedQuery)
            || (item.providerShapeCategory || '').toLowerCase().includes(normalizedQuery);
    });

    return Promise.resolve(filteredItems.slice(0, options.limit ?? 18));
}

export function getDomainAssetCatalogCount(category: DomainLibraryCategory): number {
    if (category === 'icons') {
        return loadIconAssetCatalog().length + getEmbeddedIconAssetItems().length;
    }

    if (isProviderBackedAssetCategory(category)) {
        return getProviderCatalogCount(category);
    }

    return DOMAIN_LIBRARY_ITEMS.filter((item) => item.category === category).length;
}
