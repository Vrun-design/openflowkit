import {
  useCallback,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from 'react';
import type { DocumentCommand } from '../../domain/commands/types';
import type { ScenePage } from '../../domain/document/types';
import type { CanvasCamera } from '../../domain/camera/types';
import type { Bounds2d, Point2d } from '../../domain/geometry/types';
import { panCamera } from '../../domain/camera/camera';
import { areStructurallyEqual } from '../../domain/commands/equality';
import {
  addToSelection,
  clearSelection,
  replaceSelection,
  type CanvasSelection,
} from '../../application/selection/selection';
import { createTransformCommand } from '../../domain/transforms/transformSelection';
import type { PixiRendererHost } from '../../infrastructure/pixi/PixiRendererHost';
// Adoption allowlist (move in V2-05/V2-06): store-free pointer math shared
// with the spike page. v2 owns the state machine; these own the geometry.
import {
  beginTransformOperation,
  boundsBetween,
  selectionAfterClick,
  updateTransformOperation,
  type PixiPointerOperation,
} from '../pixiPointerOperations';
import {
  buildInsertBoundConnectorCommand,
  buildInsertShapeCommand,
  type V2ShapeKind,
} from './v2EditCommands';
import type { V2Tool } from './V2CreationToolbar';

const CLICK_THRESHOLD_PX = 4;
const MIN_CREATE_SIZE = 8;

interface V2CreateOperation {
  readonly kind: 'create';
  readonly pointerId: number;
  readonly shape: V2ShapeKind;
  readonly page: ScenePage;
  readonly startWorld: Point2d;
  readonly startScreen: Point2d;
  readonly currentScreen: Point2d;
}

interface V2ConnectOperation {
  readonly kind: 'connect';
  readonly pointerId: number;
  readonly page: ScenePage;
  readonly sourceNodeId: string;
  readonly fromWorld: Point2d;
  readonly toWorld: Point2d;
}

type V2Operation = PixiPointerOperation | V2CreateOperation | V2ConnectOperation;

export interface V2GestureApi {
  readonly cancelGesture: () => boolean;
}

interface V2PointerOptions {
  readonly hostRef: RefObject<PixiRendererHost | null>;
  readonly cameraRef: RefObject<CanvasCamera>;
  readonly pageRef: RefObject<ScenePage | null>;
  readonly selectionRef: RefObject<CanvasSelection>;
  readonly toolRef: RefObject<V2Tool>;
  readonly spacePanRef: RefObject<boolean>;
  readonly readOnlyRef: RefObject<boolean>;
  readonly gestureApiRef: RefObject<V2GestureApi | null>;
  readonly commit: (command: DocumentCommand) => void;
  readonly applySelection: (selection: CanvasSelection) => void;
  readonly applyConnectorSelection: (connectorId: string | null) => void;
  readonly updateCamera: (camera: CanvasCamera) => void;
  readonly openEditor: (nodeId: string) => void;
  readonly mintId: (prefix: string) => string;
}

function localPoint(event: ReactPointerEvent<HTMLElement>): Point2d {
  const bounds = event.currentTarget.getBoundingClientRect();
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
}

function nodeCenterWorld(page: ScenePage, nodeId: string): Point2d | null {
  const node = page.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return null;
  return {
    x: node.transform.translation.x + node.size.width / 2,
    y: node.transform.translation.y + node.size.height / 2,
  };
}

export function useV2Pointer(options: V2PointerOptions) {
  const operationRef = useRef<V2Operation | null>(null);
  const optionsRef = useRef(options);
  const { gestureApiRef } = options;
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);
  const clearPreviews = useCallback(() => {
    const host = optionsRef.current.hostRef.current;
    host?.setMarquee(null);
    host?.setTransformPreview(null);
    host?.setConnectionPreview(null);
  }, []);

  const cancelGesture = useCallback((): boolean => {
    if (!operationRef.current) return false;
    operationRef.current = null;
    clearPreviews();
    return true;
  }, [clearPreviews]);

  useEffect(() => {
    gestureApiRef.current = { cancelGesture };
  }, [gestureApiRef, cancelGesture]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const opts = optionsRef.current;
      const host = opts.hostRef.current;
      const page = opts.pageRef.current;
      if ((event.button !== 0 && event.button !== 1) || !host || !page) return;
      event.currentTarget.focus();
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* pointer already released */
      }
      const point = localPoint(event);
      const tool = opts.toolRef.current;
      if (tool === 'hand' || opts.spacePanRef.current || event.button === 1) {
        operationRef.current = { kind: 'pan', pointerId: event.pointerId, last: point };
        return;
      }
      if (opts.readOnlyRef.current) {
        operationRef.current = {
          kind: 'marquee',
          pointerId: event.pointerId,
          start: point,
          current: point,
          additive: false,
        };
        return;
      }
      if (tool === 'rectangle' || tool === 'ellipse' || tool === 'text') {
        const shape: V2ShapeKind = tool;
        const world = host.screenToWorld(point);
        operationRef.current = {
          kind: 'create',
          pointerId: event.pointerId,
          shape,
          page,
          startWorld: world,
          startScreen: point,
          currentScreen: point,
        };
        host.setMarquee(boundsBetween(point, point));
        return;
      }
      if (tool === 'connector') {
        const nodeId = host.pickNode(point);
        if (!nodeId) return;
        const from = nodeCenterWorld(page, nodeId) ?? host.screenToWorld(point);
        operationRef.current = {
          kind: 'connect',
          pointerId: event.pointerId,
          page,
          sourceNodeId: nodeId,
          fromWorld: from,
          toWorld: host.screenToWorld(point),
        };
        return;
      }
      const additive = event.shiftKey || event.metaKey || event.ctrlKey;
      const nodeId = host.pickNode(point);
      if (nodeId && !additive) {
        if (!opts.selectionRef.current.nodeIds.includes(nodeId)) {
          opts.applyConnectorSelection(null);
          opts.applySelection(replaceSelection([nodeId]));
        }
        operationRef.current = beginTransformOperation(
          event.pointerId,
          page,
          opts.selectionRef.current.nodeIds,
          null,
          host.screenToWorld(point)
        );
        return;
      }
      const connectorId = host.pickConnector(point);
      if (connectorId && !nodeId) {
        opts.applyConnectorSelection(connectorId);
        operationRef.current = null;
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
          /* already released */
        }
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
    []
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const opts = optionsRef.current;
      const operation = operationRef.current;
      const host = opts.hostRef.current;
      if (!operation || operation.pointerId !== event.pointerId || !host) return;
      const point = localPoint(event);
      if (operation.kind === 'pan') {
        opts.updateCamera(
          panCamera(opts.cameraRef.current, {
            x: point.x - operation.last.x,
            y: point.y - operation.last.y,
          })
        );
        operationRef.current = { ...operation, last: point };
      } else if (operation.kind === 'transform') {
        const worldPoint = host.screenToWorld(point);
        const next = updateTransformOperation(operation, worldPoint, !event.altKey);
        operationRef.current = next;
        host.setTransformPreview(next.result);
      } else if (operation.kind === 'create') {
        operationRef.current = { ...operation, currentScreen: point };
        host.setMarquee(boundsBetween(operation.startScreen, point));
      } else if (operation.kind === 'connect') {
        const toWorld = host.screenToWorld(point);
        operationRef.current = { ...operation, toWorld };
        host.setConnectionPreview({ from: operation.fromWorld, to: toWorld });
      } else if (operation.kind === 'marquee') {
        operationRef.current = { ...operation, current: point };
        host.setMarquee(boundsBetween(operation.start, point));
      }
    },
    []
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const opts = optionsRef.current;
      const operation = operationRef.current;
      const host = opts.hostRef.current;
      if (!operation || operation.pointerId !== event.pointerId || !host) return;
      operationRef.current = null;
      const point = localPoint(event);
      if (operation.kind === 'marquee') {
        const bounds: Bounds2d = boundsBetween(operation.start, point);
        const moved = Math.hypot(point.x - operation.start.x, point.y - operation.start.y);
        host.setMarquee(null);
        if (moved >= CLICK_THRESHOLD_PX) {
          const ids = host.pickNodesInScreenBounds(bounds);
          if (ids.length > 0 || !operation.additive) opts.applyConnectorSelection(null);
          opts.applySelection(
            operation.additive
              ? addToSelection(opts.selectionRef.current, ids)
              : replaceSelection(ids)
          );
        } else {
          const nodeId = host.pickNode(point);
          const connectorId = nodeId ? null : host.pickConnector(point);
          if (connectorId) {
            opts.applySelection(clearSelection());
            opts.applyConnectorSelection(connectorId);
          } else {
            if (nodeId || !operation.additive) opts.applyConnectorSelection(null);
            opts.applySelection(
              selectionAfterClick(opts.selectionRef.current, nodeId, operation.additive)
            );
          }
        }
      } else if (operation.kind === 'transform') {
        host.setTransformPreview(null);
        if (operation.result) {
          const changed = operation.result.nodes.some(
            (node, index) => !areStructurallyEqual(node, operation.snapshot.nodes[index])
          );
          if (changed) {
            opts.commit(
              createTransformCommand(
                operation.page.id,
                operation.snapshot.nodes,
                operation.result.nodes,
                'Move selection'
              )
            );
          }
        }
      } else if (operation.kind === 'create') {
        host.setMarquee(null);
        const world = host.screenToWorld(point);
        const moved = Math.hypot(
          point.x - operation.startScreen.x,
          point.y - operation.startScreen.y
        );
        const id = opts.mintId('node');
        if (moved < CLICK_THRESHOLD_PX) {
          const size =
            operation.shape === 'text'
              ? { width: 160, height: 48 }
              : { width: 160, height: 72 };
          opts.commit(
            buildInsertShapeCommand(operation.page, {
              kind: operation.shape,
              id,
              at: { x: world.x - size.width / 2, y: world.y - size.height / 2 },
              size,
            })
          );
        } else {
          const width = Math.max(MIN_CREATE_SIZE, Math.abs(world.x - operation.startWorld.x));
          const height = Math.max(MIN_CREATE_SIZE, Math.abs(world.y - operation.startWorld.y));
          opts.commit(
            buildInsertShapeCommand(operation.page, {
              kind: operation.shape,
              id,
              at: {
                x: Math.min(world.x, operation.startWorld.x),
                y: Math.min(world.y, operation.startWorld.y),
              },
              size: { width, height },
            })
          );
        }
        opts.applyConnectorSelection(null);
        opts.applySelection(replaceSelection([id]));
      } else if (operation.kind === 'connect') {
        host.setConnectionPreview(null);
        const targetId = host.pickNode(point);
        if (targetId && targetId !== operation.sourceNodeId) {
          const id = opts.mintId('connector');
          opts.commit(
            buildInsertBoundConnectorCommand(operation.page, {
              id,
              sourceNodeId: operation.sourceNodeId,
              targetNodeId: targetId,
            })
          );
          opts.applySelection(clearSelection());
          opts.applyConnectorSelection(id);
        }
      }
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        /* already released */
      }
    },
    []
  );

  const handlePointerCancel = useCallback(() => {
    operationRef.current = null;
    clearPreviews();
  }, [clearPreviews]);

  const handleDoubleClick = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      const opts = optionsRef.current;
      const host = opts.hostRef.current;
      if (!host || opts.toolRef.current !== 'select' || opts.readOnlyRef.current) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      const point = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      const nodeId = host.pickNode(point);
      if (nodeId) opts.openEditor(nodeId);
    },
    []
  );

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleDoubleClick,
    cancelGesture,
  };
}
