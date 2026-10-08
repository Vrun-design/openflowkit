import { READABLE_ZOOM } from '../../domain/camera/readableLanding';

// Pure geometry for the map: easing, camera framing, zoom. (SVG path strings stay in presentation.)

export interface Rect { x: number; y: number; width: number; height: number }
export interface Cam { x: number; y: number; k: number }

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

/**
 * The scale a Map camera never lands below. The editor drops to its compact detail (icon strip, no labels) under
 * READABLE_ZOOM, so landing exactly there would flip on rounding: keep a margin above it (a test pins both).
 */
export const READABLE = Math.max(0.7, READABLE_ZOOM + 0.05);

/**
 * Where the camera lands, always at k >= READABLE: everything when it fits at that scale; else the box that was just
 * opened or closed, fitted when it fits, else its top-left corner (header and first row) at READABLE; with no such box,
 * `anchor` (the map's top-left corner) at READABLE. The reader can still zoom out by hand.
 * `context` (the closed box's parent) is preferred over `focus` when it fits.
 */
export function landing(size: { width: number; height: number }, focus: Rect | undefined, view: Viewport, anchor?: Rect, context?: Rect): Cam {
  const all = frameBox({ x: 0, y: 0, width: size.width, height: size.height }, view);
  if (all.k >= READABLE) return all;
  const fits = (box: Rect): boolean => frameBox(box, view, 1, 0).k >= READABLE;
  if (context && fits(context)) return frameBox(context, view, 1, READABLE);
  if (focus) return fits(focus) ? frameBox(focus, view, 1, READABLE) : corner(focus, view);
  return corner(anchor ?? { x: 0, y: 0 }, view);
}

/** `at` at the top-left of the free view, at READABLE: a box too big to fit shows its header and first row. */
const corner = (at: { x: number; y: number }, view: Viewport): Cam =>
  ({ k: READABLE, x: view.pad - at.x * READABLE, y: view.top + view.pad - at.y * READABLE });

/** The top-left corner of everything drawn (a zero-size anchor): where a reader who cannot see it all starts reading. */
export function topLeftOpen(rects: ReadonlyMap<string, Rect>): Rect | undefined {
  if (rects.size === 0) return undefined;
  let [x, y] = [Infinity, Infinity];
  for (const r of rects.values()) { x = Math.min(x, r.x); y = Math.min(y, r.y); }
  return { x, y, width: 0, height: 0 };
}

export const zoomAt = (cam: Cam, factor: number, px: number, py: number): Cam => {
  const k = Math.max(0.1, Math.min(2.5, cam.k * factor));
  return { k, x: px - (px - cam.x) * (k / cam.k), y: py - (py - cam.y) * (k / cam.k) };
};
