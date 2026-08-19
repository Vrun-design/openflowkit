import { createBounds2d } from '../geometry/bounds';
import { requireFiniteNumber } from '../geometry/finite';
import type { Bounds2d, Point2d, Size2d, Vector2d } from '../geometry/types';
import type { CameraLimits, CanvasCamera } from './types';

export const DEFAULT_CAMERA_LIMITS: CameraLimits = { minZoom: 0.1, maxZoom: 4 };
export const DEFAULT_CANVAS_CAMERA: CanvasCamera = { x: 64, y: 64, zoom: 1 };

function clampZoom(zoom: number, limits: CameraLimits): number {
  return Math.min(limits.maxZoom, Math.max(limits.minZoom, zoom));
}

export function normalizeCamera(
  camera: CanvasCamera,
  limits: CameraLimits = DEFAULT_CAMERA_LIMITS
): CanvasCamera {
  const minZoom = requireFiniteNumber(limits.minZoom, 'camera.minZoom');
  const maxZoom = requireFiniteNumber(limits.maxZoom, 'camera.maxZoom');
  if (minZoom <= 0 || maxZoom < minZoom) throw new RangeError('Camera zoom limits are invalid.');
  return {
    x: requireFiniteNumber(camera.x, 'camera.x'),
    y: requireFiniteNumber(camera.y, 'camera.y'),
    zoom: clampZoom(requireFiniteNumber(camera.zoom, 'camera.zoom'), { minZoom, maxZoom }),
  };
}

export function worldToScreen(camera: CanvasCamera, point: Point2d): Point2d {
  const normalized = normalizeCamera(camera);
  return {
    x: point.x * normalized.zoom + normalized.x,
    y: point.y * normalized.zoom + normalized.y,
  };
}

export function screenToWorld(camera: CanvasCamera, point: Point2d): Point2d {
  const normalized = normalizeCamera(camera);
  return {
    x: (point.x - normalized.x) / normalized.zoom,
    y: (point.y - normalized.y) / normalized.zoom,
  };
}

export function panCamera(camera: CanvasCamera, delta: Vector2d): CanvasCamera {
  return normalizeCamera({ x: camera.x + delta.x, y: camera.y + delta.y, zoom: camera.zoom });
}

export function zoomCameraAt(
  camera: CanvasCamera,
  screenAnchor: Point2d,
  nextZoom: number,
  limits: CameraLimits = DEFAULT_CAMERA_LIMITS
): CanvasCamera {
  const worldAnchor = screenToWorld(camera, screenAnchor);
  const zoom = clampZoom(requireFiniteNumber(nextZoom, 'camera.nextZoom'), limits);
  return normalizeCamera(
    {
      x: screenAnchor.x - worldAnchor.x * zoom,
      y: screenAnchor.y - worldAnchor.y * zoom,
      zoom,
    },
    limits
  );
}

export function fitCameraToBounds(
  content: Bounds2d,
  viewport: Size2d,
  padding = 48,
  limits: CameraLimits = DEFAULT_CAMERA_LIMITS
): CanvasCamera {
  const usableWidth = Math.max(1, viewport.width - padding * 2);
  const usableHeight = Math.max(1, viewport.height - padding * 2);
  const contentWidth = Math.max(1, content.width);
  const contentHeight = Math.max(1, content.height);
  const zoom = clampZoom(
    Math.min(usableWidth / contentWidth, usableHeight / contentHeight),
    limits
  );
  return normalizeCamera(
    {
      x: (viewport.width - content.width * zoom) / 2 - content.x * zoom,
      y: (viewport.height - content.height * zoom) / 2 - content.y * zoom,
      zoom,
    },
    limits
  );
}

export function visibleWorldBounds(camera: CanvasCamera, viewport: Size2d): Bounds2d {
  const topLeft = screenToWorld(camera, { x: 0, y: 0 });
  const bottomRight = screenToWorld(camera, { x: viewport.width, y: viewport.height });
  return createBounds2d(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
}
