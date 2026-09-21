import type { DomainLibraryCategory, DomainLibraryItem } from '@/services/domainLibrary';
import { loadTablerIconUrl, TABLER_ICON_NAMES, TABLER_PACK_ID, TABLER_PROVIDER } from './tablerIcons';

export interface ProviderShapePreview {
  packId: string;
  shapeId: string;
  label: string;
  category: string;
  previewUrl: string;
}

interface SvgSource {
  provider: string;
  packId: string;
  shapeId: string;
  label: string;
  category: string;
  previewLoader: () => Promise<string>;
}

const svgModules = import.meta.glob('../../../assets/third-party-icons/*/processed/**/*.svg', {
  query: '?url',
  import: 'default',
}) as Record<string, () => Promise<string>>;
const providerCatalogPromiseCache = new Map<string, Promise<DomainLibraryItem[]>>();
const shapePreviewCache = new Map<string, ProviderShapePreview>();
const shapePreviewPromiseCache = new Map<string, Promise<ProviderShapePreview | null>>();
export const KNOWN_PROVIDER_PACK_IDS: Record<string, string> = {
  aws: 'aws-official-starter-v1',
  azure: 'azure-official-icons-v20',
  gcp: 'gcp-official-icons-v1',
  cncf: 'cncf-artwork-icons-v1',
  developer: 'developer-icons-v1',
  [TABLER_PROVIDER]: TABLER_PACK_ID,
};

