import type { CanvasCamera } from '../../domain/camera/types';
import type { Rect } from './geometry';
import type { MotionItem } from './planMotion';

// A move draws every box it carries each frame, so what nobody can see must not be carried: a box whose whole path
// stays off screen (both cameras and the way between, plus some overscan) jumps to its end state instead of tweening.

/** Screen pixels around the viewport that still count as on screen (a box about to slide in). */
export const MOTION_OVERSCAN_PX = 240;
const SAMPLES = 4;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const meets = (a: Rect, b: Rect): boolean => a.x <= b.x + b.width && b.x <= a.x + a.width && a.y <= b.y + b.height && b.y <= a.y + a.height;
const union = (a: Rect, b: Rect): Rect => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, width: Math.max(a.x + a.width, b.x + b.width) - x, height: Math.max(a.y + a.height, b.y + b.height) - y };
};

/**
 * Everything the camera can show during the move, in page coordinates: the viewport at the start, the end and a few
 * points between (zoom and pan ease together, so the way is not a straight union), each with the overscan.
 */
export function movedView(from: CanvasCamera, to: CanvasCamera | null, size: { width: number; height: number }): Rect {
  let hull: Rect | null = null;
  for (let i = 0; i <= (to ? SAMPLES : 0); i += 1) {
    const t = i / SAMPLES;
    const cam = to ? { x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t), zoom: lerp(from.zoom, to.zoom, t) } : from;
    const pad = MOTION_OVERSCAN_PX / cam.zoom;
    const view = { x: -cam.x / cam.zoom - pad, y: -cam.y / cam.zoom - pad, width: size.width / cam.zoom + pad * 2, height: size.height / cam.zoom + pad * 2 };
    hull = hull ? union(hull, view) : view;
  }
  return hull!;
}

/** The items worth drawing each frame (their from, to or the swept rect between meets `view`), and the ones that jump to their end state. */
export function cullMotion(items: readonly MotionItem[], view: Rect): { live: MotionItem[]; jumped: MotionItem[] } {
  const live: MotionItem[] = [];
  const jumped: MotionItem[] = [];
  for (const item of items) (meets(union(item.from, item.to), view) ? live : jumped).push(item);
  return { live, jumped };
}
