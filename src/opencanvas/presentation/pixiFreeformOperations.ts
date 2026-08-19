import type { SceneNode } from '../domain/document/types';
import type { Point2d } from '../domain/geometry/types';
import type { ProductionFreeformKind } from '../application/active-document/productionNodeBridge';

export type DrawingTool = Extract<ProductionFreeformKind, 'pen' | 'highlighter' | 'line' | 'arrow'>;

export interface FreeformPointerOperation {
  readonly kind: 'freeform';
  readonly pointerId: number;
  readonly tool: DrawingTool;
  readonly points: readonly Point2d[];
}

export function beginFreeformOperation(pointerId: number, tool: DrawingTool, point: Point2d): FreeformPointerOperation {
  return { kind: 'freeform', pointerId, tool, points: [point] };
}

export function updateFreeformOperation(
  operation: FreeformPointerOperation, points: readonly Point2d[]
): FreeformPointerOperation {
  const appended = operation.tool === 'line' || operation.tool === 'arrow'
    ? [operation.points[0], points.at(-1) ?? operation.points[0]]
    : [...operation.points, ...points].slice(0, 4096);
  return { ...operation, points: appended };
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
  return {
    id, kind: operation.tool, parentId: null, layerId, zIndex: 0,
    transform: { translation: { x: minX, y: minY }, rotationRadians: 0, scale: { x: 1, y: 1 } },
    size: { width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) },
    content: { points, strokeColor: operation.tool === 'highlighter' ? '#fde047' : '#334155',
      strokeWidth: operation.tool === 'highlighter' ? 16 : 3,
      transparency: operation.tool === 'highlighter' ? 0.45 : 1 },
    appearance: {}, ports: [], metadata: {}, extensions: {},
  };
}
