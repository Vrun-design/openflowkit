import { Container, Matrix } from 'pixi.js';
import type { Matrix2d } from '../../domain/geometry/types';

export function applyPixiNodeMatrix(container: Container, matrix: Matrix2d): void {
  container.setFromMatrix(new Matrix(matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty));
}
