// SVG path strings for map arrows; the geometry math they sit on is in application/map/geometry.
import type { Rect } from '../../../application/map/geometry';

export interface Pt { x: number; y: number }

/** Orthogonal route with rounded corners (quadratic at each bend). */
export function roundedPath(pts: readonly Pt[], radius = 8): string {
  if (pts.length < 2) return '';
  let d = `M${pts[0]!.x},${pts[0]!.y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i - 1]!;
    const c = pts[i]!;
    const n = pts[i + 1]!;
    const d1 = Math.hypot(c.x - p.x, c.y - p.y) || 1;
    const d2 = Math.hypot(n.x - c.x, n.y - c.y) || 1;
    const r = Math.min(radius, d1 / 2, d2 / 2);
    d += ` L${c.x - ((c.x - p.x) / d1) * r},${c.y - ((c.y - p.y) / d1) * r} Q${c.x},${c.y} ${c.x + ((n.x - c.x) / d2) * r},${c.y + ((n.y - c.y) / d2) * r}`;
  }
  const last = pts[pts.length - 1]!;
  return `${d} L${last.x},${last.y}`;
}

const centre = (r: Rect): Pt => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
function boundary(r: Rect, toward: Pt): Pt {
  const c = centre(r);
  const dx = toward.x - c.x;
  const dy = toward.y - c.y;
  if (!dx && !dy) return c;
  const s = Math.min(Math.abs(r.width / 2 / (dx || 1e-9)), Math.abs(r.height / 2 / (dy || 1e-9)));
  return { x: c.x + dx * s, y: c.y + dy * s };
}

/** A curved overlay from box `a` to box `b` (quadratic, bowed to one side) and the midpoint for its label. */
export function curve(a: Rect, b: Rect): { d: string; mid: Pt } {
  const s = boundary(a, centre(b));
  const e = boundary(b, centre(a));
  const len = Math.hypot(e.x - s.x, e.y - s.y) || 1;
  const off = Math.min(80, len * 0.18);
  const c = { x: (s.x + e.x) / 2 - ((e.y - s.y) / len) * off, y: (s.y + e.y) / 2 + ((e.x - s.x) / len) * off };
  return { d: `M${s.x},${s.y} Q${c.x},${c.y} ${e.x},${e.y}`, mid: { x: (s.x + 2 * c.x + e.x) / 4, y: (s.y + 2 * c.y + e.y) / 4 } };
}
