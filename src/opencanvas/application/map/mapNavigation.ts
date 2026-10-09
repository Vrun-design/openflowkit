import type { AggEdge, Depth, LinkKind, MapModel } from '../../../dsl/map/types';
import { presets, visible } from '../../../dsl/map/view';
import type { Rect } from './geometry';
import { canOpen, oneLevel, pickNeighbour, type Dir } from './navigate';

// Map mode's depth, expand/collapse and arrow-key rules, pure. Sibling picking and "one level" come from navigate.ts.

/** Boxes drawn at once in Map mode (the SVG map's 300 x 1.4). */
export const MAP_BOX_BUDGET = 420;

/** Every shut box on screen that can open, opened. The same set back when nothing opens or the result would pass the budget. */
export function expandOneLevel(model: MapModel, open: ReadonlySet<string>): ReadonlySet<string> {
  const next = oneLevel(model, open);
  return next.size === open.size || visible(model, next).length > MAP_BOX_BUDGET ? open : next;
}

/** Whether one more level has a box to open (false: everything on screen is open or a leaf). Past the budget it is still true. */
export const canExpandOne = (model: MapModel, open: ReadonlySet<string>): boolean => oneLevel(model, open).size > open.size;

/** The same boxes open: a click that would change nothing must not relayout the map. */
export const sameOpen = (a: ReadonlySet<string>, b: ReadonlySet<string>): boolean => a.size === b.size && [...a].every((id) => b.has(id));

/** Nothing open: the root's children shut (the engine's own minimal state). */
export const collapseAll = (): Set<string> => new Set();

/** The engine's open set for a depth preset (a copy, safe to keep). */
export const presetOpen = (model: MapModel, depth: Depth): Set<string> => new Set(presets(model)[depth]);

/** The preset whose open set equals `open`, or null for a custom state. Overview wins a tie with Detailed. */
export function depthOf(model: MapModel, open: ReadonlySet<string>): Depth | null {
  const all = presets(model);
  return (['overview', 'detailed', 'everything'] as const).find((d) => all[d].size === open.size && [...open].every((id) => all[d].has(id))) ?? null;
}

/**
 * Where an arrow key lands from `fromId`. `rects` are the laid-out boxes on screen (only those are reachable).
 * - left / right: the nearest sibling (same parent) in that direction, by navigate.pickNeighbour; null at an edge.
 * - up: the nearest sibling above; none above -> the parent (out of an open box), unless the parent is the root.
 * - down: an open box with children is entered first (its top-left child); otherwise the nearest sibling below.
 * Ties break by id, so the result is deterministic. Null means stay put.
 */
export function siblingMove(
  model: MapModel,
  open: ReadonlySet<string>,
  fromId: string,
  dir: Dir,
  rects: ReadonlyMap<string, Rect>,
): string | null {
  const node = model.nodes[fromId];
  if (!node || !rects.has(fromId)) return null;
  if (dir === 'down' && open.has(fromId)) {
    const first = node.children.filter((c) => rects.has(c)).sort((a, b) => {
      const [p, q] = [rects.get(a)!, rects.get(b)!];
      return p.y - q.y || p.x - q.x || (a < b ? -1 : 1);
    })[0];
    if (first) return first;
  }
  const siblings = (node.parent ? model.nodes[node.parent]?.children ?? [] : []).filter((id) => rects.has(id));
  const next = pickNeighbour(rects, siblings, fromId, dir);
  if (next) return next;
  return dir === 'up' && node.parent && node.parent !== model.root && rects.has(node.parent) ? node.parent : null;
}

/** Lines each link kind stands for across the arrows on screen; only kinds present. */
export function edgeLayerCounts(edges: readonly AggEdge[]): Partial<Record<LinkKind, number>> {
  const out: Partial<Record<LinkKind, number>> = {};
  for (const e of edges) out[e.kind] = (out[e.kind] ?? 0) + e.count;
  return out;
}

export { canOpen };
