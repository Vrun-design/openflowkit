import { rankIcons } from '@/dsl/iconMatch';
import type { IconChoice } from '@/opencanvas/domain/nodes/iconNode';
import { SVG_SOURCES } from './providerCatalog';
import { TABLER_PROVIDER } from './tablerIcons';

export interface IconPack {
  readonly id: string;
  readonly label: string;
}

/** Picker structure: top-level packs, with the cloud vendors nested under one tab. */
export const ICON_PACKS: readonly IconPack[] = [
  { id: TABLER_PROVIDER, label: 'Standard' },
  { id: 'cloud', label: 'Cloud' },
  { id: 'developer', label: 'Dev' },
];
export const CLOUD_PROVIDERS: readonly IconPack[] = [
  { id: 'aws', label: 'AWS' },
  { id: 'azure', label: 'Azure' },
  { id: 'gcp', label: 'GCP' },
  { id: 'cncf', label: 'CNCF' },
];
const CLOUD_IDS = new Set(CLOUD_PROVIDERS.map((pack) => pack.id));

export function packLabel(provider: string): string {
  return [...ICON_PACKS, ...CLOUD_PROVIDERS].find((pack) => pack.id === provider)?.label ?? provider.toUpperCase();
}

function inScope(provider: string, scope: string): boolean {
  return scope === 'all' || provider === scope || (scope === 'cloud' && CLOUD_IDS.has(provider));
}

export interface IconSearchResult {
  readonly icons: readonly IconChoice[];
  readonly total: number;
}

// Pure and synchronous over the bundled catalog so typing never waits on I/O. `scope` is a pack id,
// a cloud vendor id, 'cloud' (all vendors) or 'all'. Ranking: `rankIcons`, shared with the agent hosts.
export function searchIcons(query: string, scope = 'all', limit = 160): IconSearchResult {
  const pool = SVG_SOURCES.filter((source) => inScope(source.provider, scope));
  const ranked = rankIcons(pool, query, (source) => ({ provider: source.provider, id: source.shapeId, label: source.label, category: source.category }));
  return {
    total: ranked.length,
    icons: ranked.slice(0, limit).map((source) => ({
      provider: source.provider, packId: source.packId, shapeId: source.shapeId, label: source.label,
    })),
  };
}

/** Per-provider totals inside a scope, in catalog order; the browse view's group headers. */
export function iconCounts(scope = 'all'): readonly { readonly provider: string; readonly total: number }[] {
  const counts = new Map<string, number>();
  for (const source of SVG_SOURCES) {
    if (inScope(source.provider, scope)) counts.set(source.provider, (counts.get(source.provider) ?? 0) + 1);
  }
  return [...counts].map(([provider, total]) => ({ provider, total }));
}
