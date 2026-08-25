import type { Point2d, Size2d, Vector2d } from '../../domain/geometry/types';

export interface EdgeScrollOptions {
  readonly edgeSizePx?: number;
  readonly maximumSpeedPxPerSecond?: number;
  readonly maximumFrameMs?: number;
}

const DEFAULT_EDGE_SIZE_PX = 56;
const DEFAULT_MAXIMUM_SPEED_PX_PER_SECOND = 720;
const DEFAULT_MAXIMUM_FRAME_MS = 40;

function axisVelocity(
  position: number,
  size: number,
  edgeSize: number,
  maximumSpeed: number
): number {
  if (size <= 0) return 0;
  const boundedEdgeSize = Math.min(edgeSize, size / 2);
  if (position < boundedEdgeSize) {
    const strength = Math.min(
      1,
      Math.max(0, (boundedEdgeSize - position) / boundedEdgeSize)
    );
    return maximumSpeed * strength * strength;
  }
  if (position > size - boundedEdgeSize) {
    const strength = Math.min(
      1,
      Math.max(0, (position - size + boundedEdgeSize) / boundedEdgeSize)
    );
    return -maximumSpeed * strength * strength;
  }
  return 0;
}

export function edgeScrollVelocity(
  pointer: Point2d,
  viewport: Size2d,
  options: EdgeScrollOptions = {}
): Vector2d {
  const edgeSize = Math.max(1, options.edgeSizePx ?? DEFAULT_EDGE_SIZE_PX);
  const maximumSpeed = Math.max(
    0,
    options.maximumSpeedPxPerSecond ?? DEFAULT_MAXIMUM_SPEED_PX_PER_SECOND
  );
  return {
    x: axisVelocity(pointer.x, viewport.width, edgeSize, maximumSpeed),
    y: axisVelocity(pointer.y, viewport.height, edgeSize, maximumSpeed),
  };
}

export function edgeScrollDelta(
  velocity: Vector2d,
  elapsedMs: number,
  options: EdgeScrollOptions = {}
): Vector2d {
  const boundedElapsedMs = Math.min(
    Math.max(0, options.maximumFrameMs ?? DEFAULT_MAXIMUM_FRAME_MS),
    Math.max(0, elapsedMs)
  );
  return {
    x: velocity.x * boundedElapsedMs / 1_000,
    y: velocity.y * boundedElapsedMs / 1_000,
  };
}

export function hasEdgeScrollVelocity(velocity: Vector2d): boolean {
  return velocity.x !== 0 || velocity.y !== 0;
}
