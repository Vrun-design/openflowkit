import { compare, depthOf, isInside, pathTo, weightOf } from './tree';
import type { AggEdge, Depth, Evidence, LinkKind, MapLink, MapModel, Talk } from './types';

// What is on screen for a given set of open boxes, and which arrows connect it.

const BUDGET = 300; // boxes visible at once
const EVIDENCE_CAP = 80;

/** Every box on screen, parents before children, in model order. */
export function visible(model: MapModel, expanded: ReadonlySet<string>): string[] {
  const out: string[] = [];
  const walk = (id: string) => {
    for (const c of model.nodes[id].children) {
      out.push(c);
      if (expanded.has(c)) walk(c);
    }
  };
  walk(model.root);
  return out;
}

/** Where a node is drawn: itself when visible (open or not), else its nearest visible ancestor. */
export function representative(model: MapModel, expanded: ReadonlySet<string>): (id: string) => string {
  const shown = new Set(visible(model, expanded));
  const memo = new Map<string, string>();
  const rep = (id: string): string => {
    if (id === model.root || shown.has(id)) return id;
    let r = memo.get(id);
    if (r === undefined) {
      r = rep(model.nodes[id]?.parent ?? model.root);
      memo.set(id, r);
    }
    return r;
  };
  return rep;
}

/**
 * Arrows live where two parts split: a call from deep inside A to deep inside B is ONE arrow between
 * the siblings under their lowest common ancestor, however far either is open. Both directions merge.
 */
export function aggregate(
  model: MapModel, expanded: ReadonlySet<string>, layers?: readonly LinkKind[],
): { edges: AggEdge[]; rep: (id: string) => string } {
  const rep = representative(model, expanded);
  const paths = new Map<string, string[]>();
  const pathOf = (id: string) => paths.get(id) ?? paths.set(id, pathTo(model, id)).get(id)!;
  interface Acc { lo: string; hi: string; parent: string; kind: LinkKind; fwd: number; back: number; evF: Evidence[]; evB: Evidence[]; links: MapLink[] }
  const acc = new Map<string, Acc>();
  for (const link of model.links) {
    if (layers && !layers.includes(link.kind)) continue;
    const pa = pathOf(rep(link.from));
    const pb = pathOf(rep(link.to));
    let k = 0;
    while (k < pa.length && k < pb.length && pa[k] === pb[k]) k++;
    if (k === 0 || k === pa.length || k === pb.length) continue; // same box, or one holds the other
    const [x, y] = [pa[k], pb[k]];
    const forward = x < y; // lo -> hi
    const [lo, hi] = forward ? [x, y] : [y, x];
    const key = `${lo}>${hi}:${link.kind}`;
    let e = acc.get(key);
    if (!e) acc.set(key, (e = { lo, hi, parent: pa[k - 1], kind: link.kind, fwd: 0, back: 0, evF: [], evB: [], links: [] }));
    const list = forward ? e.evF : e.evB;
    for (const ev of link.evidence) if (list.length < EVIDENCE_CAP) list.push(ev);
    if (forward) e.fwd += weightOf(link);
    else e.back += weightOf(link);
    e.links.push(link);
  }
  const edges = [...acc.entries()].sort(([a], [b]) => compare(a, b)).map(([key, e]): AggEdge => {
    const loToHi = e.fwd >= e.back;
    return {
      key, kind: e.kind, parent: e.parent,
      from: loToHi ? e.lo : e.hi, to: loToHi ? e.hi : e.lo,
      count: e.fwd + e.back, forward: Math.max(e.fwd, e.back), reverse: Math.min(e.fwd, e.back),
      both: e.fwd > 0 && e.back > 0,
      evidence: loToHi ? e.evF : e.evB, reverseEvidence: loToHi ? e.evB : e.evF,
      links: e.links, inferred: e.links.every((l) => l.inferred),
    };
  });
  return { edges, rep };
}

/** The label on an arrow: "84 ⇄ 73", a plain count, or the link's own label. */
export function edgeText(e: AggEdge): string {
  if (e.kind === 'import') return e.both ? `${e.forward} ⇄ ${e.reverse}` : `${e.count}`;
  return e.count === 1 ? (e.links[0].label ?? e.kind) : `${e.count} links`;
}

const canOpen = (model: MapModel, id: string) => id !== model.root && model.nodes[id].kind !== 'more' && model.nodes[id].children.length > 0;

/** Open every container down to `depth` (root's children are depth 1). `more` boxes stay shut. */
function openTo(model: MapModel, depth: number): Set<string> {
  const open = new Set<string>();
  for (const id of Object.keys(model.nodes).sort(compare)) if (canOpen(model, id) && depthOf(model, id) <= depth) open.add(id);
  return open;
}

/**
 * Overview shows the top-level boxes shut, with the arrows between them (a repo of three or fewer opens them, so a
 * one-part repo does not land on two boxes). Detailed opens the top level, Everything goes as deep as 300 boxes allow.
 */
export function presets(model: MapModel): Record<Depth, Set<string>> {
  const deepest = Math.max(1, ...Object.keys(model.nodes).map((id) => depthOf(model, id)));
  // Fall back to a fully shut map when even the top level opens past the budget.
  let fit = 0;
  for (let d = 1; d <= deepest; d++) {
    if (visible(model, openTo(model, d)).length > BUDGET) break;
    fit = d;
  }
  const top = openTo(model, Math.min(1, fit));
  return { overview: model.nodes[model.root].children.length <= 3 ? top : new Set(), detailed: top, everything: openTo(model, fit) };
}

/** Where one box's links go, grouped by the box they land in right now ("Talks to" + highlight curves). */
export function linksOf(model: MapModel, id: string, expanded: ReadonlySet<string>): Talk[] {
  const rep = representative(model, expanded);
  const talks = new Map<string, Talk>();
  for (const link of model.links) {
    const fromIn = isInside(model, link.from, id);
    if (fromIn === isInside(model, link.to, id)) continue;
    const other = rep(fromIn ? link.to : link.from);
    if (isInside(model, other, id) || isInside(model, id, other)) continue;
    const t = talks.get(other) ?? talks.set(other, { id: other, out: 0, in: 0, links: [] }).get(other)!;
    if (fromIn) t.out += weightOf(link);
    else t.in += weightOf(link);
    t.links.push(link);
  }
  return [...talks.values()].sort((a, b) => b.out + b.in - (a.out + a.in) || compare(a.id, b.id));
}

/** Name or path contains `q`; names that start with it first, then shallower, then by id. */
export function search(model: MapModel, q: string, limit = 8): string[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const rank = (id: string) => (model.nodes[id].name.toLowerCase().startsWith(needle) ? 0 : 1);
  return Object.keys(model.nodes)
    .filter((id) => id !== model.root && (model.nodes[id].name.toLowerCase().includes(needle) || (model.nodes[id].path ?? '').toLowerCase().includes(needle)))
    .sort((a, b) => rank(a) - rank(b) || depthOf(model, a) - depthOf(model, b) || compare(a, b))
    .slice(0, limit);
}
