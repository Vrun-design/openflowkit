import {
  GEOMETRY_EPSILON,
  areNearlyEqual,
  isFiniteNumber,
  requireFiniteNumber,
  requireNonNegativeNumber,
} from './finite';
import type { Point2d, Vector2d } from './types';

export const ORIGIN_2D: Point2d = Object.freeze({ x: 0, y: 0 });
export const ZERO_VECTOR_2D: Vector2d = Object.freeze({ x: 0, y: 0 });

export function createPoint2d(x: number, y: number): Point2d {
  return {
    x: requireFiniteNumber(x, 'point.x'),
    y: requireFiniteNumber(y, 'point.y'),
  };
}

export function createVector2d(x: number, y: number): Vector2d {
  return {
    x: requireFiniteNumber(x, 'vector.x'),
    y: requireFiniteNumber(y, 'vector.y'),
  };
}

export function isPoint2d(value: unknown): value is Point2d {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<Point2d>;
  return isFiniteNumber(candidate.x) && isFiniteNumber(candidate.y);
}

export function isVector2d(value: unknown): value is Vector2d {
  return isPoint2d(value);
}

export function addVectorToPoint(point: Point2d, vector: Vector2d): Point2d {
  return createPoint2d(point.x + vector.x, point.y + vector.y);
}

export function subtractPoints(end: Point2d, start: Point2d): Vector2d {
  return createVector2d(end.x - start.x, end.y - start.y);
}

export function scaleVector(vector: Vector2d, factor: number): Vector2d {
  const safeFactor = requireFiniteNumber(factor, 'factor');
  return createVector2d(vector.x * safeFactor, vector.y * safeFactor);
}

export function vectorLength(vector: Vector2d): number {
  return Math.hypot(vector.x, vector.y);
}

export function distanceBetweenPoints(left: Point2d, right: Point2d): number {
  return vectorLength(subtractPoints(right, left));
}

export function dotProduct(left: Vector2d, right: Vector2d): number {
  return left.x * right.x + left.y * right.y;
}

export function crossProduct(left: Vector2d, right: Vector2d): number {
  return left.x * right.y - left.y * right.x;
}

export function normalizeVector(vector: Vector2d, epsilon = GEOMETRY_EPSILON): Vector2d | null {
  const safeEpsilon = requireNonNegativeNumber(epsilon, 'epsilon');
  const length = vectorLength(vector);
  if (length <= safeEpsilon) {
    return null;
  }
  return scaleVector(vector, 1 / length);
}

export function lerpPoint(start: Point2d, end: Point2d, ratio: number): Point2d {
  const safeRatio = requireFiniteNumber(ratio, 'ratio');
  return createPoint2d(
    start.x + (end.x - start.x) * safeRatio,
    start.y + (end.y - start.y) * safeRatio
  );
}

export function arePointsNearlyEqual(
  left: Point2d,
  right: Point2d,
  epsilon = GEOMETRY_EPSILON
): boolean {
  return areNearlyEqual(left.x, right.x, epsilon) && areNearlyEqual(left.y, right.y, epsilon);
}
