import {
  useCallback,
  type MouseEventHandler,
  type PointerEvent,
  type PointerEventHandler,
  type RefObject,
} from 'react';
import type { DocumentHistoryState } from '../application/history/types';
import {
  addToSelection,
  replaceSelection,
  type CanvasSelection,
} from '../application/selection/selection';
import { panCamera } from '../domain/camera/camera';
import type { CanvasCamera } from '../domain/camera/types';
import type { ConnectorEditHandle } from '../domain/connectors/editing';
import type { SceneConnector, ScenePage } from '../domain/document/types';
import type { TransformResult, TransformSnapshot } from '../domain/transforms/types';
import type { PixiRendererHost } from '../infrastructure/pixi/PixiRendererHost';
import {
  beginConnectorOperation,
  connectorEditLabel,
  updateConnectorOperation,
} from './pixiConnectorOperations';
import {
  beginTransformOperation,
  boundsBetween,
  selectionAfterClick,
  transformLabel,
  updateTransformOperation,
  type PixiPointerOperation,
} from './pixiPointerOperations';
import type { CanvasMode } from './PixiSpikeControls';

interface PointerHandlerOptions {
  readonly mode: CanvasMode;
  readonly hostRef: RefObject<PixiRendererHost | null>;
  readonly operationRef: RefObject<PixiPointerOperation | null>;
  readonly cameraRef: RefObject<CanvasCamera>;
  readonly historyRef: RefObject<DocumentHistoryState>;
  readonly selectionRef: RefObject<CanvasSelection>;
  readonly currentConnector: () => SceneConnector | null;
  readonly applyConnectorSelection: (
    connectorId: string | null,
    handle?: ConnectorEditHandle | null
  ) => void;
  readonly applySelection: (selection: CanvasSelection) => void;
  readonly updateCamera: (camera: CanvasCamera) => void;
  readonly commitTransform: (
    page: ScenePage,
    snapshot: TransformSnapshot,
    result: TransformResult,
    label: string
  ) => void;
  readonly commitConnector: (
    page: ScenePage,
    before: SceneConnector,
    after: SceneConnector,
    label: string
  ) => void;
  readonly addBend: (connectorId: string | null, point?: { x: number; y: number }) => void;
  readonly openEditor: (nodeId: string) => void;
}

function localPoint(event: PointerEvent<HTMLElement>): { x: number; y: number } {
  const bounds = event.currentTarget.getBoundingClientRect();
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
}

