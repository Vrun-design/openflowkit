import type { AggEdge, Depth, LinkKind, MapModel } from '../../../dsl/map/types';
import { presets } from '../../../dsl/map/view';
import type { Rect } from './geometry';
import { pickNeighbour, type Dir } from './navigate';

/** Boxes drawn at once in Map mode. */
export const MAP_BOX_BUDGET = 420;

/** The same boxes open (a no-op change must not relayout the map). */
export const sameOpen = (a: ReadonlySet<string>, b: ReadonlySet<string>): boolean => a.size === b.size && [...a].every((id) => b.has(id));

/**
 * The editor's depth dial. Top level is every box shut, even where the engine's overview opens a small map's top
 * level (that would make it the same as One level in); the other two are the engine's.
 */
function dial(model: MapModel): Record<Depth, ReadonlySet<string>> {
  const all = presets(model);
  return { overview: new Set(), detailed: all.detailed, everything: all.everything };
}

/** The open set of a depth preset, as a copy. */
export const presetOpen = (model: MapModel, depth: Depth): Set<string> => new Set(dial(model)[depth]);

/** The preset whose open set equals `open`, or null for a custom state. Top level wins a tie (a map too big to open any level). */
export function depthOf(model: MapModel, open: ReadonlySet<string>): Depth | null {
  const all = dial(model);
  return (['overview', 'detailed', 'everything'] as const).find((d) => sameOpen(all[d], open)) ?? null;
}

/** Top-left first, ties by id so the pick is deterministic. */
export const topLeftFirst = (rects: ReadonlyMap<string, { x: number; y: number }>) => (a: string, b: string): number => {
  const [p, q] = [rects.get(a)!, rects.get(b)!];
  return p.y - q.y || p.x - q.x || (a < b ? -1 : 1);
};

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
    const first = node.children.filter((c) => rects.has(c)).sort(topLeftFirst(rects))[0];
    if (first) return first;
  }
  const siblings = (node.parent ? model.nodes[node.parent]?.children ?? [] : []).filter((id) => rects.has(id));
  const next = pickNeighbour(rects, siblings, fromId, dir);
  if (next) return next;
  return dir === 'up' && node.parent && node.parent !== model.root && rects.has(node.parent) ? node.parent : null;
}

/** Lines each link kind stands for across the arrows on screen. */
export function edgeLayerCounts(edges: readonly AggEdge[]): Partial<Record<LinkKind, number>> {
  const out: Partial<Record<LinkKind, number>> = {};
  for (const e of edges) out[e.kind] = (out[e.kind] ?? 0) + e.count;
  return out;
}
