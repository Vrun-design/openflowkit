import { DEFAULT_CAMERA_LIMITS, fitCameraToBounds, normalizeCamera } from './camera';
import type { Bounds2d, Size2d } from '../geometry/types';
import type { CameraLimits, CanvasCamera } from './types';

/** Below this zoom a node label is too small to read on first view. */
export const READABLE_ZOOM = 0.65;

export type LandingDirection = 'down' | 'up' | 'right' | 'left';

/**
 * Where the camera lands on freshly drawn content: the fit when that is
 * readable, otherwise READABLE_ZOOM anchored on the diagram's start (top for
 * top-down, left for left-right, mirrored for up and left). Across the flow
 * the content is centred when it fits, else it begins at the padding.
 */
export function readableLanding(
  content: Bounds2d,
  viewport: Size2d,
  direction: LandingDirection,
  padding = 64,
  limits: CameraLimits = DEFAULT_CAMERA_LIMITS,
): { readonly camera: CanvasCamera; readonly zoomedIn: boolean } {
  const fitted = fitCameraToBounds(content, viewport, padding, limits);
  if (fitted.zoom >= READABLE_ZOOM) return { camera: fitted, zoomedIn: false };
  const zoom = READABLE_ZOOM;
  const w = content.width * zoom;
  const h = content.height * zoom;
  const along = direction === 'down' || direction === 'up';
  const x = along
    ? (w <= viewport.width - padding * 2 ? (viewport.width - w) / 2 : padding) - content.x * zoom
    : direction === 'right' ? padding - content.x * zoom : viewport.width - padding - (content.x + content.width) * zoom;
  const y = !along
    ? (h <= viewport.height - padding * 2 ? (viewport.height - h) / 2 : padding) - content.y * zoom
    : direction === 'down' ? padding - content.y * zoom : viewport.height - padding - (content.y + content.height) * zoom;
  return { camera: normalizeCamera({ x, y, zoom }, limits), zoomedIn: true };
}
