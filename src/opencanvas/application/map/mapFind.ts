import type { MapModel, MapNode } from '../../../dsl/map/types';
import type { ArchModel } from '../../../dsl/model/types';

// ponytail: lower-case only, as the canvas find (domain/scene/findNodes) — diacritics match when it learns them.
const fold = (text: string | undefined) => (text ?? '').toLowerCase();

/** Engine-made buckets (`more` boxes and their alphabetical ranges) are no element: nobody searches for them. */
export const synthetic = (n: MapNode) => n.kind === 'more' || (n.kind === 'group' && n.id.includes('#more'));

/** Boxes whose name, path or (C4) technology or description contains `query`, in tree order. Closed boxes are searched too. */
export function mapFindMatches(model: MapModel, arch: ArchModel | null, query: string): string[] {
  const needle = fold(query.trim());
  if (!needle) return [];
  const elements = new Map(arch?.elements.map((e) => [e.id, e]));
  const out: string[] = [];
  const walk = (id: string) => {
    const n = model.nodes[id];
    if (!n) return;
    const e = elements.get(id);
    if (id !== model.root && !synthetic(n) && [n.name, n.path, e?.name, e?.tech, e?.desc ?? n.desc].some((t) => fold(t).includes(needle))) out.push(id);
    n.children.forEach(walk);
  };
  walk(model.root);
  return out;
}

/**
 * The boxes to open so `id` shows, outermost first (root excluded). A `more` fold is included: it is an ordinary
 * box a reader can open, and opening it is the only way its folded members appear.
 */
export function pathToReveal(model: MapModel, id: string): string[] {
  const path: string[] = [];
  for (let at = model.nodes[id]?.parent ?? null; at !== null && at !== model.root; at = model.nodes[at].parent) path.unshift(at);
  return path;
}
