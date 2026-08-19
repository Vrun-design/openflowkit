import { isFiniteNumber, requireFiniteNumber } from './finite';
import { createMatrix2d } from './matrix';
import { createPoint2d, createVector2d, isPoint2d, isVector2d } from './point';
import type { Matrix2d, Transform2d } from './types';

export const IDENTITY_TRANSFORM_2D: Transform2d = Object.freeze({
  translation: Object.freeze({ x: 0, y: 0 }),
  rotationRadians: 0,
  scale: Object.freeze({ x: 1, y: 1 }),
});

export function createTransform2d(input: Partial<Transform2d> = {}): Transform2d {
  const translation = input.translation ?? IDENTITY_TRANSFORM_2D.translation;
  const scale = input.scale ?? IDENTITY_TRANSFORM_2D.scale;
  return {
    translation: createPoint2d(translation.x, translation.y),
    rotationRadians: requireFiniteNumber(input.rotationRadians ?? 0, 'rotationRadians'),
    scale: createVector2d(scale.x, scale.y),
  };
}

export function isTransform2d(value: unknown): value is Transform2d {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<Transform2d>;
  return (
    isPoint2d(candidate.translation) &&
    isFiniteNumber(candidate.rotationRadians) &&
    isVector2d(candidate.scale)
  );
}

export function transformToMatrix(transform: Transform2d): Matrix2d {
  const cosine = Math.cos(transform.rotationRadians);
  const sine = Math.sin(transform.rotationRadians);
  return createMatrix2d(
    cosine * transform.scale.x,
    sine * transform.scale.x,
    -sine * transform.scale.y,
    cosine * transform.scale.y,
    transform.translation.x,
    transform.translation.y
  );
}
