import type { ArchModel, ArchRelation } from '../model/types';
import { MAX_CHILDREN, moreLabel, placeMore } from './fold';
import { compare } from './tree';
import type { MapLink, MapModel, MapNode } from './types';

// A C4 model as a Living Map: elements are boxes (ids kept, so a selection means the same thing in Canvas mode),
// the element tree is the box tree, and every authored relation is one `call` link whose evidence is the relation.
// Arrows between boxes at any open level, and the "implied" ones, come from the engine's aggregation (view.ts),
// so nothing here derives them.
// A box with more than MAX_CHILDREN children keeps the best-connected ones (the more box takes the last slot) and the
// rest wait in `${id}#more`, split into alphabetical ranges by the engine's own placeMore: nothing is dropped.

/** Not an element id: ids are identifiers and dotted paths, which never contain `#`. */
export const ARCH_ROOT = '#model';
export const MORE_DESC = 'Fewer connections; open to list them.';

const relationText = (r: ArchRelation): string =>
  r.label && r.tech ? `${r.label} [${r.tech}]` : r.label ?? (r.tech ? `[${r.tech}]` : `${r.from} → ${r.to}`);

export function fromArch(model: ArchModel): MapModel {
  // Children keep the authored element order: it is the order the map lays them out in.
  const nodes: Record<string, MapNode> = Object.create(null);
  const root: MapNode = { id: ARCH_ROOT, kind: 'part', name: model.name ?? 'Architecture', parent: null, children: [], files: 0, loc: 0 };
  nodes[ARCH_ROOT] = root;
  const ids = new Set(model.elements.map((e) => e.id));
  const order = new Map(model.elements.map((e, i) => [e.id, i]));
  const parentOf = new Map<string, string>();
  for (const e of model.elements) {
    if (parentOf.has(e.id)) throw new Error(`map: duplicate element id ${e.id}`);
    parentOf.set(e.id, e.parent && e.parent !== e.id && ids.has(e.parent) ? e.parent : ARCH_ROOT);
  }
  // A parent chain that loops would leave its elements unreachable from the root: cut each loop at its first-authored element.
  const done = new Set<string>();
  for (const e of model.elements) {
    const path: string[] = [];
    let at = e.id;
    while (at !== ARCH_ROOT && !done.has(at) && !path.includes(at)) { path.push(at); at = parentOf.get(at)!; }
    if (path.includes(at)) {
      const loop = path.slice(path.indexOf(at));
      parentOf.set(loop.reduce((a, b) => (order.get(b)! < order.get(a)! ? b : a)), ARCH_ROOT);
    }
    path.forEach((id) => done.add(id));
  }
  for (const e of model.elements) {
    nodes[e.id] = {
      id: e.id, kind: e.kind === 'external' ? 'external' : 'part', name: e.name,
      ...(e.desc ? { desc: e.desc } : {}),
      parent: parentOf.get(e.id)!, children: [], files: 0, loc: 0,
    };
  }
  for (const e of model.elements) nodes[nodes[e.id].parent!].children.push(e.id);

  // How connected a box is: the relations that touch it or anything inside it (each counted once).
  const degree = new Map<string, number>();
  for (const r of model.relations) {
    if (!ids.has(r.from) || !ids.has(r.to)) continue;
    const touched = new Set<string>();
    for (const end of [r.from, r.to]) for (let at: string | null = end; at && at !== ARCH_ROOT; at = nodes[at].parent) touched.add(at);
    for (const id of touched) degree.set(id, (degree.get(id) ?? 0) + 1);
  }

  const fold = (id: string): void => {
    const kids = [...nodes[id].children];
    kids.forEach(fold);
    if (kids.length <= MAX_CHILDREN) return;
    const ranked = [...kids].sort((a, b) => (degree.get(b) ?? 0) - (degree.get(a) ?? 0) || compare(a, b));
    const kept = new Set(ranked.slice(0, MAX_CHILDREN - 1));
    const folded = kids.filter((k) => !kept.has(k));
    const more = `${id}#more`;
    const noun = (k: string) => model.elements[order.get(k)!].kind;
    nodes[more] = {
      id: more, kind: 'more', name: moreLabel(folded.map(noun), 0, 'element'), desc: MORE_DESC,
      parent: id, children: [], files: 0, loc: 0,
    };
    nodes[id].children = [...kids.filter((k) => kept.has(k)), more];
    placeMore(more, folded.map((k) => ({ key: k, label: nodes[k].name })), {
      item: (it, p) => { nodes[it.key].parent = p; nodes[p].children.push(it.key); },
      range: (rid, p, name) => {
        nodes[rid] = { id: rid, kind: 'group', name, parent: p, children: [], files: 0, loc: 0 };
        nodes[p].children.push(rid);
      },
    });
  };
  fold(ARCH_ROOT);

  // `files` counts the elements at the tips of the tree, so a box says how much sits inside it.
  const total = (id: string): number => {
    const n = nodes[id];
    n.files = n.children.length ? n.children.reduce((sum, c) => sum + total(c), 0) : 1;
    return n.files;
  };
  total(ARCH_ROOT);
  if (!root.children.length) root.files = 0;

  let unresolved = 0;
  const links: MapLink[] = [];
  for (const r of model.relations) {
    if (!ids.has(r.from) || !ids.has(r.to)) { unresolved++; continue; }
    links.push({
      from: r.from, to: r.to, kind: 'call', ...(r.label || r.tech ? { label: relationText(r) } : {}),
      // The relation id is the "file", so a panel can open the relation behind an arrow.
      evidence: [{ file: r.id, line: r.line ?? 0, text: relationText(r) }],
    });
  }
  links.sort((a, b) => compare(a.from, b.from) || compare(a.to, b.to) || compare(a.evidence[0].file, b.evidence[0].file));

  return { root: ARCH_ROOT, nodes, links, source: {}, stats: { files: root.files, loc: 0, imports: 0, unresolved } };
}
