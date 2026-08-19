import { panCamera, zoomCameraAt } from '../../domain/camera/camera';
import type { CanvasCamera } from '../../domain/camera/types';
import type { Point2d } from '../../domain/geometry/types';

export interface CameraPanGesture {
  readonly pointerId: number;
  readonly start: Point2d;
  readonly last: Point2d;
  readonly moved: boolean;
}

export function beginCameraPan(pointerId: number, point: Point2d): CameraPanGesture {
  return { pointerId, start: point, last: point, moved: false };
}

export function moveCameraPan(
  camera: CanvasCamera,
  gesture: CameraPanGesture,
  point: Point2d
): { camera: CanvasCamera; gesture: CameraPanGesture } {
  const moved = gesture.moved || Math.hypot(point.x - gesture.start.x, point.y - gesture.start.y) >= 4;
  return {
    camera: moved
      ? panCamera(camera, { x: point.x - gesture.last.x, y: point.y - gesture.last.y })
      : camera,
    gesture: { ...gesture, last: point, moved },
  };
}

export function zoomReadOnlyCamera(
  camera: CanvasCamera,
  anchor: Point2d,
  wheelDeltaY: number
): CanvasCamera {
  const scale = Math.exp(-wheelDeltaY * 0.0015);
  return zoomCameraAt(camera, anchor, camera.zoom * scale);
}
