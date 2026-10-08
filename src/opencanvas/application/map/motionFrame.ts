import type { SceneNode, ScenePage } from '../../domain/document/types';
import { isContainerNodeKind } from '../../domain/nodes/containerNodePresentation';
import type { LaidRect } from '../../../dsl/map/elk';
import { ease, lerpRect, type Rect } from './geometry';
import type { Drawn, MotionItem } from './planMotion';

// One frame of the open/close tween as plain data: every box with its interpolated rect, split by how it fades.
// Nodes are flat (no parent) with absolute positions, so a renderer needs no hierarchy to draw them.

export interface MotionFrame {
  /** Boxes grouped by how opaque they are right now, most opaque first (so a fading box draws over what it fades into). */
  readonly groups: readonly { readonly alpha: number; readonly nodes: readonly SceneNode[] }[];
  /** Each box's width at the end of the move: labels wrap to it all the way, so they are laid out once. */
  readonly textWidths: ReadonlyMap<string, number>;
}

/** Where every box of a scene sits on the page (scene positions are relative to the parent; rotation and scale are never used). */
export function absoluteRects(page: ScenePage): Map<string, LaidRect> {
  const byId = new Map(page.nodes.map((node) => [node.id, node]));
  const out = new Map<string, LaidRect>();
  const at = (node: SceneNode): LaidRect => {
    const known = out.get(node.id);
    if (known) return known;
    const parent = node.parentId === null ? undefined : byId.get(node.parentId);
    const base = parent ? at(parent) : { x: 0, y: 0 };
    const rect = {
      x: base.x + node.transform.translation.x, y: base.y + node.transform.translation.y,
      width: node.size.width, height: node.size.height, open: isContainerNodeKind(node.kind),
    };
    out.set(node.id, rect);
    return rect;
  };
  page.nodes.forEach(at);
  return out;
}

const placed = (node: SceneNode, r: Rect): SceneNode => ({
  ...node, parentId: null, transform: { ...node.transform, translation: { x: r.x, y: r.y } }, size: { width: r.width, height: r.height },
});

/**
 * The frame at time `t` (0..1, linear): rects and opacity are eased here. `cur` receives where and how opaque each box
 * was drawn, which is where a re-target starts from. Boxes with no node to draw (an element deleted mid-move) are skipped.
 */
export function frameAt(items: readonly MotionItem[], nodeOf: (id: string) => SceneNode | undefined, t: number, cur: Map<string, Drawn>, targetWidths: ReadonlyMap<string, number>): MotionFrame {
  const e = ease(t);
  const byAlpha = new Map<number, SceneNode[]>();
  for (const item of items) {
    const node = nodeOf(item.id);
    if (!node) continue;
    const rect = lerpRect(item.from, item.to, e);
    // New boxes come in a little faster than the move, so they are solid before they stop.
    const p = item.fade === 'in' ? Math.min(1, e * 1.6) : e;
    const alpha = item.a0 + ((item.fade === 'out' ? 0 : 1) - item.a0) * p;
    cur.set(item.id, { ...rect, alpha });
    // Boxes of nearly one opacity share a layer (the renderer fades a layer at a time).
    const key = Math.round(alpha * 50) / 50;
    const group = byAlpha.get(key);
    if (group) group.push(placed(node, rect)); else byAlpha.set(key, [placed(node, rect)]);
  }
  return { groups: [...byAlpha].sort((a, b) => b[0] - a[0]).map(([alpha, nodes]) => ({ alpha, nodes })), textWidths: targetWidths };
}
