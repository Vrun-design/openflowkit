import type { Point2d, Size2d } from '../geometry/types';

const TOKEN = /[MLHVZmlhvz]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g;
const COMMAND = /^[MLHVZmlhvz]$/;
const MAX_SOURCE_LENGTH = 4096;
const MAX_POINTS = 256;

export interface ValidatedCustomSvgPath {
  readonly source: string;
  readonly points: readonly Point2d[];
}

export function validateCustomSvgPath(source: string): ValidatedCustomSvgPath {
  const trimmed = source.trim();
  if (!trimmed || trimmed.length > MAX_SOURCE_LENGTH) {
    throw new TypeError('Custom SVG path must contain 1–4096 characters.');
  }
  const tokens = trimmed.match(TOKEN) ?? [];
  if (tokens.join('').toLowerCase() !== trimmed.replace(/[\s,]/g, '').toLowerCase()) {
    throw new TypeError('Custom SVG path contains unsupported syntax.');
  }
  const points: Point2d[] = [];
  let command = '';
  let index = 0;
  let cursor = { x: 0, y: 0 };
  let start: Point2d | null = null;
  const number = (): number => {
    const token = tokens[index++];
    if (token === undefined || COMMAND.test(token)) throw new TypeError('Custom SVG path is incomplete.');
    const value = Number(token);
    if (!Number.isFinite(value) || Math.abs(value) > 1_000_000) throw new TypeError('Custom SVG coordinate is invalid.');
    return value;
  };
  while (index < tokens.length) {
    if (COMMAND.test(tokens[index])) command = tokens[index++];
    if (!command) throw new TypeError('Custom SVG path must begin with a command.');
    const relative = command === command.toLowerCase();
    const upper = command.toUpperCase();
    if (upper === 'Z') {
      if (!start) throw new TypeError('Custom SVG path closes before it starts.');
      cursor = start;
      command = '';
      continue;
    }
    let next: Point2d;
    if (upper === 'H') next = { x: (relative ? cursor.x : 0) + number(), y: cursor.y };
    else if (upper === 'V') next = { x: cursor.x, y: (relative ? cursor.y : 0) + number() };
    else {
      const x = number(); const y = number();
      next = { x: (relative ? cursor.x : 0) + x, y: (relative ? cursor.y : 0) + y };
    }
    cursor = next;
    if (!start || upper === 'M') start = next;
    points.push(next);
    if (points.length > MAX_POINTS) throw new TypeError('Custom SVG path has too many points.');
    if (upper === 'M') command = relative ? 'l' : 'L';
  }
  if (points.length < 3) throw new TypeError('Custom SVG path needs at least three points.');
  const area = points.reduce((sum, point, i) => {
    const next = points[(i + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0);
  if (Math.abs(area) < 1e-6) throw new TypeError('Custom SVG path must enclose an area.');
  return { source: trimmed, points };
}

export function customSvgPathOutline(source: string, size: Size2d): readonly Point2d[] {
  const { points } = validateCustomSvgPath(source);
  const minX = Math.min(...points.map(({ x }) => x));
  const maxX = Math.max(...points.map(({ x }) => x));
  const minY = Math.min(...points.map(({ y }) => y));
  const maxY = Math.max(...points.map(({ y }) => y));
  const width = maxX - minX; const height = maxY - minY;
  return points.map(({ x, y }) => ({ x: (x - minX) / width * size.width, y: (y - minY) / height * size.height }));
}
