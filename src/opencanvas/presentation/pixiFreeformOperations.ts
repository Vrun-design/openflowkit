import type { SceneNode } from '../domain/document/types';
import type { Point2d } from '../domain/geometry/types';
import { normalizeStrokeInput, type StrokeInput } from '../domain/nodes/strokeInput';
import type { ProductionFreeformKind } from '../application/active-document/productionNodeBridge';

export type DrawingTool = Extract<ProductionFreeformKind, 'pen' | 'highlighter' | 'line' | 'arrow'>;

export function freeformPreviewStyle(tool: DrawingTool): {
  readonly color: number;
  readonly width: number;
  readonly alpha: number;
} {
  return tool === 'highlighter'
    ? { color: 0xfde047, width: 16, alpha: 0.45 }
    : { color: 0x334155, width: 3, alpha: 1 };
}

export interface FreeformPointerOperation {
  readonly kind: 'freeform';
  readonly pointerId: number;
  readonly tool: DrawingTool;
  readonly points: readonly FreeformPoint[];
}

export interface FreeformPoint extends Point2d {
  readonly input?: StrokeInput;
}

export function beginFreeformOperation(
  pointerId: number,
  tool: DrawingTool,
  point: FreeformPoint
): FreeformPointerOperation {
  return { kind: 'freeform', pointerId, tool, points: [point] };
}

export function updateFreeformOperation(
  operation: FreeformPointerOperation, points: readonly FreeformPoint[]
): FreeformPointerOperation {
  const appended = operation.tool === 'line' || operation.tool === 'arrow'
    ? [operation.points[0], points.at(-1) ?? operation.points[0]]
    : [...operation.points, ...points.slice(0, Math.max(0, 4096 - operation.points.length))];
  return { ...operation, points: appended };
}

export function updateFreeformEdgeScrollOperation(
  operation: FreeformPointerOperation,
  point: Point2d
): FreeformPointerOperation {
  const input = operation.points.at(-1)?.input;
  return updateFreeformOperation(operation, [{ ...point, ...(input ? { input } : {}) }]);
}

export function freeformPreviewPoints(
  operation: FreeformPointerOperation,
  predicted: readonly FreeformPoint[]
): {
  readonly confirmed: readonly FreeformPoint[];
  readonly predicted: readonly FreeformPoint[];
  readonly predictionOrigin?: FreeformPoint;
} {
  if (operation.tool === 'line' || operation.tool === 'arrow') {
    const start = operation.points[0];
    const confirmedEnd = operation.points.at(-1);
    const predictedEnd = predicted.at(-1);
    return {
      confirmed: start && confirmedEnd ? [start, confirmedEnd] : operation.points,
      predicted: predictedEnd ? [predictedEnd] : [],
      predictionOrigin: start,
    };
  }
  return { confirmed: operation.points, predicted };
}

export function finishFreeformOperation(
  operation: FreeformPointerOperation, id: string, layerId: string
): SceneNode | null {
  if (operation.points.length < 2) return null;
  const minX = Math.min(...operation.points.map(({ x }) => x));
  const minY = Math.min(...operation.points.map(({ y }) => y));
  const maxX = Math.max(...operation.points.map(({ x }) => x));
  const maxY = Math.max(...operation.points.map(({ y }) => y));
  if (Math.hypot(maxX - minX, maxY - minY) < 2) return null;
  const points = operation.points.map(({ x, y }) => ({ x: x - minX, y: y - minY }));
  const hasStrokeInput = (operation.tool === 'pen' || operation.tool === 'highlighter')
    && operation.points.some((point) => point.input !== undefined);
  const inputSamples = hasStrokeInput
    ? operation.points.map((point) => point.input ?? normalizeStrokeInput({}))
    : undefined;
  return {
    id, kind: operation.tool, parentId: null, layerId, zIndex: 0,
    transform: { translation: { x: minX, y: minY }, rotationRadians: 0, scale: { x: 1, y: 1 } },
    size: { width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) },
    content: { points, strokeColor: operation.tool === 'highlighter' ? '#fde047' : '#334155',
      strokeWidth: operation.tool === 'highlighter' ? 16 : 3,
      transparency: operation.tool === 'highlighter' ? 0.45 : 1,
      ...(inputSamples ? { inputSamples } : {}) },
    appearance: {}, ports: [], metadata: {}, extensions: {},
  };
}
