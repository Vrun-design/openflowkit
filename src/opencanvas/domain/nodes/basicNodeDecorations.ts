import type { Point2d, Size2d } from '../geometry/types';
import type { BasicNodeShape } from './basicNodePresentation';
import {
  CUBE_FACE, CUBE_OFFSET, PRISM_FACE, PRISM_OFFSET, offsetNormalised,
} from './basicNodeOutline';

// Inner lines a silhouette alone cannot say: the lens of a venn, the rings of a
// target, the fold of a note. Drawn as open polylines in the node's stroke
// colour, after the fill — the same list feeds Pixi and the SVG export.
const cache = new Map<string, readonly (readonly Point2d[])[]>();

function arc(
  cx: number, cy: number, rx: number, ry: number, from: number, to: number, count: number
): Point2d[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = from + ((to - from) * index) / (count - 1);
    return { x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry };
  });
}

function circle(cx: number, cy: number, r: number, count: number): Point2d[] {
  return arc(cx, cy, r, r, 0, Math.PI * 2, count);
}

function compute(shape: BasicNodeShape, size: Size2d): readonly (readonly Point2d[])[] {
  switch (shape) {
    case 'venn': {
      const radius = Math.min(size.width * 0.32, size.height * 0.5);
      const centerX = size.width / 2;
      const centerY = size.height / 2;
      const offsetX = radius * 0.62;
      const alpha = Math.acos(Math.min(1, offsetX / radius));
      return [
        arc(centerX - offsetX, centerY, radius, radius, -alpha, alpha, 10),
        arc(centerX + offsetX, centerY, radius, radius, Math.PI - alpha, Math.PI + alpha, 10),
      ];
    }
    case 'target': {
      const radius = Math.min(size.width, size.height) / 2;
      return [
        circle(size.width / 2, size.height / 2, radius * 0.66, 18),
        circle(size.width / 2, size.height / 2, radius * 0.33, 14),
      ];
    }
    case 'cube':
    case 'prism': {
      // Both faces of the extrusion: the hull edges are drawn twice (same
      // stroke, invisible) and the interior edges show the depth.
      const [face, offset] = shape === 'cube'
        ? [CUBE_FACE, CUBE_OFFSET] as const
        : [PRISM_FACE, PRISM_OFFSET] as const;
      const back = offsetNormalised(face, offset);
      const scaled = (points: readonly (readonly [number, number])[]): Point2d[] =>
        points.map(([x, y]) => ({ x: x * size.width, y: y * size.height }));
      return [scaled(face), [...scaled(back), scaled(back)[0]!]];
    }
    case 'page': {
      const w = size.width;
      const h = size.height;
      return [
        [{ x: 0.78 * w, y: 0 }, { x: 0.78 * w, y: 0.24 * h }],
        [{ x: 0.78 * w, y: 0.24 * h }, { x: w, y: 0.24 * h }],
      ];
    }
    case 'check-circle': {
      const w = size.width;
      const h = size.height;
      return [[
        { x: 0.3 * w, y: 0.52 * h }, { x: 0.44 * w, y: 0.66 * h },
        { x: 0.72 * w, y: 0.36 * h },
      ]];
    }
    case 'cross-circle': {
      const w = size.width;
      const h = size.height;
      return [
        [{ x: 0.34 * w, y: 0.34 * h }, { x: 0.66 * w, y: 0.66 * h }],
        [{ x: 0.66 * w, y: 0.34 * h }, { x: 0.34 * w, y: 0.66 * h }],
      ];
    }
    case 'list-card': {
      const w = size.width;
      const h = size.height;
      const left = 0.18 * w;
      const right = 0.82 * w;
      return [0.32, 0.5, 0.68].map((y) => [
        { x: left, y: y * h }, { x: right, y: y * h },
      ]);
    }
    case 'layer-stack': {
      const w = size.width;
      const h = size.height;
      const outline = (dy: number): Point2d[] => [
        { x: 0.06 * w, y: (0.22 + dy) * h }, { x: 0.72 * w, y: (0.22 + dy) * h },
        { x: 0.94 * w, y: (0 + dy) * h }, { x: 0.28 * w, y: (0 + dy) * h },
      ];
      return [outline(0.32), outline(0.62)];
    }
    case 'callout-stack': {
      const w = size.width;
      const h = size.height;
      const inset = 0.12;
      return [[
        { x: w * inset * 2, y: h * inset * 2 }, { x: w * (1 - inset), y: h * inset * 2 },
        { x: w * (1 - inset), y: h * (1 - inset * 2) }, { x: w * inset * 2, y: h * (1 - inset * 2) },
        { x: w * inset * 2, y: h * inset * 2 },
      ]];
    }
    case 'panel': {
      const w = size.width;
      const h = size.height;
      return [[{ x: w * 0.34, y: 0 }, { x: w * 0.34, y: h }]];
    }
    case 'filled-bar': {
      const w = size.width;
      const h = size.height;
      return [[{ x: w * 0.14, y: h / 2 }, { x: w * 0.86, y: h / 2 }]];
    }
    default:
      return [];
  }
}

export function basicNodeDecorations(
  shape: BasicNodeShape, size: Size2d
): readonly (readonly Point2d[])[] {
  const key = `${shape}:${size.width}:${size.height}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const computed = compute(shape, size);
  if (cache.size > 512) cache.clear();
  cache.set(key, computed);
  return computed;
}
