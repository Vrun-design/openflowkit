import { isFiniteNumber, requireNonNegativeNumber } from './finite';
import type { Size2d } from './types';

export function createSize2d(width: number, height: number): Size2d {
  return {
    width: requireNonNegativeNumber(width, 'size.width'),
    height: requireNonNegativeNumber(height, 'size.height'),
  };
}

export function isSize2d(value: unknown): value is Size2d {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<Size2d>;
  return (
    isFiniteNumber(candidate.width) &&
    candidate.width >= 0 &&
    isFiniteNumber(candidate.height) &&
    candidate.height >= 0
  );
}

export function sizeArea(size: Size2d): number {
  return size.width * size.height;
}
