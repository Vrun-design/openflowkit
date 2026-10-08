import type { LaidRect } from '../../../../dsl/map/elk';
import type { MapModel } from '../../../../dsl/map/types';
import type { Rect } from './geometry';
import type { MotionItem } from './motion';

export interface Leaving { id: string; rect: LaidRect; open: boolean }

const nearest = (m: MapModel, id: string, rects: ReadonlyMap<string, Rect>): Rect | undefined => {
  for (let at: string | null = id; at; at = m.nodes[at]?.parent ?? null) { const r = rects.get(at); if (r) return r; }
  return undefined;
};

/**
 * What moves where: boxes new to the screen grow from their nearest drawn ancestor, boxes that vanish fold into their
 * nearest surviving one. `cur` is where everything is drawn now; `gone` ids have no place to fold into and are forgotten.
 */
export function planMotion(m: MapModel, ids: readonly string[], rects: ReadonlyMap<string, LaidRect>, prevRects: ReadonlyMap<string, LaidRect> | undefined, cur: ReadonlyMap<string, Rect>): { items: MotionItem[]; leaving: Leaving[]; gone: string[] } {
  const items: MotionItem[] = [];
  const leaving: Leaving[] = [];
  const gone: string[] = [];
  for (const id of ids) {
    const to = rects.get(id);
    if (to) items.push({ id, from: cur.get(id) ?? nearest(m, id, cur) ?? to, to, fade: cur.has(id) ? null : 'in' });
  }
  for (const [id, from] of cur) {
    if (rects.has(id)) continue;
    const to = m.nodes[id] ? nearest(m, id, rects) : undefined;
    if (!to) { gone.push(id); continue; }
    const open = prevRects?.get(id)?.open ?? false;
    items.push({ id, from, to, fade: 'out' });
    leaving.push({ id, rect: { ...from, open }, open });
  }
  return { items, leaving, gone };
}
