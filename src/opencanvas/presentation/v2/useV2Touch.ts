// Touch has no dblclick, no right-click and no wheel worth relying on (iOS
// fires none of them on a touch-action: none surface), so the canvas
// synthesises all three from taps: two fingers pinch and pan, a quick second
// tap is a double-tap, a still press is a context menu. Mouse and pen never
// enter here.
import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { pinchCamera, type PinchPoints } from '../../domain/camera/camera';
import type { CanvasCamera } from '../../domain/camera/types';
import type { Point2d } from '../../domain/geometry/types';

export const DOUBLE_TAP_MS = 300;
export const DOUBLE_TAP_PX = 24;
export const LONG_PRESS_MS = 500;
// Matches the pointer hook's click threshold: a finger that slid this far is a drag.
const TAP_SLOP_PX = 4;

export interface Tap {
  readonly at: Point2d;
  readonly time: number;
}

export function isDoubleTap(previous: Tap | null, next: Tap): boolean {
  return previous !== null
    && next.time - previous.time <= DOUBLE_TAP_MS
    && Math.hypot(next.at.x - previous.at.x, next.at.y - previous.at.y) <= DOUBLE_TAP_PX;
}

interface TouchCameraOptions {
  readonly cameraRef: RefObject<CanvasCamera>;
  readonly updateCamera: (camera: CanvasCamera) => void;
}

interface Pinch {
  readonly camera: CanvasCamera;
  readonly points: PinchPoints;
}

function isTap({ start, at }: { readonly start: Point2d; readonly at: Point2d }): boolean {
  return Math.hypot(at.x - start.x, at.y - start.y) < TAP_SLOP_PX;
}

function localPoint(event: ReactPointerEvent<HTMLElement>): Point2d {
  const bounds = event.currentTarget.getBoundingClientRect();
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
}

export function useV2Touch(
  optionsRef: RefObject<TouchCameraOptions>,
  /** Drops the one-finger drag in flight when a second finger lands or a press turns into a menu. */
  abandonOperation: () => boolean
) {
  // Each finger down, in landing order (the first two are the pinch).
  const fingersRef = useRef(new Map<number, { readonly start: Point2d; at: Point2d }>());
  const pinchRef = useRef<Pinch | null>(null);
  const lastTapRef = useRef<Tap | null>(null);
  // The pending long-press; `fired` blocks the tap that would follow it.
  const pressRef = useRef<number | null>(null);
  const pressFiredRef = useRef(false);

  const clearPress = useCallback(() => {
    if (pressRef.current !== null) window.clearTimeout(pressRef.current);
    pressRef.current = null;
  }, []);
  useEffect(() => clearPress, [clearPress]);

  const pinchPoints = (): PinchPoints | null => {
    const [a, b] = fingersRef.current.values();
    return a && b ? { a: a.at, b: b.at } : null;
  };

  /** Returns false when the finger is not for the pointer hook (a pinch owns it). */
  const beginTouch = useCallback((event: ReactPointerEvent<HTMLElement>): boolean => {
    const at = localPoint(event);
    fingersRef.current.set(event.pointerId, { start: at, at });
    clearPress();
    pressFiredRef.current = false;
    if (fingersRef.current.size === 1) {
      const section = event.currentTarget;
      const { clientX, clientY } = event;
      pressRef.current = window.setTimeout(() => {
        pressRef.current = null;
        pressFiredRef.current = true;
        abandonOperation();
        // The host's onContextMenu already picks the target and opens the menu.
        section.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX, clientY }));
      }, LONG_PRESS_MS);
      return true;
    }
    // A second finger ends whatever the first began; a third is ignored.
    lastTapRef.current = null;
    if (fingersRef.current.size === 2) {
      abandonOperation();
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* pointer already released */
      }
      const points = pinchPoints();
      if (points) pinchRef.current = { camera: optionsRef.current.cameraRef.current, points };
    }
    return false;
  }, [optionsRef, abandonOperation, clearPress]);

  /** Returns true when the move was consumed (a pinch); false hands it to the pointer hook. */
  const moveTouch = useCallback((event: ReactPointerEvent<HTMLElement>): boolean => {
    const finger = event.pointerType === 'touch' ? fingersRef.current.get(event.pointerId) : undefined;
    if (!finger) return false;
    finger.at = localPoint(event);
    if (pressRef.current && !isTap(finger)) clearPress();
    const pinch = pinchRef.current;
    const points = pinch && pinchPoints();
    if (!pinch || !points) return pinch !== null;
    optionsRef.current.updateCamera(pinchCamera(pinch, points));
    return true;
  }, [optionsRef, clearPress]);

  /** Returns the tap when this release completes a double-tap, so the caller can act on it. */
  const endTouch = useCallback((event: ReactPointerEvent<HTMLElement>): Tap | null => {
    const fingers = fingersRef.current;
    const finger = event.pointerType === 'touch' ? fingers.get(event.pointerId) : undefined;
    if (!finger) return null;
    fingers.delete(event.pointerId);
    clearPress();
    if (fingers.size < 2) pinchRef.current = null;
    if (pressFiredRef.current || fingers.size > 0) return null;
    finger.at = localPoint(event);
    if (!isTap(finger)) {
      lastTapRef.current = null;
      return null;
    }
    const tap = { at: finger.at, time: event.timeStamp };
    if (isDoubleTap(lastTapRef.current, tap)) {
      lastTapRef.current = null;
      return tap;
    }
    lastTapRef.current = tap;
    return null;
  }, [clearPress]);

  // pointercancel: the browser took the gesture (scroll, system zoom); forget every finger.
  const resetTouch = useCallback(() => {
    fingersRef.current.clear();
    pinchRef.current = null;
    lastTapRef.current = null;
    clearPress();
  }, [clearPress]);

  return { beginTouch, moveTouch, endTouch, resetTouch };
}
