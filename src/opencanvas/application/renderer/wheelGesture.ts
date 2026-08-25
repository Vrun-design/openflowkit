import type { Size2d, Vector2d } from '../../domain/geometry/types';

export type WheelGestureMode = 'pan' | 'zoom';

export interface WheelGestureInput {
  readonly deltaX: number;
  readonly deltaY: number;
  readonly deltaMode: number;
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
  readonly timeStamp: number;
}

export interface WheelGestureState {
  readonly mode: WheelGestureMode;
  readonly lastEventAt: number;
}

export interface WheelGestureDecision {
  readonly mode: WheelGestureMode;
  readonly panDelta: Vector2d;
  readonly zoomDeltaY: number;
  readonly state: WheelGestureState;
}

const PIXELS_PER_LINE = 16;
const SESSION_GAP_MS = 160;
const TRACKPAD_DELTA_THRESHOLD = 50;
const DELTA_MODE_PIXEL = 0;
const DELTA_MODE_LINE = 1;
const DELTA_MODE_PAGE = 2;

function deltaScale(deltaMode: number, viewport: Size2d): Vector2d {
  if (deltaMode === DELTA_MODE_LINE) {
    return { x: PIXELS_PER_LINE, y: PIXELS_PER_LINE };
  }
  if (deltaMode === DELTA_MODE_PAGE) {
    return { x: viewport.width, y: viewport.height };
  }
  return { x: 1, y: 1 };
}

function classifyWheelGesture(
  input: WheelGestureInput,
  previous: WheelGestureState | null
): WheelGestureMode {
  if (input.ctrlKey) return 'zoom';
  if (input.shiftKey || input.deltaX !== 0) return 'pan';
  const sessionElapsed = previous ? input.timeStamp - previous.lastEventAt : Number.POSITIVE_INFINITY;
  if (previous && sessionElapsed >= 0 && sessionElapsed <= SESSION_GAP_MS) return previous.mode;
  if (input.deltaMode === DELTA_MODE_PIXEL
    && Math.abs(input.deltaY) < TRACKPAD_DELTA_THRESHOLD) return 'pan';
  return 'zoom';
}

export function resolveWheelGesture(
  input: WheelGestureInput,
  previous: WheelGestureState | null,
  viewport: Size2d
): WheelGestureDecision {
  const mode = classifyWheelGesture(input, previous);
  const scale = deltaScale(input.deltaMode, viewport);
  const horizontalDelta = input.shiftKey && input.deltaX === 0 ? input.deltaY : input.deltaX;
  const verticalDelta = input.shiftKey ? 0 : input.deltaY;
  return {
    mode,
    panDelta: {
      x: horizontalDelta === 0 ? 0 : -horizontalDelta * scale.x,
      y: verticalDelta === 0 ? 0 : -verticalDelta * scale.y,
    },
    zoomDeltaY: input.deltaY * scale.y,
    state: { mode, lastEventAt: input.timeStamp },
  };
}
