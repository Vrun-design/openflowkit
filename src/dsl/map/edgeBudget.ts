import { compare } from './tree';
import type { AggEdge, MapModel } from './types';

// Too many arrows is no map. Per container: the arrows that carry the structure first (the transitive reduction of its
// siblings' graph: A -> C is implied when A -> B -> C exists), strongest first, then the rest by count, up to a budget.
// The rest are marked `minor`, not removed: a surface may hide them, and a selected box still lists its exact links.

const FLOOR = 6;
const PER_SIBLING = 1.5;

export const edgeCap = (siblings: number): number => Math.max(FLOOR, Math.ceil(PER_SIBLING * siblings));

/** Is there a path `from` -> `to` that does not use `skip`? */
function reaches(out: ReadonlyMap<string, readonly AggEdge[]>, from: string, to: string, skip: AggEdge): boolean {
  const seen = new Set([from]);
  const stack = [from];
  while (stack.length) {
    for (const e of out.get(stack.pop()!) ?? []) {
      if (e === skip || seen.has(e.to)) continue;
      if (e.to === to) return true;
      seen.add(e.to);
      stack.push(e.to);
    }
  }
  return false;
}

/** The same edges, in the same order, with `minor: true` on those over their container's budget. Deterministic. */
export function budgetEdges(model: MapModel, edges: readonly AggEdge[]): AggEdge[] {
  const byParent = new Map<string, AggEdge[]>();
  for (const e of edges) byParent.set(e.parent, [...(byParent.get(e.parent) ?? []), e]);
  const minor = new Set<AggEdge>();
  for (const [parent, group] of byParent) {
    const cap = edgeCap(model.nodes[parent]?.children.length ?? group.length);
    if (group.length <= cap) continue;
    const out = new Map<string, AggEdge[]>();
    for (const e of group) out.set(e.from, [...(out.get(e.from) ?? []), e]);
    const strongest = (a: AggEdge, b: AggEdge) => b.count - a.count || compare(a.key, b.key);
    const core = group.filter((e) => !reaches(out, e.from, e.to, e)).sort(strongest);
    const rest = group.filter((e) => !core.includes(e)).sort(strongest);
    for (const e of [...core, ...rest].slice(cap)) minor.add(e);
  }
  return edges.map((e) => (minor.has(e) ? { ...e, minor: true } : e));
}
