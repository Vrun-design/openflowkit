import type { NodeData } from '@/lib/types';
import type { DomainLibraryCategory } from '@/services/domainLibrary';
import { KNOWN_PROVIDER_PACK_IDS, SVG_SOURCES } from '@/services/shapeLibrary/providerCatalog';

export interface ResolvedProviderIconMetadata {
  provider?: DomainLibraryCategory;
  category?: string;
  label?: string;
}

const PACK_ID_TO_PROVIDER = new Map(
  Object.entries(KNOWN_PROVIDER_PACK_IDS).map(([provider, packId]) => [
    packId.toLowerCase(),
    provider as DomainLibraryCategory,
  ])
);

const SHAPE_METADATA = new Map<string, ResolvedProviderIconMetadata>(
  SVG_SOURCES.map((source) => [
    `${source.packId}:${source.shapeId}`,
    {
      provider: source.provider as DomainLibraryCategory,
      category: source.category,
      label: source.label,
    },
  ])
);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function inferAssetProviderFromPackId(
  packId: string | undefined
): DomainLibraryCategory | undefined {
  if (!isNonEmptyString(packId)) {
    return undefined;
  }

  const normalizedPackId = packId.trim().toLowerCase();
  const exactMatch = PACK_ID_TO_PROVIDER.get(normalizedPackId);
  if (exactMatch) {
    return exactMatch;
  }

  const prefixMatch = Array.from(PACK_ID_TO_PROVIDER.entries()).find(([, provider]) =>
    normalizedPackId.includes(provider)
  );
  return prefixMatch?.[1];
}

export function getProviderIconMetadata(
  packId: string | undefined,
  shapeId: string | undefined
): ResolvedProviderIconMetadata {
  if (!isNonEmptyString(packId) || !isNonEmptyString(shapeId)) {
    return {};
  }

  return SHAPE_METADATA.get(`${packId}:${shapeId}`) ?? {
    provider: inferAssetProviderFromPackId(packId),
  };
}

export function createBuiltInIconData(icon: string): Partial<NodeData> {
  return {
    icon,
    customIconUrl: undefined,
    assetProvider: undefined,
    assetCategory: undefined,
    archIconPackId: undefined,
    archIconShapeId: undefined,
  };
}

export function createUploadedIconData(url?: string): Partial<NodeData> {
  return {
    icon: undefined,
    customIconUrl: url,
    assetProvider: undefined,
    assetCategory: undefined,
    archIconPackId: undefined,
    archIconShapeId: undefined,
  };
}

export function createProviderIconData(input: {
  packId: string;
  shapeId: string;
  provider?: DomainLibraryCategory;
  category?: string;
}): Partial<NodeData> {
  const resolved = getProviderIconMetadata(input.packId, input.shapeId);

  return {
    icon: undefined,
    customIconUrl: undefined,
    archIconPackId: input.packId,
    archIconShapeId: input.shapeId,
    assetProvider: input.provider ?? resolved.provider,
    assetCategory: input.category ?? resolved.category,
  };
}

export function normalizeNodeIconData<T extends Partial<NodeData> | undefined>(data: T): T {
  if (!data) {
    return data;
  }

  const next: Partial<NodeData> = { ...data };
  const hasProviderIcon =
    isNonEmptyString(next.archIconPackId) && isNonEmptyString(next.archIconShapeId);
  const hasUploadIcon = isNonEmptyString(next.customIconUrl);
  const hasBuiltInIcon = isNonEmptyString(next.icon);

  if (hasProviderIcon) {
    Object.assign(
      next,
      createProviderIconData({
        packId: next.archIconPackId as string,
        shapeId: next.archIconShapeId as string,
        provider: next.assetProvider as DomainLibraryCategory | undefined,
        category: next.assetCategory as string | undefined,
      })
    );
    return next as T;
  }

  if (hasUploadIcon) {
    Object.assign(next, createUploadedIconData(next.customIconUrl as string));
    return next as T;
  }

  if (hasBuiltInIcon) {
    Object.assign(next, createBuiltInIconData(next.icon as string));
    return next as T;
  }

  next.icon = undefined;
  next.customIconUrl = undefined;
  next.assetProvider = undefined;
  next.assetCategory = undefined;
  next.archIconPackId = undefined;
  next.archIconShapeId = undefined;
  return next as T;
}
