import type { Point2d, Size2d } from '../geometry/types';
import type { BasicNodeShape } from './basicNodePresentation';
import { customSvgPathOutline } from './customSvgPath';

const outlineCache = new Map<string, readonly Point2d[]>();
const MAX_OUTLINE_CACHE_ENTRIES = 512;

function roundedRectanglePoints(size: Size2d, radius: number): readonly Point2d[] {
  const boundedRadius = Math.min(radius, size.width / 2, size.height / 2);
  const corners = [
    { x: size.width - boundedRadius, y: boundedRadius, start: -Math.PI / 2 },
    { x: size.width - boundedRadius, y: size.height - boundedRadius, start: 0 },
    { x: boundedRadius, y: size.height - boundedRadius, start: Math.PI / 2 },
    { x: boundedRadius, y: boundedRadius, start: Math.PI },
  ];
  return corners.flatMap((corner) =>
    Array.from({ length: 4 }, (_, index) => {
      const angle = corner.start + (index * Math.PI) / 6;
      return {
        x: corner.x + Math.cos(angle) * boundedRadius,
        y: corner.y + Math.sin(angle) * boundedRadius,
      };
    })
  );
}

export function basicNodeOutlinePoints(shape: BasicNodeShape, size: Size2d, customPath?: string): readonly Point2d[] {
  const cacheKey = `${shape}:${size.width}:${size.height}:${customPath ?? ''}`;
  const cached = outlineCache.get(cacheKey);
  if (cached) return cached;
  const computed = computeBasicNodeOutlinePoints(shape, size, customPath);
  if (outlineCache.size >= MAX_OUTLINE_CACHE_ENTRIES) outlineCache.clear();
  outlineCache.set(cacheKey, computed);
  return computed;
}

function computeBasicNodeOutlinePoints(shape: BasicNodeShape, size: Size2d, customPath?: string): readonly Point2d[] {
  if (shape === 'custom-path') {
    return customPath ? customSvgPathOutline(customPath, size) : basicNodeOutlinePoints('rectangle', size);
  }
  if (shape === 'diamond') {
    return [
      { x: size.width / 2, y: 0 },
      { x: size.width, y: size.height / 2 },
      { x: size.width / 2, y: size.height },
      { x: 0, y: size.height / 2 },
    ];
  }
  if (shape === 'hexagon') {
    const inset = Math.min(size.width * 0.2, size.height * 0.5);
    return [{ x: inset, y: 0 }, { x: size.width - inset, y: 0 },
      { x: size.width, y: size.height / 2 }, { x: size.width - inset, y: size.height },
      { x: inset, y: size.height }, { x: 0, y: size.height / 2 }];
  }
  if (shape === 'parallelogram') {
    const skew = Math.min(size.width * 0.2, size.height * 0.5);
    return [{ x: skew, y: 0 }, { x: size.width, y: 0 },
      { x: size.width - skew, y: size.height }, { x: 0, y: size.height }];
  }
  if (shape === 'circle' || shape === 'ellipse') {
    const radiusX = shape === 'circle' ? Math.min(size.width, size.height) / 2 : size.width / 2;
    const radiusY = shape === 'circle' ? radiusX : size.height / 2;
    return Array.from({ length: 32 }, (_, index) => {
      const angle = index * Math.PI * 2 / 32;
      return { x: size.width / 2 + Math.cos(angle) * radiusX,
        y: size.height / 2 + Math.sin(angle) * radiusY };
    });
  }
  if (shape === 'cylinder' || shape === 'database' || shape === 'queue') {
    const rim = Math.min(12, size.height / 4);
    const top = Array.from({ length: 12 }, (_, index) => {
      const angle = Math.PI + index * Math.PI / 11;
      return { x: size.width / 2 + Math.cos(angle) * size.width / 2,
        y: rim + Math.sin(angle) * rim };
    });
    const bottom = Array.from({ length: 12 }, (_, index) => {
      const angle = index * Math.PI / 11;
      return { x: size.width / 2 + Math.cos(angle) * size.width / 2,
        y: size.height - rim + Math.sin(angle) * rim };
    });
    return [...top, ...bottom];
  }
  if (shape === 'document') {
    return [{ x: 0, y: 0 }, { x: size.width, y: 0 },
      { x: size.width, y: size.height * 0.82 },
      { x: size.width * 0.75, y: size.height },
      { x: size.width * 0.5, y: size.height * 0.82 },
      { x: size.width * 0.25, y: size.height },
      { x: 0, y: size.height * 0.82 }];
  }
  if (shape === 'cloud') {
    const normalized = [
      [0.06, 0.62], [0.02, 0.45], [0.12, 0.31], [0.25, 0.3], [0.31, 0.12],
      [0.5, 0.04], [0.65, 0.18], [0.8, 0.18], [0.91, 0.32], [0.97, 0.5],
      [0.91, 0.69], [0.75, 0.76], [0.61, 0.94], [0.4, 0.9], [0.24, 0.82], [0.1, 0.78],
    ];
    return normalized.map(([x, y]) => ({ x: x * size.width, y: y * size.height }));
  }
  if (shape === 'actor') {
    return [
      { x: size.width * 0.5, y: 0 }, { x: size.width * 0.65, y: size.height * 0.12 },
      { x: size.width * 0.58, y: size.height * 0.25 }, { x: size.width * 0.58, y: size.height * 0.48 },
      { x: size.width, y: size.height * 0.48 }, { x: size.width * 0.58, y: size.height * 0.56 },
      { x: size.width * 0.82, y: size.height }, { x: size.width * 0.5, y: size.height * 0.62 },
      { x: size.width * 0.18, y: size.height }, { x: size.width * 0.42, y: size.height * 0.56 },
      { x: 0, y: size.height * 0.48 }, { x: size.width * 0.42, y: size.height * 0.48 },
      { x: size.width * 0.42, y: size.height * 0.25 }, { x: size.width * 0.35, y: size.height * 0.12 },
    ];
  }
  if (shape === 'capsule') return roundedRectanglePoints(size, size.height / 2);
  if (shape === 'rounded') return roundedRectanglePoints(size, 12);
  return [
    { x: 0, y: 0 },
    { x: size.width, y: 0 },
    { x: size.width, y: size.height },
    { x: 0, y: size.height },
  ];
}

export function clearBasicNodeOutlineCache(): void {
  outlineCache.clear();
}
