import { KNOWN_PROVIDER_PACK_IDS, SVG_SOURCES } from '../shapeLibrary/providerCatalog';

export interface DslIconResolution {
  packId: string;
  shapeId: string;
}

/** Resolves stable provider/icon DSL ids against bundled local catalogs. */
export function resolveDslIcon(id: string): DslIconResolution | null {
  const normalized = id.trim().toLowerCase();
  const separator = normalized.includes('/') ? '/' : normalized.includes(':') ? ':' : '-';
  const [provider, ...rest] = normalized.split(separator);
  const query = rest.join('-').replace(/[^a-z0-9]+/g, '-');
  if (!provider || !query || !KNOWN_PROVIDER_PACK_IDS[provider]) return null;
  const candidates = SVG_SOURCES.filter((source) => source.provider === provider);
  const source = candidates.find((candidate) => candidate.shapeId === query)
    ?? candidates.find((candidate) => candidate.shapeId.endsWith(`-${query}`))
    ?? candidates.find((candidate) => candidate.shapeId.includes(query));
  return source ? { packId: source.packId, shapeId: source.shapeId } : null;
}
