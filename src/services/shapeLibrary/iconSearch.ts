import { iconAliases } from '@/dsl/autoIcon';
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

const compact = (text: string): string => text.replace(/[\s._-]+/g, '');

function score(haystack: string, query: string): number {
  if (haystack === query) return 0;
  if (haystack.startsWith(query)) return 1;
  if (haystack.includes(`-${query}`) || haystack.includes(` ${query}`)) return 2;
  // "route53" finds route-53: spaces and dashes don't count inside a match.
  const bare = compact(query);
  if (bare && compact(haystack).includes(bare)) return 3;
  return -1;
}

// A name the auto-icon table knows ("eks", "alb") ranks first; then by how
// the query sits in the id, the label, the category: exact > prefix > word
// start > substring. Pure and synchronous over the
// bundled catalog so typing never waits on I/O. `scope` is a pack id, a
// cloud vendor id, 'cloud' (all vendors) or 'all'.
export function searchIcons(query: string, scope = 'all', limit = 160): IconSearchResult {
  const q = query.trim().toLowerCase().replace(/\s+/g, '-');
  const pool = SVG_SOURCES.filter((source) => inScope(source.provider, scope));
  const aliased = new Set(q ? iconAliases(q) : []);
  const ranked: { readonly source: (typeof SVG_SOURCES)[number]; readonly rank: number }[] = [];
  for (const source of pool) {
    if (!q) { ranked.push({ source, rank: 0 }); continue; }
    const byId = score(source.shapeId, q);
    const byLabel = score(source.label.toLowerCase(), q);
    const byCategory = score(source.category.toLowerCase(), q);
    const best = aliased.has(`${source.provider}/${source.shapeId}`) ? -1
      : Math.min(...[byId, byLabel, byCategory === -1 ? -1 : byCategory + 4].filter((value) => value >= 0));
    if (Number.isFinite(best)) ranked.push({ source, rank: best });
  }
  if (q) ranked.sort((a, b) => a.rank - b.rank || a.source.shapeId.length - b.source.shapeId.length);
  return {
    total: ranked.length,
    icons: ranked.slice(0, limit).map(({ source }) => ({
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
