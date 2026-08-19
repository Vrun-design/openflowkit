import { describe, expect, it } from 'vitest';
import {
  applyMatrixToPoint,
  createMatrix2d,
  invertMatrix,
  multiplyMatrices,
  transformBounds,
} from './matrix';
import { createTransform2d, isTransform2d, transformToMatrix } from './transform';

describe('2D matrices and transforms', () => {
  it('applies scale, then rotation, then translation', () => {
    const transform = createTransform2d({
      translation: { x: 10, y: 20 },
      rotationRadians: Math.PI / 2,
      scale: { x: 2, y: 3 },
    });

    const result = applyMatrixToPoint(transformToMatrix(transform), { x: 1, y: 0 });
    expect(result.x).toBeCloseTo(10);
    expect(result.y).toBeCloseTo(22);
  });

  it('multiplies matrices so the right matrix is applied first', () => {
    const translate = createMatrix2d(1, 0, 0, 1, 10, 20);
    const scale = createMatrix2d(2, 0, 0, 3, 0, 0);

    expect(applyMatrixToPoint(multiplyMatrices(translate, scale), { x: 2, y: 4 })).toEqual({
      x: 14,
      y: 32,
    });
  });

  it('round-trips representative transforms through their inverse', () => {
    const transforms = [
      createTransform2d(),
      createTransform2d({ translation: { x: -12, y: 8 } }),
      createTransform2d({ rotationRadians: Math.PI / 3, scale: { x: 2, y: 0.5 } }),
      createTransform2d({
        translation: { x: 100, y: -50 },
        rotationRadians: -Math.PI / 7,
        scale: { x: -1.5, y: 4 },
      }),
    ];
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: -1 },
      { x: -123.45, y: 678.9 },
    ];

    for (const transform of transforms) {
      const matrix = transformToMatrix(transform);
      const inverse = invertMatrix(matrix);
      expect(inverse).not.toBeNull();
      for (const point of points) {
        const roundTrip = applyMatrixToPoint(inverse!, applyMatrixToPoint(matrix, point));
        expect(roundTrip.x).toBeCloseTo(point.x, 9);
        expect(roundTrip.y).toBeCloseTo(point.y, 9);
      }
    }
  });

  it('returns null for singular or effectively singular matrices', () => {
    expect(invertMatrix(createMatrix2d(1, 2, 2, 4, 0, 0))).toBeNull();
    expect(invertMatrix(createMatrix2d(1e-10, 0, 0, 1, 0, 0))).toBeNull();
  });

  it('returns an axis-aligned envelope for transformed bounds', () => {
    const rotation = transformToMatrix(createTransform2d({ rotationRadians: Math.PI / 2 }));
    const result = transformBounds(rotation, { x: 0, y: 0, width: 4, height: 2 });

    expect(result.x).toBeCloseTo(-2);
    expect(result.y).toBeCloseTo(0);
    expect(result.width).toBeCloseTo(2);
    expect(result.height).toBeCloseTo(4);
  });

  it('validates matrix and transform boundaries', () => {
    expect(() => createMatrix2d(1, 0, 0, 1, Number.NaN, 0)).toThrow(RangeError);
    expect(isTransform2d(createTransform2d())).toBe(true);
    expect(isTransform2d({ translation: { x: 0, y: 0 }, rotationRadians: 0 })).toBe(false);
    expect(
      isTransform2d({
        translation: { x: 0, y: 0 },
        rotationRadians: Number.POSITIVE_INFINITY,
        scale: { x: 1, y: 1 },
      })
    ).toBe(false);
  });
});
