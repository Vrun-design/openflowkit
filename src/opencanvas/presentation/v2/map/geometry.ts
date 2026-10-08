// Pure geometry for the map surface: easing, camera framing, arrow paths.

export interface Rect { x: number; y: number; width: number; height: number }
export interface Cam { x: number; y: number; k: number }
export interface Pt { x: number; y: number }

/** CSS cubic-bezier(x1,y1,x2,y2) as a function of time 0..1. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const at = (a: number, b: number, s: number) => 3 * a * (1 - s) ** 2 * s + 3 * b * (1 - s) * s * s + s ** 3;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (at(x1, x2, mid) < x) lo = mid;
      else hi = mid;
    }
    return at(y1, y2, (lo + hi) / 2);
  };
}
export const ease = cubicBezier(0.2, 0.8, 0.2, 1);
export const MOVE_MS = 480;
export const FADE_MS = 160;

export const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({
  x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, width: a.width + (b.width - a.width) * t, height: a.height + (b.height - a.height) * t,
});

export interface Viewport { width: number; height: number; top: number; bottom: number; pad: number }

/** Camera that centres `box` in the viewport at the largest scale that fits, clamped to [minK, maxK]. */
export function frameBox(box: Rect, view: Viewport, maxK = 1.15, minK = 0.2): Cam {
  const h = view.height - view.top - view.bottom;
  const k = Math.max(minK, Math.min((view.width - view.pad * 2) / box.width, (h - view.pad) / box.height, maxK));
  return { k, x: view.width / 2 - (box.x + box.width / 2) * k, y: view.top + h / 2 - (box.y + box.height / 2) * k };
}

/** Fit everything when that stays readable (k >= 0.6); else frame the box that was just opened at k >= 0.6. */
export function landing(size: { width: number; height: number }, focus: Rect | undefined, view: Viewport): Cam {
  const all = frameBox({ x: 0, y: 0, ...size }, view);
  return all.k >= 0.6 || !focus ? all : frameBox(focus, view, 1, 0.6);
}

export const zoomAt = (cam: Cam, factor: number, px: number, py: number): Cam => {
  const k = Math.max(0.1, Math.min(2.5, cam.k * factor));
  return { k, x: px - (px - cam.x) * (k / cam.k), y: py - (py - cam.y) * (k / cam.k) };
};

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
