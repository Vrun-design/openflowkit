import type { IconChoice } from '@/opencanvas/domain/nodes/iconNode';
import { SVG_SOURCES } from './providerCatalog';
import { TABLER_PROVIDER } from './tablerIcons';

export interface IconProviderTab {
  readonly id: string;
  readonly label: string;
}

/** Picker tabs, in display order; 'all' spans every pack. */
export const ICON_PROVIDER_TABS: readonly IconProviderTab[] = [
  { id: 'all', label: 'All' },
  { id: TABLER_PROVIDER, label: 'Standard' },
  { id: 'aws', label: 'AWS' },
  { id: 'azure', label: 'Azure' },
  { id: 'gcp', label: 'GCP' },
  { id: 'cncf', label: 'CNCF' },
  { id: 'developer', label: 'Dev' },
];

export interface IconSearchResult {
  readonly icons: readonly IconChoice[];
  readonly total: number;
}

function score(haystack: string, query: string): number {
  if (haystack === query) return 0;
  if (haystack.startsWith(query)) return 1;
  if (haystack.includes(`-${query}`) || haystack.includes(` ${query}`)) return 2;
  if (haystack.includes(query)) return 3;
  return -1;
}

// Ranks by how the query sits in the id, then the label, then the category:
// exact > prefix > word start > substring. Pure and synchronous over the
// bundled catalog so typing never waits on I/O.
export function searchIcons(query: string, provider = 'all', limit = 160): IconSearchResult {
  const q = query.trim().toLowerCase().replace(/\s+/g, '-');
  const pool = provider === 'all' ? SVG_SOURCES : SVG_SOURCES.filter((source) => source.provider === provider);
  const ranked: { readonly source: (typeof SVG_SOURCES)[number]; readonly rank: number }[] = [];
  for (const source of pool) {
    if (!q) { ranked.push({ source, rank: 0 }); continue; }
    const byId = score(source.shapeId, q);
    const byLabel = score(source.label.toLowerCase(), q);
    const byCategory = score(source.category.toLowerCase(), q);
    const best = Math.min(...[byId, byLabel, byCategory === -1 ? -1 : byCategory + 4].filter((value) => value >= 0));
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
