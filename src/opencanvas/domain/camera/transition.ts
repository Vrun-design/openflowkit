import type { CanvasCamera } from './types';

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function easeOutCubic(progress: number): number {
  const normalized = clampUnit(progress);
  return 1 - (1 - normalized) ** 3;
}

export function interpolateCamera(
  from: CanvasCamera,
  to: CanvasCamera,
  progress: number
): CanvasCamera {
  const amount = easeOutCubic(progress);
  const zoomRatio = to.zoom / from.zoom;
  return {
    x: from.x + (to.x - from.x) * amount,
    y: from.y + (to.y - from.y) * amount,
    zoom: from.zoom * zoomRatio ** amount,
  };
}

export function cameraEquals(left: CanvasCamera, right: CanvasCamera): boolean {
  return left.x === right.x && left.y === right.y && left.zoom === right.zoom;
}
