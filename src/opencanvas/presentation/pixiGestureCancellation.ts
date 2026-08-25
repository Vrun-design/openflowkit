import type { CameraPanGesture } from '../application/renderer/readOnlyCameraInteraction';
import type { ConnectorPointerOperation } from './pixiConnectorOperations';
import type { FreeformPointerOperation } from './pixiFreeformOperations';
import type {
  AnchoredMarqueePointerOperation,
  TransformPointerOperation,
} from './pixiPointerOperations';

export type ProductionCanvasPointerOperation =
  | {
      readonly kind: 'camera';
      readonly gesture: CameraPanGesture;
      readonly selectOnClick: boolean;
    }
  | TransformPointerOperation
  | ConnectorPointerOperation
  | FreeformPointerOperation
  | AnchoredMarqueePointerOperation;

export interface GesturePreviewPort {
  readonly setTransformPreview: (result: null) => void;
  readonly setConnectorPreview: (connector: null) => void;
  readonly setFreeformPreview: (frame: null) => void;
  readonly setMarquee: (bounds: null) => void;
}

export interface PointerCapturePort {
  readonly hasPointerCapture: (pointerId: number) => boolean;
  readonly releasePointerCapture: (pointerId: number) => void;
}

export function operationPointerId(operation: ProductionCanvasPointerOperation): number {
  return operation.kind === 'camera' ? operation.gesture.pointerId : operation.pointerId;
}

export function cancelProductionCanvasGesture(
  operation: ProductionCanvasPointerOperation | null,
  preview: GesturePreviewPort | null,
  capture: PointerCapturePort | null = null
): boolean {
  if (!operation) return false;
  if (operation.kind === 'transform') preview?.setTransformPreview(null);
  if (operation.kind === 'connector-edit') preview?.setConnectorPreview(null);
  if (operation.kind === 'freeform') preview?.setFreeformPreview(null);
  if (operation.kind === 'marquee') preview?.setMarquee(null);
  const pointerId = operationPointerId(operation);
  if (capture?.hasPointerCapture(pointerId)) capture.releasePointerCapture(pointerId);
  return true;
}
