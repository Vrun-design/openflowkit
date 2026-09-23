import { iconsList } from '@tabler/icons-react';
import { ICON_PACK_IDS } from '@/dsl/iconMatch';

// Tabler outline icons as one more provider pack ("standard" icons). Names
// come from the installed package; path data loads once, lazily, as a single
// JSON chunk when the first Tabler icon is drawn or browsed.
// ponytail: one 2 MB JSON for all 5k icons — split per icon if first paint of
// a Tabler node ever matters more than bundle count.

export const TABLER_PROVIDER = 'tabler';
export const TABLER_PACK_ID = ICON_PACK_IDS[TABLER_PROVIDER]!;
// Outline only: the filled variants double the list without adding meaning.
export const TABLER_ICON_NAMES: readonly string[] = iconsList.default.filter((name) => !name.endsWith('-filled'));

type TablerNode = readonly [string, Readonly<Record<string, string>>];
type TablerNodes = Readonly<Record<string, readonly TablerNode[]>>;

let nodesPromise: Promise<TablerNodes> | null = null;

function loadNodes(): Promise<TablerNodes> {
  nodesPromise ??= import('../../../node_modules/@tabler/icons/tabler-nodes-outline.json')
    .then((module) => module.default as unknown as TablerNodes);
  return nodesPromise;
}

const INK = '#334155';

function attributeText(attributes: Readonly<Record<string, string>>): string {
  return Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ');
}

/** SVG for one icon at 96px, so the rasterised texture stays sharp on a 60px plate. */
export function tablerSvg(nodes: readonly TablerNode[]): string {
  const body = nodes.map(([tag, attributes]) => `<${tag} ${attributeText(attributes)}/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="${INK}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

export async function loadTablerIconUrl(name: string): Promise<string | null> {
  const nodes = (await loadNodes())[name];
  return nodes ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(tablerSvg(nodes))}` : null;
}
