import { panCamera, zoomCameraAt } from '../../domain/camera/camera';
import type { CanvasCamera } from '../../domain/camera/types';
import type { Point2d, Vector2d } from '../../domain/geometry/types';
import {
  beginCameraPan,
  moveCameraPan,
  releaseCameraPanVelocity,
  type CameraPanGesture,
} from './readOnlyCameraInteraction';

interface TouchPointer {
  readonly id: number;
  readonly point: Point2d;
}

interface SingleTouchCameraGesture {
  readonly kind: 'single';
  readonly pointer: TouchPointer;
  readonly pan: CameraPanGesture;
}

interface PinchTouchCameraGesture {
  readonly kind: 'pinch';
  readonly pointers: readonly [TouchPointer, TouchPointer];
  readonly centroid: Point2d;
  readonly distance: number;
}

export type TouchCameraGesture = SingleTouchCameraGesture | PinchTouchCameraGesture;

export interface TouchCameraMoveResult {
  readonly camera: CanvasCamera;
  readonly gesture: TouchCameraGesture;
}

export interface TouchCameraEndResult {
  readonly gesture: TouchCameraGesture | null;
  readonly releaseVelocity: Vector2d;
}

function centroid(
  first: TouchPointer,
  second: TouchPointer
): Point2d {
  return {
    x: (first.point.x + second.point.x) / 2,
    y: (first.point.y + second.point.y) / 2,
  };
}

function distance(first: TouchPointer, second: TouchPointer): number {
  return Math.max(1, Math.hypot(
    second.point.x - first.point.x,
    second.point.y - first.point.y
  ));
}

export function beginTouchCameraGesture(
  current: TouchCameraGesture | null,
  pointerId: number,
  point: Point2d,
  eventAt: number
): TouchCameraGesture {
  const pointer = { id: pointerId, point };
  if (!current) {
    return {
      kind: 'single',
      pointer,
      pan: beginCameraPan(pointerId, point, eventAt),
    };
  }
  if (current.kind === 'pinch' || current.pointer.id === pointerId) return current;
  const pointers = [current.pointer, pointer] as const;
  return {
    kind: 'pinch',
    pointers,
    centroid: centroid(...pointers),
    distance: distance(...pointers),
  };
}

export function moveTouchCameraGesture(
  camera: CanvasCamera,
  current: TouchCameraGesture,
  pointerId: number,
  point: Point2d,
  eventAt: number
): TouchCameraMoveResult {
  if (current.kind === 'single') {
    if (current.pointer.id !== pointerId) return { camera, gesture: current };
    const moved = moveCameraPan(camera, current.pan, point, false, eventAt);
    return {
      camera: moved.camera,
      gesture: {
        kind: 'single',
        pointer: { id: pointerId, point },
        pan: moved.gesture,
      },
    };
  }

  const pointerIndex = current.pointers.findIndex((pointer) => pointer.id === pointerId);
  if (pointerIndex < 0) return { camera, gesture: current };
  const pointers = [...current.pointers] as [TouchPointer, TouchPointer];
  pointers[pointerIndex] = { id: pointerId, point };
  const nextCentroid = centroid(...pointers);
  const nextDistance = distance(...pointers);
  const zoomed = zoomCameraAt(
    camera,
    current.centroid,
    camera.zoom * (nextDistance / current.distance)
  );
  return {
    camera: panCamera(zoomed, {
      x: nextCentroid.x - current.centroid.x,
      y: nextCentroid.y - current.centroid.y,
    }),
    gesture: {
      kind: 'pinch',
      pointers,
      centroid: nextCentroid,
      distance: nextDistance,
    },
  };
}

export function endTouchCameraGesture(
  current: TouchCameraGesture,
  pointerId: number,
  eventAt: number
): TouchCameraEndResult {
  if (current.kind === 'single') {
    if (current.pointer.id !== pointerId) {
      return { gesture: current, releaseVelocity: { x: 0, y: 0 } };
    }
    return {
      gesture: null,
      releaseVelocity: releaseCameraPanVelocity(current.pan, eventAt),
    };
  }

  const remaining = current.pointers.find((pointer) => pointer.id !== pointerId);
  if (!remaining || !current.pointers.some((pointer) => pointer.id === pointerId)) {
    return { gesture: current, releaseVelocity: { x: 0, y: 0 } };
  }
  return {
    gesture: {
      kind: 'single',
      pointer: remaining,
      pan: beginCameraPan(remaining.id, remaining.point, eventAt),
    },
    releaseVelocity: { x: 0, y: 0 },
  };
}
