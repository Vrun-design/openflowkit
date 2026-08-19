import { Graphics } from 'pixi.js';
import { applyMatrixToPoint } from '../../domain/geometry/matrix';
import type { Bounds2d, Matrix2d, Size2d } from '../../domain/geometry/types';
import { basicNodeOutlinePoints } from '../../domain/nodes/basicNodeOutline';
import type { BasicNodeShape } from '../../domain/nodes/basicNodePresentation';

export function drawPixiNodeOutline(
  graphics: Graphics,
  shape: BasicNodeShape,
  size: Size2d,
  matrix: Matrix2d,
  customPath?: string
): void {
  const axisAligned = matrix.b === 0 && matrix.c === 0 && matrix.a > 0 && matrix.d > 0;
  if (axisAligned) {
    const width = size.width * matrix.a;
    const height = size.height * matrix.d;
    if (shape === 'rectangle') {
      graphics.rect(matrix.tx, matrix.ty, width, height);
      return;
    }
    if (shape === 'rounded' || shape === 'capsule') {
      const radius = shape === 'capsule' ? height / 2 : 12 * Math.min(matrix.a, matrix.d);
      graphics.roundRect(matrix.tx, matrix.ty, width, height, radius);
      return;
    }
  }
  const points = basicNodeOutlinePoints(shape, size, customPath).map((point) =>
    applyMatrixToPoint(matrix, point)
  );
  graphics.poly(points.flatMap((point) => [point.x, point.y]));
}

export function drawPixiLocalRect(
  graphics: Graphics,
  bounds: Bounds2d,
  matrix: Matrix2d,
  radius = 0
): void {
  const axisAligned = matrix.b === 0 && matrix.c === 0 && matrix.a > 0 && matrix.d > 0;
  if (axisAligned) {
    const x = matrix.tx + bounds.x * matrix.a;
    const y = matrix.ty + bounds.y * matrix.d;
    const width = bounds.width * matrix.a;
    const height = bounds.height * matrix.d;
    if (radius > 0) {
      graphics.roundRect(x, y, width, height, radius * Math.min(matrix.a, matrix.d));
    } else {
      graphics.rect(x, y, width, height);
    }
    return;
  }
  const points = [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { x: bounds.x, y: bounds.y + bounds.height },
  ].map((point) => applyMatrixToPoint(matrix, point));
  graphics.poly(points.flatMap((point) => [point.x, point.y]));
}
