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
 */
export function landing(size: { width: number; height: number }, focus: Rect | undefined, view: Viewport, anchor?: Rect): Cam {
  const all = frameBox({ x: 0, y: 0, width: size.width, height: size.height }, view);
  if (all.k >= READABLE) return all;
  if (focus) return frameBox(focus, view, 1, 0).k >= READABLE ? frameBox(focus, view, 1, READABLE) : corner(focus, view);
  return corner(anchor ?? { x: 0, y: 0 }, view);
}

/** Space kept between a box the camera brought into view and the edge of the free area. */
const KEEP_MARGIN = 24;

/**
 * The camera after a box opened or closed, when the reader is already at a readable scale: keep that scale and pan
 * only as far as the whole box needs to be inside the view (not at all when it already is). A box that does not fit
 * at `cam.k` is shown at the largest scale that does, never below READABLE; the scale never grows. Null when `cam` is
 * below READABLE or the box cannot fit at READABLE: the caller then uses `landing`. `box` and `cam` share one space;
 * the view's free area is x in [0, width], y in [top, height - bottom].
 */
export function keepInView(box: Rect, cam: Cam, view: Viewport): Cam | null {
  if (cam.k < READABLE) return null;
  const [w, h] = [view.width - KEEP_MARGIN * 2, view.height - view.top - view.bottom - KEEP_MARGIN * 2];
  const fit = Math.min(w / box.width, h / box.height);
  if (fit < READABLE) return null;
  if (fit < cam.k) return frameBox(box, { ...view, pad: KEEP_MARGIN }, fit, READABLE);
  // The box's screen extent at the kept scale, nudged by the smallest amount that puts all of it inside.
  const nudge = (at: number, size: number, lo: number, hi: number): number => (at < lo ? lo - at : at + size > hi ? hi - at - size : 0);
  const [sx, sy] = [box.x * cam.k + cam.x, box.y * cam.k + cam.y];
  return {
    k: cam.k,
    x: cam.x + nudge(sx, box.width * cam.k, KEEP_MARGIN, view.width - KEEP_MARGIN),
    y: cam.y + nudge(sy, box.height * cam.k, view.top + KEEP_MARGIN, view.height - view.bottom - KEEP_MARGIN),
  };
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
