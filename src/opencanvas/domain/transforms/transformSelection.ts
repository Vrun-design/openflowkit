import type { DocumentCommand } from '../commands/types';
import type { SceneNode } from '../document/types';
import { createBounds2d, unionBounds } from '../geometry/bounds';
import { buildNodeWorldMatrices, nodeWorldBounds, nodeWorldCenter } from '../scene/worldGeometry';
import type { ScenePage } from '../document/types';
import type { Bounds2d, Point2d } from '../geometry/types';
import type {
  ResizeTransformInput,
  TransformHandle,
  TransformResult,
  TransformSnapshot,
} from './types';

const DEFAULT_GRID_SIZE = 16;
const DEFAULT_MINIMUM_SIZE = 24;

function snapValue(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

function rotatePoint(point: Point2d, center: Point2d, angle: number): Point2d {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const x = point.x - center.x;
  const y = point.y - center.y;
  return {
    x: center.x + x * cosine - y * sine,
    y: center.y + x * sine + y * cosine,
  };
}

function boundsCenter(bounds: Bounds2d): Point2d {
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}

function selectionBounds(page: ScenePage, nodes: readonly SceneNode[]): Bounds2d {
  const matrices = buildNodeWorldMatrices(page);
  const bounds = nodes.map((node) => nodeWorldBounds(node, matrices.get(node.id)!));
  if (bounds.length === 0) throw new Error('A transform requires at least one node.');
  return bounds.slice(1).reduce(unionBounds, bounds[0]);
}

export function createTransformSnapshot(
  page: ScenePage,
  nodeIds: readonly string[]
): TransformSnapshot {
  const selected = new Set(nodeIds);
  const nodes = page.nodes.filter((node) => selected.has(node.id));
  if (nodes.length !== selected.size) throw new Error('A selected node was not found.');
  return { nodes, bounds: selectionBounds(page, nodes) };
}

export function moveTransform(
  snapshot: TransformSnapshot,
  delta: Point2d,
  options: { readonly gridSize?: number; readonly snap?: boolean } = {}
): TransformResult {
  const gridSize = options.gridSize ?? DEFAULT_GRID_SIZE;
  const rawX = snapshot.bounds.x + delta.x;
  const rawY = snapshot.bounds.y + delta.y;
  const x = options.snap === false ? rawX : snapValue(rawX, gridSize);
  const y = options.snap === false ? rawY : snapValue(rawY, gridSize);
  const applied = { x: x - snapshot.bounds.x, y: y - snapshot.bounds.y };
  return {
    nodes: snapshot.nodes.map((node) => ({
      ...node,
      transform: {
        ...node.transform,
        translation: {
          x: node.transform.translation.x + applied.x,
          y: node.transform.translation.y + applied.y,
        },
      },
    })),
    bounds: createBounds2d(x, y, snapshot.bounds.width, snapshot.bounds.height),
    snappedX: x !== rawX,
    snappedY: y !== rawY,
  };
}

function resizeAxes(handle: Exclude<TransformHandle, 'rotate'>): {
  readonly west: boolean;
  readonly east: boolean;
  readonly north: boolean;
  readonly south: boolean;
} {
  return {
    west: handle.includes('west'),
    east: handle.includes('east'),
    north: handle.includes('north'),
    south: handle.includes('south'),
  };
}

function fixedResizeAnchor(bounds: Bounds2d, axes: ReturnType<typeof resizeAxes>): Point2d {
  let x = bounds.x;
  let y = bounds.y;
  if (axes.west) x += bounds.width;
  if (axes.north) y += bounds.height;
  return { x, y };
}

export function resizeTransform(
  snapshot: TransformSnapshot,
  input: ResizeTransformInput
): TransformResult {
  const axes = resizeAxes(input.handle);
  const minimum = input.minimumSize ?? DEFAULT_MINIMUM_SIZE;
  const gridSize = input.gridSize ?? DEFAULT_GRID_SIZE;
  const right = snapshot.bounds.x + snapshot.bounds.width;
  const bottom = snapshot.bounds.y + snapshot.bounds.height;
  const rawX = axes.west ? input.pointer.x : snapshot.bounds.x;
  const rawY = axes.north ? input.pointer.y : snapshot.bounds.y;
  const rawRight = axes.east ? input.pointer.x : right;
  const rawBottom = axes.south ? input.pointer.y : bottom;
  const snap = input.snap !== false;
  const candidateX = snap && axes.west ? snapValue(rawX, gridSize) : rawX;
  const candidateY = snap && axes.north ? snapValue(rawY, gridSize) : rawY;
  const candidateRight = snap && axes.east ? snapValue(rawRight, gridSize) : rawRight;
  const candidateBottom = snap && axes.south ? snapValue(rawBottom, gridSize) : rawBottom;
  const x = axes.west ? Math.min(candidateX, right - minimum) : snapshot.bounds.x;
  const y = axes.north ? Math.min(candidateY, bottom - minimum) : snapshot.bounds.y;
  const nextRight = axes.east ? Math.max(candidateRight, snapshot.bounds.x + minimum) : right;
  const nextBottom = axes.south ? Math.max(candidateBottom, snapshot.bounds.y + minimum) : bottom;
  const nextBounds = createBounds2d(x, y, nextRight - x, nextBottom - y);
  const scaleX = nextBounds.width / snapshot.bounds.width;
  const scaleY = nextBounds.height / snapshot.bounds.height;
  const anchor = fixedResizeAnchor(snapshot.bounds, axes);

  return {
    nodes: snapshot.nodes.map((node) => {
      const translation = node.transform.translation;
      return {
        ...node,
        transform: {
          ...node.transform,
          translation: {
            x:
              axes.west || axes.east
                ? anchor.x + (translation.x - anchor.x) * scaleX
                : translation.x,
            y:
              axes.north || axes.south
                ? anchor.y + (translation.y - anchor.y) * scaleY
                : translation.y,
          },
          scale: {
            x: node.transform.scale.x * (axes.west || axes.east ? scaleX : 1),
            y: node.transform.scale.y * (axes.north || axes.south ? scaleY : 1),
          },
        },
      };
    }),
    bounds: nextBounds,
    snappedX: snap && (candidateX !== rawX || candidateRight !== rawRight),
    snappedY: snap && (candidateY !== rawY || candidateBottom !== rawBottom),
  };
}

export function rotateTransform(
  page: ScenePage,
  snapshot: TransformSnapshot,
  startPointer: Point2d,
  pointer: Point2d,
  snap = true
): TransformResult {
  const center = boundsCenter(snapshot.bounds);
  const startAngle = Math.atan2(startPointer.y - center.y, startPointer.x - center.x);
  const currentAngle = Math.atan2(pointer.y - center.y, pointer.x - center.x);
  const rawDelta = currentAngle - startAngle;
  const step = Math.PI / 12;
  const delta = snap ? Math.round(rawDelta / step) * step : rawDelta;
  const matrices = buildNodeWorldMatrices(page);
  const nodes = snapshot.nodes.map((node) => {
    const matrix = matrices.get(node.id)!;
    const oldCenter = nodeWorldCenter(node, matrix);
    const nextCenter = rotatePoint(oldCenter, center, delta);
    const rotation = node.transform.rotationRadians + delta;
    const localCenter = {
      x: (node.size.width * node.transform.scale.x) / 2,
      y: (node.size.height * node.transform.scale.y) / 2,
    };
    const rotatedOffset = rotatePoint(localCenter, { x: 0, y: 0 }, rotation);
    return {
      ...node,
      transform: {
        ...node.transform,
        rotationRadians: rotation,
        translation: {
          x: nextCenter.x - rotatedOffset.x,
          y: nextCenter.y - rotatedOffset.y,
        },
      },
    };
  });
  const previewPage = {
    ...page,
    nodes: page.nodes.map((node) => nodes.find((next) => next.id === node.id) ?? node),
  };
  return {
    nodes,
    bounds: selectionBounds(previewPage, nodes),
    snappedX: snap && delta !== rawDelta,
    snappedY: false,
  };
}

export function createTransformCommand(
  pageId: string,
  before: readonly SceneNode[],
  after: readonly SceneNode[],
  label: string,
  id = `transform-${Date.now()}`
): DocumentCommand {
  if (before.length !== after.length || before.length === 0) {
    throw new Error('Transform commands require matching non-empty node sets.');
  }
  const commands = before.map((node, index) => {
    if (node.id !== after[index].id) throw new Error('Transform node order must be stable.');
    return {
      kind: 'set-node' as const,
      id: `${id}:${node.id}`,
      label,
      pageId,
      before: node,
      after: after[index],
    };
  });
  return commands.length === 1 ? commands[0] : { kind: 'batch', id, label, commands };
}
