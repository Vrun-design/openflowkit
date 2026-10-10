// One rule for turning a DSL icon id (`aws/lambda`, `aws-lambda`,
// `developer:database-redis`) into a catalog entry, shared by the editor
// (bundled SVGs) and the MCP server (its icon manifest), so a diagram
// resolves the same icons wherever it is compiled. `rankIcons` is the one search
// ranking, for the picker and both agent hosts alike.
import { iconAliases } from './autoIcon';

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

/** Provider words the docs use that name another pack. */
const PROVIDER_ALIASES: Readonly<Record<string, string>> = { tech: 'developer' };

/**
 * `shapeIds(provider)` lists that provider's catalog. The name after the
 * provider matches exactly first, then as a suffix (`aws/lambda` →
 * `compute-lambda`), then as the start of the last word (`tech/react` →
 * `frontend-reactjs`, not `frontend-preact`), then as a whole word, then anywhere.
 */
export function matchIconId(id: string, shapeIds: (provider: string) => readonly string[]): IconResolution | null {
  const normalized = id.trim().toLowerCase();
  const separator = normalized.includes('/') ? '/' : normalized.includes(':') ? ':' : '-';
  const [written, ...rest] = normalized.split(separator);
  const provider = written ? PROVIDER_ALIASES[written] ?? written : undefined;
  const query = rest.join('-').replace(/[^a-z0-9]+/g, '-');
  const packId = provider ? ICON_PACK_IDS[provider] : undefined;
  if (!provider || !query || !packId) return null;
  const candidates = shapeIds(provider);
  // A name the auto-icon table knows (`aws/sqs` → simple-queue-service) beats a fuzzy guess.
  const aliased = iconAliases(query).find((alias) => alias.startsWith(`${provider}/`) && candidates.includes(alias.slice(provider.length + 1)));
  const shapeId = candidates.find((candidate) => candidate === query)
    ?? aliased?.slice(provider.length + 1)
    ?? candidates.find((candidate) => candidate.endsWith(`-${query}`))
    ?? candidates.find((candidate) => candidate.split('-').at(-1)!.startsWith(query))
    ?? candidates.find((candidate) => `-${candidate}-`.includes(`-${query}-`))
    ?? candidates.find((candidate) => candidate.includes(query));
  return shapeId ? { packId, shapeId } : null;
}

export interface IconFields {
  readonly provider: string;
  readonly id: string;
  readonly label: string;
  readonly category?: string;
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

/**
 * Icons matching `query`, best first: a name the auto-icon table knows ("eks", "sqs") first, then by
 * how the query sits in the id, the label, the category: exact > prefix > word start > substring;
 * shorter ids break ties. A leading provider word ("aws lambda") keeps to that provider.
 */
export function rankIcons<T>(items: readonly T[], query: string, fields: (item: T) => IconFields): T[] {
  const whole = query.trim().toLowerCase().replace(/\s+/g, '-');
  if (!whole) return [...items];
  const [first, ...rest] = whole.split('-');
  const pinned = rest.length > 0 && first && ICON_PACK_IDS[PROVIDER_ALIASES[first] ?? first] ? PROVIDER_ALIASES[first] ?? first : null;
  const q = pinned ? rest.join('-') : whole;
  const aliased = new Set([...iconAliases(whole), ...iconAliases(q)]);
  const ranked: { readonly item: T; readonly id: string; readonly rank: number }[] = [];
  for (const item of items) {
    const { provider, id, label, category } = fields(item);
    if (pinned && provider !== pinned) continue;
    const byCategory = category ? score(category.toLowerCase(), q) : -1;
    const best = aliased.has(`${provider}/${id}`) ? -1
      : Math.min(...[score(id, q), score(label.toLowerCase(), q), byCategory === -1 ? -1 : byCategory + 4].filter((value) => value >= 0));
    if (Number.isFinite(best)) ranked.push({ item, id, rank: best });
  }
  return ranked.sort((a, b) => a.rank - b.rank || a.id.length - b.id.length || a.id.localeCompare(b.id)).map(({ item }) => item);
}
