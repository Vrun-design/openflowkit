// One rule for turning a DSL icon id (`aws/lambda`, `aws-lambda`,
// `developer:database-redis`) into a catalog entry, shared by the editor
// (bundled SVGs) and the MCP server (its icon manifest), so a diagram
// resolves the same icons wherever it is compiled.

/** Pack id per provider; the renderer finds the art by pack id + shape id. */
export const ICON_PACK_IDS: Readonly<Record<string, string>> = {
  aws: 'aws-official-starter-v1',
  azure: 'azure-official-icons-v20',
  gcp: 'gcp-official-icons-v1',
  cncf: 'cncf-artwork-icons-v1',
  developer: 'developer-icons-v1',
  tabler: 'tabler-outline-v3',
};

export interface IconResolution {
  packId: string;
  shapeId: string;
}

/**
 * `shapeIds(provider)` lists that provider's catalog. The name after the
 * provider matches exactly first, then as a suffix (`aws/lambda` →
 * `compute-lambda`), then anywhere in the id.
 */
export function matchIconId(id: string, shapeIds: (provider: string) => readonly string[]): IconResolution | null {
  const normalized = id.trim().toLowerCase();
  const separator = normalized.includes('/') ? '/' : normalized.includes(':') ? ':' : '-';
  const [provider, ...rest] = normalized.split(separator);
  const query = rest.join('-').replace(/[^a-z0-9]+/g, '-');
  const packId = provider ? ICON_PACK_IDS[provider] : undefined;
  if (!provider || !query || !packId) return null;
  const candidates = shapeIds(provider);
  const shapeId = candidates.find((candidate) => candidate === query)
    ?? candidates.find((candidate) => candidate.endsWith(`-${query}`))
    ?? candidates.find((candidate) => candidate.includes(query));
  return shapeId ? { packId, shapeId } : null;
}
