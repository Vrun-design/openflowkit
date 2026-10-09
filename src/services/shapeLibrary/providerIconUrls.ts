// Provider icon URLs, one lazy module per pack (iconUrls/<provider>.ts): the first icon drawn or browsed from a
// pack loads all of that pack's URLs in one request. The editor bundle carries only the names (the manifest).
const PACKS = import.meta.glob<Record<string, string>>('./iconUrls/*.ts', { import: 'default' });
const packs = new Map<string, Promise<ReadonlyMap<string, string>>>();

const PROCESSED = '/processed/';
/** `…/aws/processed/Compute/Lambda.svg` → `Compute/Lambda`, the manifest's path. */
const iconPathOf = (key: string): string => key.slice(key.indexOf(PROCESSED) + PROCESSED.length, -'.svg'.length);

const packFor = (provider: string) => PACKS[`./iconUrls/${provider}.ts`];
export const hasProviderIconPack = (provider: string): boolean => packFor(provider) !== undefined;

/** The URL (or inlined data: URL) of `provider`'s icon at `iconPath`; null when the pack or the icon is missing. */
export async function loadProviderIconUrl(provider: string, iconPath: string): Promise<string | null> {
  const load = packFor(provider);
  if (!load) return null;
  let pack = packs.get(provider);
  if (!pack) {
    pack = load().then((urls) => new Map(Object.entries(urls).map(([key, url]) => [iconPathOf(key), url])));
    // A failed load (offline, a deploy swapped the chunk) is tried again next time, not remembered.
    pack.catch(() => packs.delete(provider));
    packs.set(provider, pack);
  }
  return (await pack).get(iconPath) ?? null;
}
