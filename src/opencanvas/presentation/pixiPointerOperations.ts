import {
  clearSelection,
  replaceSelection,
  toggleSelection,
  type CanvasSelection,
} from '../application/selection/selection';
import type { ScenePage } from '../domain/document/types';
import { createBounds2d } from '../domain/geometry/bounds';
import type { Bounds2d, Point2d } from '../domain/geometry/types';
import {
  createTransformSnapshot,
  moveTransform,
  resizeTransform,
  rotateTransform,
} from '../domain/transforms/transformSelection';
import type {
  TransformHandle,
  TransformResult,
  TransformSnapshot,
} from '../domain/transforms/types';
import type { CanvasMode } from './PixiSpikeControls';
import type { ConnectorPointerOperation } from './pixiConnectorOperations';

export type PixiPointerOperation =
  | { kind: 'pan'; pointerId: number; last: Point2d }
  | { kind: 'marquee'; pointerId: number; start: Point2d; current: Point2d; additive: boolean }
  | ConnectorPointerOperation
  | TransformPointerOperation;

export interface TransformPointerOperation {
  readonly kind: 'transform';
  readonly pointerId: number;
  readonly transformKind: 'move' | 'resize' | 'rotate';
  readonly handle: TransformHandle | null;
  readonly start: Point2d;
  readonly snapshot: TransformSnapshot;
  readonly page: ScenePage;
  readonly result: TransformResult | null;
}

export function boundsBetween(start: Point2d, end: Point2d): Bounds2d {
  return createBounds2d(
    Math.min(start.x, end.x),
    Math.min(start.y, end.y),
    Math.abs(end.x - start.x),
    Math.abs(end.y - start.y)
  );
}

export function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

export function selectionAfterClick(
  current: CanvasSelection,
  nodeId: string | null,
  additive: boolean
): CanvasSelection {
  if (!nodeId) return additive ? current : clearSelection();
  return additive ? toggleSelection(current, nodeId) : replaceSelection([nodeId]);
}

export function selectionStatus(selection: CanvasSelection, mode: CanvasMode): string {
  if (selection.nodeIds.length > 0) return `${selection.nodeIds.length} selected`;
  return mode === 'select' ? 'Drag empty space to select' : 'Drag to pan';
}

export function transformLabel(kind: 'move' | 'resize' | 'rotate'): string {
  switch (kind) {
    case 'move':
      return 'Move selection';
    case 'resize':
      return 'Resize selection';
    case 'rotate':
      return 'Rotate selection';
  }
}

export function arrowNudgeDelta(key: string, amount: number): Point2d {
  switch (key) {
    case 'ArrowLeft':
      return { x: -amount, y: 0 };
    case 'ArrowRight':
      return { x: amount, y: 0 };
    case 'ArrowUp':
      return { x: 0, y: -amount };
    case 'ArrowDown':
      return { x: 0, y: amount };
    default:
      return { x: 0, y: 0 };
  }
}

export function beginTransformOperation(
  pointerId: number,
  page: ScenePage,
  nodeIds: readonly string[],
  handle: TransformHandle | null,
  start: Point2d
): TransformPointerOperation {
  return {
    kind: 'transform',
    pointerId,
    transformKind: handle === 'rotate' ? 'rotate' : handle ? 'resize' : 'move',
    handle,
    start,
    snapshot: createTransformSnapshot(page, nodeIds),
    page,
    result: null,
  };
}

export function updateTransformOperation(
  operation: TransformPointerOperation,
  pointer: Point2d,
  snap: boolean
): TransformPointerOperation {
  let result: TransformResult;
  switch (operation.transformKind) {
    case 'move':
      result = moveTransform(
        operation.snapshot,
        { x: pointer.x - operation.start.x, y: pointer.y - operation.start.y },
        { snap }
      );
      break;
    case 'resize':
      result = resizeTransform(operation.snapshot, {
        handle: operation.handle as Exclude<TransformHandle, 'rotate'>,
        pointer,
        snap,
      });
      break;
    case 'rotate':
      result = rotateTransform(operation.page, operation.snapshot, operation.start, pointer, snap);
      break;
  }
  return { ...operation, result };
}
