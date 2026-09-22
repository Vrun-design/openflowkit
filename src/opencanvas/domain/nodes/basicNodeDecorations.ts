import type { Point2d, Size2d } from '../geometry/types';
import type { BasicNodeShape } from './basicNodePresentation';
import {
  CUBE_FACE, CUBE_OFFSET, LAYER_STACK_LAYER, LAYER_STACK_STEPS, PRISM_FACE, PRISM_OFFSET,
  offsetNormalised,
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

function scaled(points: readonly (readonly [number, number])[], size: Size2d): Point2d[] {
  return points.map(([x, y]) => ({ x: x * size.width, y: y * size.height }));
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
    // Glyphs inside a circle measure from the circle, not the (wider) box.
    case 'check-circle': {
      const r = Math.min(size.width, size.height) / 2;
      const cx = size.width / 2, cy = size.height / 2;
      return [[
        { x: cx - r * 0.42, y: cy + r * 0.02 }, { x: cx - r * 0.12, y: cy + r * 0.32 },
        { x: cx + r * 0.44, y: cy - r * 0.3 },
      ]];
    }
    case 'cross-circle': {
      const r = Math.min(size.width, size.height) / 2;
      const cx = size.width / 2, cy = size.height / 2;
      return [
        [{ x: cx - r * 0.34, y: cy - r * 0.34 }, { x: cx + r * 0.34, y: cy + r * 0.34 }],
        [{ x: cx + r * 0.34, y: cy - r * 0.34 }, { x: cx - r * 0.34, y: cy + r * 0.34 }],
      ];
    }
    // Only the edges inside the silhouette are drawn; the hull already is.
    case 'cube': {
      const [topLeft, topRight, bottomRight] = scaled(CUBE_FACE, size);
      const [, backTopRight] = scaled(offsetNormalised(CUBE_FACE, CUBE_OFFSET), size);
      return [[topLeft!, topRight!, bottomRight!], [topRight!, backTopRight!]];
    }
    case 'prism': {
      const face = scaled(PRISM_FACE, size);
      const [, backTopRight] = scaled(offsetNormalised(PRISM_FACE, PRISM_OFFSET), size);
      return [[...face, face[0]!], [face[1]!, backTopRight!]];
    }
    case 'page': {
      const w = size.width;
      const h = size.height;
      return [
        [{ x: 0.78 * w, y: 0 }, { x: 0.78 * w, y: 0.24 * h }],
        [{ x: 0.78 * w, y: 0.24 * h }, { x: w, y: 0.24 * h }],
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
    case 'layer-stack':
      return LAYER_STACK_STEPS.map((dy) => {
        const layer = scaled(offsetNormalised(LAYER_STACK_LAYER, [0, dy]), size);
        return [...layer, layer[0]!];
      });
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
