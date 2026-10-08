import { isInside, pathTo, weightOf } from '../../../dsl/map/tree';
import type { LinkKind, MapModel, Talk } from '../../../dsl/map/types';
import { visible } from '../../../dsl/map/view';
import type { Rect } from './geometry';

// Pure helpers for moving around the map: which box is next, what opens to reveal one, what to dim.

export type Selected = { type: 'node'; id: string } | { type: 'edge'; key: string };
export type Dir = 'left' | 'right' | 'up' | 'down';

export const canOpen = (model: MapModel, id: string): boolean => !!model.nodes[id]?.children.length;

/** The sibling nearest in `dir` by layout position (distance along the axis, cross-axis offset counts double). */
export function pickNeighbour(rects: ReadonlyMap<string, Rect>, siblings: readonly string[], from: string, dir: Dir): string | null {
  const a = rects.get(from);
  if (!a) return null;
  const [ax, ay] = [a.x + a.width / 2, a.y + a.height / 2];
  let best: string | null = null;
  let bestScore = Infinity;
  for (const id of siblings) {
    const r = rects.get(id);
    if (!r || id === from) continue;
    const dx = r.x + r.width / 2 - ax;
    const dy = r.y + r.height / 2 - ay;
    const [along, across] = dir === 'left' ? [-dx, dy] : dir === 'right' ? [dx, dy] : dir === 'up' ? [-dy, dx] : [dy, dx];
    if (along <= 0) continue;
    const score = along + 2 * Math.abs(across);
    if (score < bestScore || (score === bestScore && id < (best ?? id))) { best = id; bestScore = score; }
  }
  return best;
}

/** Open boxes plus every container above `id`, so `id` is on screen. */
export function revealExpanded(model: MapModel, expanded: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(expanded);
  for (const at of pathTo(model, id).slice(1, -1)) if (canOpen(model, at)) next.add(at);
  return next;
}

/** Everything on screen that can open, opened: one level deeper. `more` boxes stay shut. */
export function oneLevel(model: MapModel, expanded: ReadonlySet<string>): Set<string> {
  const next = new Set(expanded);
  for (const id of visible(model, expanded)) if (canOpen(model, id) && model.nodes[id].kind !== 'more') next.add(id);
  return next;
}

/** How many lines each link kind stands for, only for kinds the model has. */
export function layerCounts(model: MapModel): Partial<Record<LinkKind, number>> {
  const out: Partial<Record<LinkKind, number>> = {};
  for (const l of model.links) out[l.kind] = (out[l.kind] ?? 0) + weightOf(l);
  return out;
}

/**
 * A short label per id: its name, or `parent/name` when another listed box shares the name (and the full id when even
 * that collides), so two `common/` folders can be told apart.
 */
export function labelsFor(model: MapModel, ids: readonly string[]): Map<string, string> {
  const plain = (id: string) => (model.nodes[id]?.name ?? id).replace(/\/$/, '');
  const count = (key: (id: string) => string) => { const m = new Map<string, number>(); for (const id of ids) m.set(key(id), (m.get(key(id)) ?? 0) + 1); return m; };
  const names = count(plain);
  const withParent = (id: string) => { const p = model.nodes[id]?.parent; return p && p !== model.root ? `${plain(p)}/${plain(id)}` : plain(id); };
  const paired = count(withParent);
  return new Map(ids.map((id) => [id, (names.get(plain(id)) ?? 0) < 2 ? (model.nodes[id]?.name ?? id) : (paired.get(withParent(id)) ?? 0) < 2 ? withParent(id) : id]));
}

/** The selected box, what holds it, what it holds, and the boxes it talks to: everything else may be dimmed. */
export function neighbours(model: MapModel, shown: readonly string[], selected: string, talks: readonly Talk[]): Set<string> {
  const talking = new Set(talks.map((t) => t.id));
  return new Set(shown.filter((id) => talking.has(id) || isInside(model, id, selected) || isInside(model, selected, id)));
}
