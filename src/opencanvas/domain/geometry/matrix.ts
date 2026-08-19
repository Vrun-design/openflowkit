import { boundsCorners, boundsFromPoints } from './bounds';
import { GEOMETRY_EPSILON, requireFiniteNumber, requireNonNegativeNumber } from './finite';
import { createPoint2d } from './point';
import type { Bounds2d, Matrix2d, Point2d } from './types';

export const IDENTITY_MATRIX_2D: Matrix2d = Object.freeze({
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  tx: 0,
  ty: 0,
});

export function createMatrix2d(
  a: number,
  b: number,
  c: number,
  d: number,
  tx: number,
  ty: number
): Matrix2d {
  return {
    a: requireFiniteNumber(a, 'matrix.a'),
    b: requireFiniteNumber(b, 'matrix.b'),
    c: requireFiniteNumber(c, 'matrix.c'),
    d: requireFiniteNumber(d, 'matrix.d'),
    tx: requireFiniteNumber(tx, 'matrix.tx'),
    ty: requireFiniteNumber(ty, 'matrix.ty'),
  };
}

export function multiplyMatrices(left: Matrix2d, right: Matrix2d): Matrix2d {
  return createMatrix2d(
    left.a * right.a + left.c * right.b,
    left.b * right.a + left.d * right.b,
    left.a * right.c + left.c * right.d,
    left.b * right.c + left.d * right.d,
    left.a * right.tx + left.c * right.ty + left.tx,
    left.b * right.tx + left.d * right.ty + left.ty
  );
}

export function applyMatrixToPoint(matrix: Matrix2d, point: Point2d): Point2d {
  return createPoint2d(
    matrix.a * point.x + matrix.c * point.y + matrix.tx,
    matrix.b * point.x + matrix.d * point.y + matrix.ty
  );
}

export function matrixDeterminant(matrix: Matrix2d): number {
  return matrix.a * matrix.d - matrix.b * matrix.c;
}

export function invertMatrix(matrix: Matrix2d, epsilon = GEOMETRY_EPSILON): Matrix2d | null {
  const safeEpsilon = requireNonNegativeNumber(epsilon, 'epsilon');
  const determinant = matrixDeterminant(matrix);
  if (Math.abs(determinant) <= safeEpsilon) {
    return null;
  }

  return createMatrix2d(
    matrix.d / determinant,
    -matrix.b / determinant,
    -matrix.c / determinant,
    matrix.a / determinant,
    (matrix.c * matrix.ty - matrix.d * matrix.tx) / determinant,
    (matrix.b * matrix.tx - matrix.a * matrix.ty) / determinant
  );
}

export function transformBounds(matrix: Matrix2d, bounds: Bounds2d): Bounds2d {
  const transformedBounds = boundsFromPoints(
    boundsCorners(bounds).map((point) => applyMatrixToPoint(matrix, point))
  );
  if (!transformedBounds) {
    throw new Error('Bounds corners unexpectedly produced no transformed bounds.');
  }
  return transformedBounds;
}
