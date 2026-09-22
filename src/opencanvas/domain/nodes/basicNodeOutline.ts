import type { Point2d, Size2d } from '../geometry/types';
import type { BasicNodeShape } from './basicNodePresentation';
import { customSvgPathOutline } from './customSvgPath';

type Normalised = readonly (readonly [number, number])[];

const outlineCache = new Map<string, readonly Point2d[]>();
const MAX_OUTLINE_CACHE_ENTRIES = 1024;

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

function norm(points: Normalised, size: Size2d): Point2d[] {
  return points.map(([x, y]) => ({ x: x * size.width, y: y * size.height }));
}

/** `count` points around a full ellipse, first point at angle 0, no duplicate. */
function ellipsePoints(cx: number, cy: number, rx: number, ry: number, count: number): Point2d[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index * Math.PI * 2) / count;
    return { x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry };
  });
}

/** Points along an arc from `from` to `to` radians inclusive of both ends. */
function arcPoints(
  cx: number, cy: number, rx: number, ry: number, from: number, to: number, count: number
): Point2d[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = from + ((to - from) * index) / (count - 1);
    return { x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry };
  });
}

/** Rotates a normalised outline by quarter turns (clockwise), staying in 0..1. */
function quarterTurns(points: Normalised, turns: number): Normalised {
  return points.map(([x, y]) => {
    if (turns % 4 === 1) return [1 - y, x] as const;
    if (turns % 4 === 2) return [1 - x, 1 - y] as const;
    if (turns % 4 === 3) return [y, 1 - x] as const;
    return [x, y] as const;
  });
}

function starPoints(spikes: number, innerRatio: number): Normalised {
  return Array.from({ length: spikes * 2 }, (_, index) => {
    const radius = index % 2 === 0 ? 0.5 : 0.5 * innerRatio;
    const angle = -Math.PI / 2 + (index * Math.PI) / spikes;
    return [0.5 + Math.cos(angle) * radius, 0.5 + Math.sin(angle) * radius] as const;
  });
}

// The classic heart curve, normalised to its own bounding box so resize just
// stretches it along each axis.
function heartPoints(count: number): Normalised {
  const raw = Array.from({ length: count }, (_, index) => {
    const t = (index / count) * Math.PI * 2;
    return {
      x: 16 * Math.sin(t) ** 3,
      y: 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t),
    };
  });
  const xs = raw.map(({ x }) => x);
  const ys = raw.map(({ y }) => y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  return raw.map(({ x, y }) => [(x - minX) / (maxX - minX), 1 - (y - minY) / (maxY - minY)] as const);
}

