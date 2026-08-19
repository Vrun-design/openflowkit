import { isFiniteNumber, requireFiniteNumber, requireNonNegativeNumber } from './finite';
import { createPoint2d } from './point';
import type { Bounds2d, Point2d, Vector2d } from './types';

export function createBounds2d(x: number, y: number, width: number, height: number): Bounds2d {
  return {
    x: requireFiniteNumber(x, 'bounds.x'),
    y: requireFiniteNumber(y, 'bounds.y'),
    width: requireNonNegativeNumber(width, 'bounds.width'),
    height: requireNonNegativeNumber(height, 'bounds.height'),
  };
}

export function isBounds2d(value: unknown): value is Bounds2d {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<Bounds2d>;
  return (
    isFiniteNumber(candidate.x) &&
    isFiniteNumber(candidate.y) &&
    isFiniteNumber(candidate.width) &&
    candidate.width >= 0 &&
    isFiniteNumber(candidate.height) &&
    candidate.height >= 0
  );
}

export function boundsMinX(bounds: Bounds2d): number {
  return bounds.x;
}

export function boundsMinY(bounds: Bounds2d): number {
  return bounds.y;
}

export function boundsMaxX(bounds: Bounds2d): number {
  return bounds.x + bounds.width;
}

export function boundsMaxY(bounds: Bounds2d): number {
  return bounds.y + bounds.height;
}

export function boundsCenter(bounds: Bounds2d): Point2d {
  return createPoint2d(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
}

export function boundsCorners(bounds: Bounds2d): readonly Point2d[] {
  const maxX = boundsMaxX(bounds);
  const maxY = boundsMaxY(bounds);
  return [
    createPoint2d(bounds.x, bounds.y),
    createPoint2d(maxX, bounds.y),
    createPoint2d(maxX, maxY),
    createPoint2d(bounds.x, maxY),
  ];
}

export function boundsFromPoints(points: readonly Point2d[]): Bounds2d | null {
  if (points.length === 0) {
    return null;
  }

  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;

  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return createBounds2d(minX, minY, maxX - minX, maxY - minY);
}

export function containsPoint(bounds: Bounds2d, point: Point2d): boolean {
  return (
    point.x >= boundsMinX(bounds) &&
    point.x <= boundsMaxX(bounds) &&
    point.y >= boundsMinY(bounds) &&
    point.y <= boundsMaxY(bounds)
  );
}

export function intersectsBounds(left: Bounds2d, right: Bounds2d): boolean {
  return !(
    boundsMaxX(left) < boundsMinX(right) ||
    boundsMaxX(right) < boundsMinX(left) ||
    boundsMaxY(left) < boundsMinY(right) ||
    boundsMaxY(right) < boundsMinY(left)
  );
}

export function intersectBounds(left: Bounds2d, right: Bounds2d): Bounds2d | null {
  if (!intersectsBounds(left, right)) {
    return null;
  }
  const minX = Math.max(boundsMinX(left), boundsMinX(right));
  const minY = Math.max(boundsMinY(left), boundsMinY(right));
  const maxX = Math.min(boundsMaxX(left), boundsMaxX(right));
  const maxY = Math.min(boundsMaxY(left), boundsMaxY(right));
  return createBounds2d(minX, minY, maxX - minX, maxY - minY);
}

export function unionBounds(left: Bounds2d, right: Bounds2d): Bounds2d {
  const minX = Math.min(boundsMinX(left), boundsMinX(right));
  const minY = Math.min(boundsMinY(left), boundsMinY(right));
  const maxX = Math.max(boundsMaxX(left), boundsMaxX(right));
  const maxY = Math.max(boundsMaxY(left), boundsMaxY(right));
  return createBounds2d(minX, minY, maxX - minX, maxY - minY);
}

export function translateBounds(bounds: Bounds2d, offset: Vector2d): Bounds2d {
  return createBounds2d(bounds.x + offset.x, bounds.y + offset.y, bounds.width, bounds.height);
}

export function expandBounds(bounds: Bounds2d, padding: number): Bounds2d {
  const safePadding = requireNonNegativeNumber(padding, 'padding');
  return createBounds2d(
    bounds.x - safePadding,
    bounds.y - safePadding,
    bounds.width + safePadding * 2,
    bounds.height + safePadding * 2
  );
}
