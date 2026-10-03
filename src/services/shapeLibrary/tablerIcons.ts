import { iconsList } from '@tabler/icons-react';
import { ICON_PACK_IDS } from '@/dsl/iconMatch';
import { tablerSvg, type TablerNode } from './tablerSvg';

// Tabler outline icons as one more provider pack ("standard" icons). Names
// come from the installed package; path data loads once, lazily, as a single
// JSON chunk when the first Tabler icon is drawn or browsed.
// ponytail: one 2 MB JSON for all 5k icons — split per icon if first paint of
// a Tabler node ever matters more than bundle count.

export const TABLER_PROVIDER = 'tabler';
export const TABLER_PACK_ID = ICON_PACK_IDS[TABLER_PROVIDER]!;
// Outline only: the filled variants double the list without adding meaning.
export const TABLER_ICON_NAMES: readonly string[] = iconsList.default.filter((name) => !name.endsWith('-filled'));

type TablerNodes = Readonly<Record<string, readonly TablerNode[]>>;

let nodesPromise: Promise<TablerNodes> | null = null;

function loadNodes(): Promise<TablerNodes> {
  nodesPromise ??= import('../../../node_modules/@tabler/icons/tabler-nodes-outline.json')
    .then((module) => module.default as unknown as TablerNodes);
  return nodesPromise;
}

export async function loadTablerIconUrl(name: string): Promise<string | null> {
  const nodes = (await loadNodes())[name];
  return nodes ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(tablerSvg(nodes))}` : null;
}