export function usePixiPointerHandlers(options: PointerHandlerOptions) {
  const operationRef = options.operationRef;
  const handlePointerDown = useCallback<PointerEventHandler<HTMLElement>>(
    (event) => {
      if ((event.button !== 0 && event.button !== 1) || !options.hostRef.current) return;
      event.currentTarget.focus();
      event.currentTarget.setPointerCapture(event.pointerId);
      const point = localPoint(event);
      if (options.mode === 'pan' || event.button === 1) {
        operationRef.current = { kind: 'pan', pointerId: event.pointerId, last: point };
        return;
      }
      const host = options.hostRef.current;
      const connectorHandle = host.pickConnectorHandle(point);
      const selectedConnector = options.currentConnector();
      if (connectorHandle && selectedConnector) {
        options.applyConnectorSelection(selectedConnector.id, connectorHandle);
        operationRef.current = beginConnectorOperation(
          event.pointerId,
          options.historyRef.current.present.pages[0],
          selectedConnector,
          connectorHandle
        );
        return;
      }
      const additive = event.shiftKey || event.metaKey || event.ctrlKey;
      const transformHandle = host.pickTransformHandle(point);
      const nodeId = host.pickNode(point);
      if (transformHandle || (nodeId && !additive)) {
        if (nodeId && !options.selectionRef.current.nodeIds.includes(nodeId)) {
          options.applyConnectorSelection(null);
          options.applySelection(replaceSelection([nodeId]));
        }
        operationRef.current = beginTransformOperation(
          event.pointerId,
          options.historyRef.current.present.pages[0],
          options.selectionRef.current.nodeIds,
          transformHandle,
          host.screenToWorld(point)
        );
        return;
      }
      const connectorId = host.pickConnector(point);
      if (connectorId) {
        options.applyConnectorSelection(connectorId);
        operationRef.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
        return;
      }
      operationRef.current = {
        kind: 'marquee',
        pointerId: event.pointerId,
        start: point,
        current: point,
        additive,
      };
    },
    [operationRef, options]
  );

  const handlePointerMove = useCallback<PointerEventHandler<HTMLElement>>(
    (event) => {
      const operation = operationRef.current;
      if (!operation || operation.pointerId !== event.pointerId) return;
      const point = localPoint(event);
      if (operation.kind === 'pan') {
        options.updateCamera(
          panCamera(options.cameraRef.current, {
            x: point.x - operation.last.x,
            y: point.y - operation.last.y,
          })
        );
        operationRef.current = { ...operation, last: point };
      } else if (operation.kind === 'transform') {
        const worldPoint = options.hostRef.current?.screenToWorld(point);
        if (!worldPoint) return;
        const next = updateTransformOperation(operation, worldPoint, !event.altKey);
        operationRef.current = next;
        options.hostRef.current?.setTransformPreview(next.result);
      } else if (operation.kind === 'connector-edit') {
        const host = options.hostRef.current;
        if (!host) return;
        const next = updateConnectorOperation(
          operation,
          host.screenToWorld(point),
          operation.handle.kind === 'endpoint' ? host.pickNode(point) : null
        );
        operationRef.current = next;
        host.setConnectorPreview(next.preview);
      } else {
        operationRef.current = { ...operation, current: point };
        options.hostRef.current?.setMarquee(boundsBetween(operation.start, point));
      }
    },
    [operationRef, options]
  );

  const handlePointerUp = useCallback<PointerEventHandler<HTMLElement>>(
    (event) => {
      const operation = operationRef.current;
      const host = options.hostRef.current;
      if (!operation || operation.pointerId !== event.pointerId || !host) return;
      if (operation.kind === 'marquee') {
        const point = localPoint(event);
        const bounds = boundsBetween(operation.start, point);
        const moved = Math.hypot(point.x - operation.start.x, point.y - operation.start.y);
        host.setMarquee(null);
        if (moved >= 4) {
          const ids = host.pickNodesInScreenBounds(bounds);
          if (ids.length > 0 || !operation.additive) options.applyConnectorSelection(null);
          options.applySelection(
            operation.additive
              ? addToSelection(options.selectionRef.current, ids)
              : replaceSelection(ids)
          );
        } else {
          const nodeId = host.pickNode(point);
          const connectorId = nodeId ? null : host.pickConnector(point);
          if (connectorId) options.applyConnectorSelection(connectorId);
          else {
            if (nodeId || !operation.additive) options.applyConnectorSelection(null);
            options.applySelection(
              selectionAfterClick(options.selectionRef.current, nodeId, operation.additive)
            );
          }
        }
      } else if (operation.kind === 'transform') {
        host.setTransformPreview(null);
        if (operation.result) {
          options.commitTransform(
            operation.page,
            operation.snapshot,
            operation.result,
            transformLabel(operation.transformKind)
          );
        }
      } else if (operation.kind === 'connector-edit') {
        host.setConnectorPreview(null);
        options.commitConnector(
          operation.page,
          operation.before,
          operation.preview,
          connectorEditLabel(operation.handle)
        );
      }
      operationRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    },
    [operationRef, options]
  );

  const handleDoubleClick = useCallback<MouseEventHandler<HTMLElement>>(
    (event) => {
      const host = options.hostRef.current;
      if (!host || options.mode !== 'select') return;
      const bounds = event.currentTarget.getBoundingClientRect();
      const point = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      const nodeId = host.pickNode(point);
      if (nodeId) options.openEditor(nodeId);
      else {
        const connectorId = host.pickConnector(point);
        if (connectorId) options.addBend(connectorId, host.screenToWorld(point));
      }
    },
    [options]
  );

  return { handlePointerDown, handlePointerMove, handlePointerUp, handleDoubleClick };
}