function normalizeProviderPathSegment(value: string): string {
  return value.trim().toLowerCase();
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function inferLabelFromId(id: string): string {
  return id
    .split('-')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function getPackIdForProvider(provider: string): string {
  return KNOWN_PROVIDER_PACK_IDS[provider] ?? `${provider}-processed-pack-v1`;
}

function getProviderColor(provider: string): string {
  if (provider === 'aws') {
    return 'amber';
  }

  if (provider === 'azure') {
    return 'blue';
  }

  if (provider === 'gcp') {
    return 'emerald';
  }

  if (provider === 'cncf') {
    return 'cyan';
  }

  return 'slate';
}

function parseSvgSource(
  modulePath: string,
  previewLoader: () => Promise<string>
): SvgSource | null {
  const normalized = modulePath.replaceAll('\\', '/');
  const match = normalized.match(/assets\/third-party-icons\/([^/]+)\/processed\/(.+)\.svg$/);

  if (!match) {
    return null;
  }

  const provider = normalizeProviderPathSegment(match[1]);
  const relativePath = match[2];
  const pathParts = relativePath.split('/');
  const category = pathParts.length > 1 ? inferLabelFromId(slugify(pathParts[0])) : 'Misc';
  const shapeId = slugify(relativePath.replaceAll('/', '-'));

  return {
    provider,
    packId: getPackIdForProvider(provider),
    shapeId,
    label: inferLabelFromId(shapeId),
    category,
    previewLoader,
  };
}

const tablerSources: SvgSource[] = TABLER_ICON_NAMES.map((name) => ({
  provider: TABLER_PROVIDER,
  packId: TABLER_PACK_ID,
  shapeId: name,
  label: inferLabelFromId(name),
  category: 'Standard',
  previewLoader: async () => (await loadTablerIconUrl(name)) ?? '',
}));

// Standard icons first, so an unfiltered picker opens on the general set.
export const SVG_SOURCES: SvgSource[] = tablerSources.concat(
  Object.entries(svgModules)
    .map(([modulePath, previewLoader]) => parseSvgSource(modulePath, previewLoader))
    .filter((value): value is SvgSource => value !== null)
);

function createProviderItem(provider: DomainLibraryCategory, source: SvgSource): DomainLibraryItem {
  return {
    id: `${source.packId}:${source.shapeId}`,
    category: provider,
    label: source.label,
    description: `${provider.toUpperCase()} ${source.category}`,
    icon: 'Box',
    color: getProviderColor(provider),
    nodeType: 'custom',
    assetPresentation: 'icon',
    providerShapeCategory: source.category,
    archIconPackId: source.packId,
    archIconShapeId: source.shapeId,
  };
}

export function listProviderCatalogProviders(): string[] {
  return Array.from(new Set(SVG_SOURCES.map((source) => source.provider))).sort((left, right) =>
    left.localeCompare(right)
  );
}

export function getProviderCatalogCount(provider: DomainLibraryCategory): number {
  const normalizedProvider = normalizeProviderPathSegment(provider);
  return SVG_SOURCES.filter((source) => source.provider === normalizedProvider).length;
}

export async function loadProviderCatalog(
  provider: DomainLibraryCategory
): Promise<DomainLibraryItem[]> {
  const normalizedProvider = normalizeProviderPathSegment(provider);
  const existingPromise = providerCatalogPromiseCache.get(normalizedProvider);
  if (existingPromise) {
    return existingPromise;
  }

  const catalogPromise = (async () => {
    return SVG_SOURCES.filter((source) => source.provider === normalizedProvider)
      .map((source) => createProviderItem(provider, source))
      .sort((left, right) =>
        left.providerShapeCategory === right.providerShapeCategory
          ? left.label.localeCompare(right.label)
          : (left.providerShapeCategory || '').localeCompare(right.providerShapeCategory || '')
      );
  })();

  providerCatalogPromiseCache.set(normalizedProvider, catalogPromise);
  return catalogPromise;
}

interface LoadProviderCatalogSuggestionsOptions {
  category?: string;
  excludeShapeId?: string;
  limit?: number;
  query?: string;
}

export async function loadProviderCatalogSuggestions(
  provider: DomainLibraryCategory,
  options: LoadProviderCatalogSuggestionsOptions = {}
): Promise<DomainLibraryItem[]> {
  const items = await loadProviderCatalog(provider);
  const normalizedQuery = options.query?.trim().toLowerCase() ?? '';
  const filtered = items.filter((item) => {
    if (options.excludeShapeId && item.archIconShapeId === options.excludeShapeId) {
      return false;
    }
    if (options.category && item.providerShapeCategory !== options.category) {
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
  });

  const pool =
    filtered.length > 0 || !options.category
      ? filtered
      : items.filter(
          (item) =>
            (!options.excludeShapeId || item.archIconShapeId !== options.excludeShapeId) &&
            (!normalizedQuery ||
              item.label.toLowerCase().includes(normalizedQuery) ||
              item.description.toLowerCase().includes(normalizedQuery) ||
              (item.providerShapeCategory || '').toLowerCase().includes(normalizedQuery))
        );

  return pool.slice(0, options.limit ?? 8);
}

export async function loadProviderShapePreview(
  packId: string,
  shapeId: string
): Promise<ProviderShapePreview | null> {
  const cacheKey = `${packId}:${shapeId}`;
  const cachedPreview = shapePreviewCache.get(cacheKey);
  if (cachedPreview) {
    return cachedPreview;
  }
  const cachedPromise = shapePreviewPromiseCache.get(cacheKey);
  if (cachedPromise) {
    return cachedPromise;
  }

  const source = SVG_SOURCES.find(
    (candidate) => candidate.packId === packId && candidate.shapeId === shapeId
  );
  if (!source) {
    return null;
  }

  const previewPromise = source
    .previewLoader()
    .then((previewUrl) => {
      const preview = {
        packId,
        shapeId,
        label: source.label,
        category: source.category,
        previewUrl,
      };
      shapePreviewCache.set(cacheKey, preview);
      shapePreviewPromiseCache.delete(cacheKey);
      return preview;
    })
    .catch((error) => {
      shapePreviewPromiseCache.delete(cacheKey);
      throw error;
    });

  shapePreviewPromiseCache.set(cacheKey, previewPromise);
  return previewPromise;
}