/** Convex hull of a face and the same face offset — the silhouette of an extrusion. */
export function extrudedSilhouette(face: Normalised, offset: readonly [number, number]): Normalised {
  const points: Normalised = [...face, ...face.map(([x, y]) => [x + offset[0], y + offset[1]] as const)];
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: readonly [number, number], a: readonly [number, number], b: readonly [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const build = (input: Normalised): Normalised => {
    const hull: (readonly [number, number])[] = [];
    for (const point of input) {
      while (hull.length >= 2 && cross(hull[hull.length - 2]!, hull[hull.length - 1]!, point) <= 0) hull.pop();
      hull.push(point);
    }
    return hull;
  };
  const lower = build(sorted);
  const upper = build([...sorted].reverse());
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

// Faces of the two extruded solids. Both the silhouette and the visible inner
// edges are derived from these, so a tweak here can never half-apply.
export const CUBE_FACE: Normalised = [[0, 0.3], [0.66, 0.3], [0.66, 1], [0, 1]];
export const CUBE_OFFSET = [0.34, -0.3] as const;
export const PRISM_FACE: Normalised = [[0.06, 0.44], [0.62, 0.44], [0.34, 1]];
export const PRISM_OFFSET = [0.32, -0.42] as const;

export function offsetNormalised(
  face: Normalised, offset: readonly [number, number]
): Normalised {
  return face.map(([x, y]) => [x + offset[0], y + offset[1]] as const);
}

const NORMALISED_OUTLINES: Readonly<Partial<Record<BasicNodeShape, Normalised>>> = {
  triangle: [[0.5, 0], [1, 1], [0, 1]],
  trapezoid: [[0.18, 0], [0.82, 0], [1, 1], [0, 1]],
  'pentagon-tag': [[0, 0], [0.72, 0], [1, 0.5], [0.72, 1], [0, 1]],
  chevron: [[0, 0], [0.6, 0], [1, 0.5], [0.6, 1], [0, 1], [0.4, 0.5]],
  octagon: [
    [0.3, 0], [0.7, 0], [1, 0.3], [1, 0.7], [0.7, 1], [0.3, 1], [0, 0.7], [0, 0.3],
  ],
  plus: [
    [0.35, 0], [0.65, 0], [0.65, 0.35], [1, 0.35], [1, 0.65], [0.65, 0.65],
    [0.65, 1], [0.35, 1], [0.35, 0.65], [0, 0.65], [0, 0.35], [0.35, 0.35],
  ],
  lightning: [[0.58, 0], [0.14, 0.56], [0.44, 0.56], [0.34, 1], [0.86, 0.4], [0.54, 0.4], [0.7, 0]],
  bookmark: [[0, 0], [1, 0], [1, 1], [0.5, 0.7], [0, 1]],
  'speech-bubble': [
    [0.1, 0], [0.9, 0], [1, 0.12], [1, 0.72], [0.9, 0.84], [0.36, 0.84],
    [0.16, 1], [0.2, 0.84], [0.1, 0.84], [0, 0.72], [0, 0.12],
  ],
  comment: [[0, 0], [1, 0], [1, 0.8], [0.74, 0.8], [0.62, 1], [0.64, 0.8], [0, 0.8]],
  folder: [[0, 0.14], [0.4, 0.14], [0.48, 0], [1, 0], [1, 1], [0, 1]],
  page: [[0, 0], [0.78, 0], [1, 0.24], [1, 1], [0, 1]],
  'arrow-up': [[0.32, 1], [0.32, 0.42], [0.02, 0.42], [0.5, 0], [0.98, 0.42], [0.68, 0.42], [0.68, 1]],
  cube: extrudedSilhouette(CUBE_FACE, CUBE_OFFSET),
  prism: extrudedSilhouette(PRISM_FACE, PRISM_OFFSET),
  'layer-stack': [[0.06, 0.22], [0.72, 0.22], [0.94, 0], [0.28, 0], [0.06, 0.22]],
  star: starPoints(5, 0.44),
  heart: heartPoints(22),
};

/** Silhouette of the two overlapping circles, tracing the union envelope. */
function vennPoints(size: Size2d): Point2d[] {
  // Two circles whose union is 2 * 1.62r wide: keep the union inside the box.
  const radius = Math.min(size.width / 3.32, size.height * 0.46);
  const centerX = size.width / 2;
  const centerY = size.height / 2;
  const offsetX = radius * 0.62;
  const alpha = Math.acos(Math.min(1, offsetX / radius));
  const left = arcPoints(centerX - offsetX, centerY, radius, radius, alpha, Math.PI * 2 - alpha, 14);
  const right = arcPoints(
    centerX + offsetX, centerY, radius, radius, Math.PI + alpha, Math.PI * 3 - alpha, 14
  );
  return [...left, ...right];
}

/** A map pin: round head, pointed tail. */
function pinPoints(size: Size2d): Point2d[] {
  const radius = Math.min(size.width, size.height * 0.62) / 2;
  const centerX = size.width / 2;
  const centerY = radius;
  const head = arcPoints(centerX, centerY, radius, radius, Math.PI * 1.16, Math.PI * 1.84, 16);
  return [...head, { x: centerX, y: size.height }];
}

/** A flat-left, round-right D. */
function halfRoundPoints(size: Size2d): Point2d[] {
  return [
    { x: 0, y: 0 },
    ...arcPoints(size.width / 2, size.height / 2, size.width / 2, size.height / 2,
      -Math.PI / 2, Math.PI / 2, 16),
    { x: 0, y: size.height },
  ];
}

/** `turns` quarter rotations of the up arrow, so all four read the same. */
function arrowPoints(shape: BasicNodeShape, size: Size2d): Point2d[] {
  const turns = shape === 'arrow-up' ? 0 : shape === 'arrow-right' ? 1 : shape === 'arrow-down' ? 2 : 3;
  return norm(quarterTurns(NORMALISED_OUTLINES['arrow-up']!, turns), size);
}

/** A closed ribbon around a centreline: how the brace and bracket get a body. */
export function ribbonPoints(
  centreline: readonly Point2d[], halfWidth: number
): readonly Point2d[] {
  const left: Point2d[] = [];
  const right: Point2d[] = [];
  centreline.forEach((point, index) => {
    const previous = centreline[Math.max(0, index - 1)]!;
    const next = centreline[Math.min(centreline.length - 1, index + 1)]!;
    const dx = next.x - previous.x;
    const dy = next.y - previous.y;
    const length = Math.hypot(dx, dy) || 1;
    const normal = { x: -dy / length, y: dx / length };
    left.push({ x: point.x + normal.x * halfWidth, y: point.y + normal.y * halfWidth });
    right.push({ x: point.x - normal.x * halfWidth, y: point.y - normal.y * halfWidth });
  });
  return [...left, ...right.reverse()];
}

function bracePoints(size: Size2d): readonly Point2d[] {
  const midX = size.width * 0.42;
  const centreline: Point2d[] = [
    { x: size.width * 0.92, y: size.height * 0.06 },
    { x: midX, y: size.height * 0.06 },
    { x: midX, y: size.height * 0.44 },
    { x: size.width * 0.16, y: size.height * 0.5 },
    { x: midX, y: size.height * 0.56 },
    { x: midX, y: size.height * 0.94 },
    { x: size.width * 0.92, y: size.height * 0.94 },
  ];
  return ribbonPoints(centreline, Math.min(size.width, size.height) * 0.055);
}

function bracketPoints(size: Size2d): readonly Point2d[] {
  const centreline: Point2d[] = [
    { x: size.width * 0.82, y: size.height * 0.08 },
    { x: size.width * 0.3, y: size.height * 0.08 },
    { x: size.width * 0.3, y: size.height * 0.92 },
    { x: size.width * 0.82, y: size.height * 0.92 },
  ];
  return ribbonPoints(centreline, Math.min(size.width, size.height) * 0.07);
}

/** `cornerRadius` applies to rectangle/rounded only; undefined keeps the shape default. */
export function basicNodeOutlinePoints(
  shape: BasicNodeShape, size: Size2d, customPath?: string, cornerRadius?: number
): readonly Point2d[] {
  const cacheKey = `${shape}:${size.width}:${size.height}:${customPath ?? ''}:${cornerRadius ?? ''}`;
  const cached = outlineCache.get(cacheKey);
  if (cached) return cached;
  const computed = computeBasicNodeOutlinePoints(shape, size, customPath, cornerRadius);
  if (outlineCache.size >= MAX_OUTLINE_CACHE_ENTRIES) outlineCache.clear();
  outlineCache.set(cacheKey, computed);
  return computed;
}

function computeBasicNodeOutlinePoints(
  shape: BasicNodeShape, size: Size2d, customPath?: string, cornerRadius?: number
): readonly Point2d[] {
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
  if (shape === 'circle' || shape === 'ellipse' || shape === 'check-circle'
    || shape === 'cross-circle' || shape === 'numbered-circle' || shape === 'target') {
    const radiusX = shape === 'circle' || shape === 'check-circle' || shape === 'cross-circle'
      || shape === 'numbered-circle' || shape === 'target'
      ? Math.min(size.width, size.height) / 2 : size.width / 2;
    const radiusY = shape === 'circle' || shape === 'check-circle' || shape === 'cross-circle'
      || shape === 'numbered-circle' || shape === 'target'
      ? radiusX : size.height / 2;
    return ellipsePoints(size.width / 2, size.height / 2, radiusX, radiusY, 24);
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
  if (shape === 'venn') return vennPoints(size);
  if (shape === 'pin') return pinPoints(size);
  if (shape === 'half-round') return halfRoundPoints(size);
  if (shape === 'brace') return bracePoints(size);
  if (shape === 'bracket') return bracketPoints(size);
  if (shape === 'arrow-up' || shape === 'arrow-down' || shape === 'arrow-left' || shape === 'arrow-right') {
    return arrowPoints(shape, size);
  }
  if (shape === 'callout-stack') return roundedRectanglePoints(size, Math.min(size.width, size.height) * 0.16);
  if (shape === 'panel') return basicNodeOutlinePoints('rectangle', size);
  if (shape === 'list-card') return roundedRectanglePoints(size, Math.min(size.width, size.height) * 0.14);
  if (shape === 'filled-bar') return roundedRectanglePoints(size, size.height / 2);
  const normalised = NORMALISED_OUTLINES[shape];
  if (normalised) return norm(normalised, size);
  if (shape === 'capsule') return roundedRectanglePoints(size, size.height / 2);
  if (shape === 'rounded') return roundedRectanglePoints(size, cornerRadius ?? 12);
  if (shape === 'rectangle' && cornerRadius) return roundedRectanglePoints(size, cornerRadius);
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
