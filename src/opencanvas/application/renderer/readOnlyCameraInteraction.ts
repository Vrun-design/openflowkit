import { panCamera, zoomCameraAt } from '../../domain/camera/camera';
import type { CanvasCamera } from '../../domain/camera/types';
import type { Point2d, Vector2d } from '../../domain/geometry/types';

const RELEASE_VELOCITY_WINDOW_MS = 160;

export interface CameraPanGesture {
  readonly pointerId: number;
  readonly start: Point2d;
  readonly last: Point2d;
  readonly moved: boolean;
  readonly axisLock: 'x' | 'y' | null;
  readonly startEventAt: number;
  readonly lastEventAt: number;
  readonly velocity: Vector2d;
}

export function beginCameraPan(
  pointerId: number,
  point: Point2d,
  eventAt = 0
): CameraPanGesture {
  return {
    pointerId,
    start: point,
    last: point,
    moved: false,
    axisLock: null,
    startEventAt: eventAt,
    lastEventAt: eventAt,
    velocity: { x: 0, y: 0 },
  };
}

export function moveCameraPan(
  camera: CanvasCamera,
  gesture: CameraPanGesture,
  point: Point2d,
  lockAxis = false,
  eventAt = gesture.lastEventAt
): { camera: CanvasCamera; gesture: CameraPanGesture } {
  const moved = gesture.moved || Math.hypot(point.x - gesture.start.x, point.y - gesture.start.y) >= 4;
  const totalDelta = { x: point.x - gesture.start.x, y: point.y - gesture.start.y };
  const axisLock = lockAxis
    ? gesture.axisLock ?? (Math.abs(totalDelta.x) >= Math.abs(totalDelta.y) ? 'x' : 'y')
    : null;
  const incrementalDelta = gesture.moved
    ? { x: point.x - gesture.last.x, y: point.y - gesture.last.y }
    : totalDelta;
  const panDelta = {
    x: axisLock === 'y' ? 0 : incrementalDelta.x,
    y: axisLock === 'x' ? 0 : incrementalDelta.y,
  };
  const elapsed = eventAt - (gesture.moved ? gesture.lastEventAt : gesture.startEventAt);
  const instantaneousVelocity = moved && elapsed > 0
    ? { x: panDelta.x / elapsed, y: panDelta.y / elapsed }
    : null;
  const velocity = instantaneousVelocity && gesture.moved
    ? {
        x: gesture.velocity.x * 0.65 + instantaneousVelocity.x * 0.35,
        y: gesture.velocity.y * 0.65 + instantaneousVelocity.y * 0.35,
      }
    : instantaneousVelocity ?? gesture.velocity;
  return {
    camera: moved ? panCamera(camera, panDelta) : camera,
    gesture: { ...gesture, last: point, moved, axisLock, lastEventAt: eventAt, velocity },
  };
}

export function releaseCameraPanVelocity(
  gesture: CameraPanGesture,
  eventAt: number
): Vector2d {
  if (!gesture.moved) return { x: 0, y: 0 };
  const idleMs = Math.max(0, eventAt - gesture.lastEventAt);
  const releaseFactor = Math.max(0, 1 - idleMs / RELEASE_VELOCITY_WINDOW_MS);
  return {
    x: gesture.velocity.x * releaseFactor,
    y: gesture.velocity.y * releaseFactor,
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
