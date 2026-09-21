// Pointer-operation helpers shared by the v2 editor and (until V2-15) legacy surfaces.
// Pure: selection math, marquee bounds, transform begin/update. Legacy may import; v2 never imports legacy.
import {
  clearSelection,
  replaceSelection,
  toggleSelection,
  type CanvasSelection,
} from '../../application/selection/selection';
import type { ScenePage } from '../../domain/document/types';
import { createBounds2d } from '../../domain/geometry/bounds';
import { buildNodeWorldMatrices, nodeWorldBounds } from '../../domain/scene/worldGeometry';
import type { Bounds2d, Point2d } from '../../domain/geometry/types';
import {
  createTransformSnapshot,
  moveTransform,
  resizeTransform,
  rotateTransform,
} from '../../domain/transforms/transformSelection';
import type {
  TransformHandle,
  TransformResult,
  TransformSnapshot,
} from '../../domain/transforms/types';
import type { V2ConnectorOperation } from './v2ConnectorOperations';
import type { CanvasCamera } from '../../domain/camera/types';
import { worldToScreen } from '../../domain/camera/camera';

export type PixiPointerOperation =
  | { kind: 'pan'; pointerId: number; last: Point2d }
  | { kind: 'marquee'; pointerId: number; start: Point2d; current: Point2d; additive: boolean }
  | V2ConnectorOperation
  | TransformPointerOperation;

export interface TransformPointerOperation {
  readonly kind: 'transform';
  readonly pointerId: number;
  readonly transformKind: 'move' | 'resize' | 'rotate';
  readonly handle: TransformHandle | null;
  readonly start: Point2d;
  readonly snapshot: TransformSnapshot;
  readonly page: ScenePage;
  /** World bounds of every non-selected node, computed once per drag (O(n) at begin). */
  readonly others: readonly Bounds2d[];
  readonly result: TransformResult | null;
}

export interface AnchoredMarqueePointerOperation {
  readonly kind: 'marquee';
  readonly pointerId: number;
  readonly startScreen: Point2d;
  readonly startWorld: Point2d;
  readonly currentScreen: Point2d;
  readonly additive: boolean;
}

export function boundsBetween(start: Point2d, end: Point2d): Bounds2d {
  return createBounds2d(
    Math.min(start.x, end.x),
    Math.min(start.y, end.y),
    Math.abs(end.x - start.x),
    Math.abs(end.y - start.y)
  );
}

export function anchoredMarqueeBounds(
  operation: AnchoredMarqueePointerOperation,
  camera: CanvasCamera
): Bounds2d {
  return boundsBetween(worldToScreen(camera, operation.startWorld), operation.currentScreen);
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

export function selectionStatus(selection: CanvasSelection, mode: 'select' | 'pan'): string {
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
  const selected = new Set(nodeIds);
  const matrices = buildNodeWorldMatrices(page);
  // ponytail: every other node is a snap candidate; cull to the viewport if pages get huge.
  const others = page.nodes
    .filter((node) => !selected.has(node.id))
    .map((node) => nodeWorldBounds(node, matrices.get(node.id)!));
  return {
    kind: 'transform',
    pointerId,
    transformKind: handle === 'rotate' ? 'rotate' : handle ? 'resize' : 'move',
    handle,
    start,
    snapshot: createTransformSnapshot(page, nodeIds),
    page,
    others,
    result: null,
  };
}

// Figma/tldraw modifier set: ⌘ suspends snapping, ⇧ locks aspect (resize)
// or steps rotation by 15°, ⌥ resizes from the centre.
export interface TransformModifiers {
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
}

export const NO_MODIFIERS: TransformModifiers = { shiftKey: false, altKey: false, metaKey: false };

/** `objectThreshold` in world units enables object snapping for moves; omit for grid only. */
export function updateTransformOperation(
  operation: TransformPointerOperation,
  pointer: Point2d,
  snapToGrid: boolean,
  objectThreshold?: number,
  modifiers: TransformModifiers = NO_MODIFIERS
): TransformPointerOperation {
  const snap = snapToGrid && !modifiers.metaKey;
  let result: TransformResult;
  switch (operation.transformKind) {
    case 'move':
      result = moveTransform(
        operation.snapshot,
        { x: pointer.x - operation.start.x, y: pointer.y - operation.start.y },
        objectThreshold === undefined || modifiers.metaKey
          ? { snap }
          : { snap, objects: operation.others, objectThreshold }
      );
      break;
    case 'resize':
      result = resizeTransform(operation.snapshot, {
        handle: operation.handle as Exclude<TransformHandle, 'rotate'>,
        pointer,
        snap,
        keepAspect: modifiers.shiftKey,
        fromCenter: modifiers.altKey,
      });
      break;
    case 'rotate':
      result = rotateTransform(operation.page, operation.snapshot, operation.start, pointer, modifiers.shiftKey);
      break;
  }
  return { ...operation, result };
}
