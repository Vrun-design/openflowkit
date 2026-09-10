import type { CanvasCamera } from '../camera/types';
import type { Bounds2d, Point2d } from '../geometry/types';

export type ConnectSide = 'top' | 'right' | 'bottom' | 'left';

/** Screen-pixel gap between the transform frame and a connect handle. */
const CONNECT_OFFSET_PIXELS = 22;
const CONNECT_PICK_RADIUS_PIXELS = 9;

export interface ConnectHandlePoint {
  readonly side: ConnectSide;
  readonly point: Point2d;
}

/** Side midpoint of the bounds, on its edge. */
export function sideAnchor(bounds: Bounds2d, side: ConnectSide): Point2d {
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  switch (side) {
    case 'top': return { x: centerX, y: bounds.y };
    case 'right': return { x: bounds.x + bounds.width, y: centerY };
    case 'bottom': return { x: centerX, y: bounds.y + bounds.height };
    case 'left': return { x: bounds.x, y: centerY };
  }
}

export function connectHandlePoints(bounds: Bounds2d, zoom: number): readonly ConnectHandlePoint[] {
  const offset = CONNECT_OFFSET_PIXELS / zoom;
  return (['top', 'right', 'bottom', 'left'] as const).map((side) => {
    const anchor = sideAnchor(bounds, side);
    const point = side === 'top' ? { x: anchor.x, y: anchor.y - offset }
      : side === 'right' ? { x: anchor.x + offset, y: anchor.y }
        : side === 'bottom' ? { x: anchor.x, y: anchor.y + offset }
          : { x: anchor.x - offset, y: anchor.y };
    return { side, point };
  });
}

export function pickConnectHandle(
  bounds: Bounds2d,
  screenPoint: Point2d,
  camera: CanvasCamera
): ConnectSide | null {
  const world = {
    x: (screenPoint.x - camera.x) / camera.zoom,
    y: (screenPoint.y - camera.y) / camera.zoom,
  };
  const radius = CONNECT_PICK_RADIUS_PIXELS / camera.zoom;
  return connectHandlePoints(bounds, camera.zoom)
    .find(({ point }) => Math.hypot(point.x - world.x, point.y - world.y) <= radius)?.side ?? null;
}

/** The side of `bounds` a point is closest to, for choosing a target port. */
export function nearestSide(bounds: Bounds2d, point: Point2d): ConnectSide {
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  // Normalise by half-extents so a wide node still prefers left/right.
  const dx = (point.x - centerX) / Math.max(1, bounds.width / 2);
  const dy = (point.y - centerY) / Math.max(1, bounds.height / 2);
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'bottom' : 'top';
}
