import { buildNodeStateMap } from '../../domain/scene/nodeState';
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
import type { TransformHandle, TransformResult } from '../../domain/transforms/types';
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
  transformLabel,
  updateTransformOperation,
  type PixiPointerOperation,
} from '../pixiPointerOperations';
import {
  beginConnectorOperation,
  connectorEditLabel,
  updateConnectorOperation,
} from './v2ConnectorOperations';
import { createConnectorEditCommand } from '../../domain/connectors/editing';
import {
  V2_DEFAULT_SHAPE_SIZE,
  V2_DEFAULT_TEXT_SIZE,
  buildInsertConnectorCommand,
  buildInsertShapeCommand,
  type V2ShapeKind,
} from '../../domain/commands/sceneEdits';
import type { V2Tool } from './V2CreationToolbar';

const CLICK_THRESHOLD_PX = 4;
const MIN_CREATE_SIZE = 8;
const HANDLE_CURSORS: Record<TransformHandle, string> = {
  north: 'ns-resize', south: 'ns-resize', east: 'ew-resize', west: 'ew-resize',
  'north-east': 'nesw-resize', 'south-west': 'nesw-resize',
  'north-west': 'nwse-resize', 'south-east': 'nwse-resize', rotate: 'grab',
};

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
  readonly sourceNodeId: string | null;
  readonly fromWorld: Point2d;
  readonly startScreen: Point2d;
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
  readonly onToolChange: (tool: V2Tool) => void;
  readonly onTransformPreview?: (result: TransformResult | null) => void;
  readonly snapToGrid?: boolean;
  readonly mintId: (prefix: string) => string;
}

// Both React's synthetic event and a native window event, re-targeted at the
// canvas section, satisfy this.
interface PointerLike {
  readonly currentTarget: HTMLElement;
  readonly target: EventTarget | null;
  readonly clientX: number;
  readonly clientY: number;
  readonly pointerId: number;
  readonly altKey: boolean;
}

function localPoint(event: PointerLike): Point2d {
  const bounds = event.currentTarget.getBoundingClientRect();
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
}

function textOrigin(center: Point2d): Point2d {
  return { x: center.x - V2_DEFAULT_TEXT_SIZE.width / 2, y: center.y - V2_DEFAULT_TEXT_SIZE.height / 2 };
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
  // Gestures never depend on pointer capture: Chrome drops mouse capture when
  // a trackpad reports the button up a moment before the pointerup arrives
  // (lostpointercapture ~2 ms early, pointerup lands uncaptured, move lost).
  // Capture is only an optimization; window listeners guarantee completion.
  const windowListenersRef = useRef<(() => void) | null>(null);
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
    optionsRef.current.onTransformPreview?.(null);
  }, []);

  const detachWindow = useCallback(() => {
    windowListenersRef.current?.();
    windowListenersRef.current = null;
  }, []);

  const cancelGesture = useCallback((): boolean => {
    detachWindow();
    if (!operationRef.current) return false;
    operationRef.current = null;
    clearPreviews();
    return true;
  }, [clearPreviews, detachWindow]);
  useEffect(() => detachWindow, [detachWindow]);

  useEffect(() => {
    gestureApiRef.current = { cancelGesture };
  }, [gestureApiRef, cancelGesture]);

  const pointerMove = useCallback(
    (event: PointerLike) => {
      const opts = optionsRef.current;
      const operation = operationRef.current;
      const host = opts.hostRef.current;
      if (!host) return;
      const point = localPoint(event);
      if (!operation) {
        if (opts.toolRef.current === 'select' && event.target instanceof HTMLCanvasElement) {
          const handle = host.pickTransformHandle(point);
          const cursor = handle ? HANDLE_CURSORS[handle] : (host.pickNode(point) ? 'move' : '');
          event.target.style.cursor = cursor;
        }
        return;
      }
      if (operation.pointerId !== event.pointerId) return;
      if (!event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          /* pointer already released */
        }
      }
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
        const distance = Math.hypot(worldPoint.x - operation.start.x, worldPoint.y - operation.start.y)
          * opts.cameraRef.current.zoom;
        if (!operation.result && distance < CLICK_THRESHOLD_PX) return;
        const next = updateTransformOperation(operation, worldPoint, Boolean(opts.snapToGrid) && !event.altKey);
        operationRef.current = next;
        host.setTransformPreview(next.result);
        opts.onTransformPreview?.(next.result);
      } else if (operation.kind === 'create') {
        operationRef.current = { ...operation, currentScreen: point };
        host.setMarquee(boundsBetween(operation.startScreen, point));
      } else if (operation.kind === 'connect') {
        const toWorld = host.screenToWorld(point);
        operationRef.current = { ...operation, toWorld };
        host.setConnectionPreview({ from: operation.fromWorld, to: toWorld });
      } else if (operation.kind === 'connector-edit') {
        const next = updateConnectorOperation(
          operation,
          host.screenToWorld(point),
          operation.handle.kind === 'endpoint' ? host.pickNode(point) : null
        );
        operationRef.current = next;
        host.setConnectorPreview(next.preview);
      } else if (operation.kind === 'marquee') {
        operationRef.current = { ...operation, current: point };
        host.setMarquee(boundsBetween(operation.start, point));
      }
    },
    []
  );

  const pointerUp = useCallback(
    (event: PointerLike) => {
      const opts = optionsRef.current;
      const operation = operationRef.current;
      const host = opts.hostRef.current;
      if (!operation || operation.pointerId !== event.pointerId || !host) return;
      operationRef.current = null;
      detachWindow();
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
        const final = operation.result
          ? updateTransformOperation(operation, host.screenToWorld(point), Boolean(opts.snapToGrid) && !event.altKey)
          : operation;
        host.setTransformPreview(null);
        opts.onTransformPreview?.(null);
        if (final.result) {
          const changed = final.result.nodes.some(
            (node, index) => !areStructurallyEqual(node, operation.snapshot.nodes[index])
          );
          if (changed) {
            opts.commit(
              createTransformCommand(
                operation.page.id,
                operation.snapshot.nodes,
                final.result.nodes,
                transformLabel(operation.transformKind)
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
          const size = operation.shape === 'text' ? V2_DEFAULT_TEXT_SIZE : V2_DEFAULT_SHAPE_SIZE;
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
        opts.onToolChange('select');
        if (operation.shape === 'text') opts.openEditor(id);
      } else if (operation.kind === 'connect') {
        host.setConnectionPreview(null);
        const moved = Math.hypot(
          point.x - operation.startScreen.x,
          point.y - operation.startScreen.y
        );
        const targetId = host.pickNode(point);
        const selfLoop = targetId !== null && targetId === operation.sourceNodeId;
        if (moved >= CLICK_THRESHOLD_PX && !selfLoop) {
          const id = opts.mintId('connector');
          opts.commit(
            buildInsertConnectorCommand(operation.page, {
              id,
              source: operation.sourceNodeId
                ? { nodeId: operation.sourceNodeId }
                : { point: operation.fromWorld },
              target: targetId ? { nodeId: targetId } : { point: host.screenToWorld(point) },
            })
          );
          opts.applySelection(clearSelection());
          opts.applyConnectorSelection(id);
          opts.onToolChange('select');
        }
      } else if (operation.kind === 'connector-edit') {
        const final = updateConnectorOperation(
          operation,
          host.screenToWorld(point),
          operation.handle.kind === 'endpoint' ? host.pickNode(point) : null
        );
        host.setConnectorPreview(null);
        const command = createConnectorEditCommand(
          operation.page.id,
          operation.before,
          final.preview,
          connectorEditLabel(operation.handle)
        );
        if (command) opts.commit(command);
        host.setConnectorSelection(operation.before.id, null);
      }
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        /* already released */
      }
    },
    [detachWindow]
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget && !(event.target instanceof HTMLCanvasElement)) return;
      if (operationRef.current) return;
      const opts = optionsRef.current;
      const host = opts.hostRef.current;
      const page = opts.pageRef.current;
      if ((event.button !== 0 && event.button !== 1) || !host || !page) return;
      event.preventDefault();
      const section = event.currentTarget;
      section.focus({ preventScroll: true });
      try {
        section.setPointerCapture(event.pointerId);
      } catch {
        /* pointer already released */
      }
      detachWindow();
      const retarget = (native: PointerEvent): PointerLike => ({
        currentTarget: section, target: native.target, clientX: native.clientX,
        clientY: native.clientY, pointerId: native.pointerId, altKey: native.altKey,
      });
      const onWindowMove = (native: PointerEvent) => {
        if (!operationRef.current || section.contains(native.target as Node)) return;
        pointerMove(retarget(native));
      };
      const onWindowUp = (native: PointerEvent) => {
        if (operationRef.current) pointerUp(retarget(native));
      };
      window.addEventListener('pointermove', onWindowMove);
      window.addEventListener('pointerup', onWindowUp);
      windowListenersRef.current = () => {
        window.removeEventListener('pointermove', onWindowMove);
        window.removeEventListener('pointerup', onWindowUp);
      };
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
        // Starts anywhere: over a shape binds that end, empty canvas leaves
        // it free (ADR-001), like Excalidraw and tldraw arrows.
        const nodeId = host.pickNode(point);
        const world = host.screenToWorld(point);
        operationRef.current = {
          kind: 'connect',
          pointerId: event.pointerId,
          page,
          sourceNodeId: nodeId,
          fromWorld: (nodeId && nodeCenterWorld(page, nodeId)) || world,
          startScreen: point,
          toWorld: world,
        };
        return;
      }
      const additive = event.shiftKey || event.metaKey || event.ctrlKey;
      const selectedConnectorId = host.getSelectedConnectorId();
      const selectedConnector = selectedConnectorId
        ? page.connectors.find(({ id }) => id === selectedConnectorId) ?? null
        : null;
      const connectorHandle = selectedConnector ? host.pickConnectorHandle(point) : null;
      if (selectedConnector && connectorHandle && !additive) {
        host.setConnectorSelection(selectedConnector.id, connectorHandle);
        operationRef.current = beginConnectorOperation(
          event.pointerId, page, selectedConnector, connectorHandle
        );
        return;
      }
      const states = buildNodeStateMap(page);
      const canTransform = opts.selectionRef.current.nodeIds.every((id) => !states.get(id)?.locked);
      const connectSide = host.pickConnectHandle(point);
      const primary = opts.selectionRef.current.primaryNodeId;
      if (connectSide && primary && !additive && canTransform) {
        operationRef.current = { kind: 'connect', pointerId: event.pointerId, page,
          sourceNodeId: primary, fromWorld: nodeCenterWorld(page, primary)!,
          startScreen: point, toWorld: host.screenToWorld(point) };
        return;
      }
      const handle = canTransform ? host.pickTransformHandle(point) : null;
      if (handle && !additive && opts.selectionRef.current.nodeIds.length > 0) {
        operationRef.current = beginTransformOperation(event.pointerId, page,
          opts.selectionRef.current.nodeIds, handle, host.screenToWorld(point));
        return;
      }
      const nodeId = host.pickNode(point);
      if (nodeId && !additive) {
        if (!opts.selectionRef.current.nodeIds.includes(nodeId)) {
          opts.applyConnectorSelection(null);
          opts.applySelection(replaceSelection([nodeId]));
        }
        if (opts.selectionRef.current.nodeIds.some((id) => states.get(id)?.locked)) return;
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
        opts.applySelection(clearSelection());
        opts.applyConnectorSelection(connectorId);
        operationRef.current = null;
        detachWindow();
        try {
          section.releasePointerCapture(event.pointerId);
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
    [detachWindow, pointerMove, pointerUp]
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => pointerMove(event),
    [pointerMove]
  );
  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => pointerUp(event),
    [pointerUp]
  );

  const handlePointerCancel = useCallback(() => {
    cancelGesture();
  }, [cancelGesture]);

  const handleDoubleClick = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget && !(event.target instanceof HTMLCanvasElement)) return;
      const opts = optionsRef.current;
      const host = opts.hostRef.current;
      if (!host || opts.toolRef.current !== 'select' || opts.readOnlyRef.current) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      const point = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      const nodeId = host.pickNode(point);
      if (nodeId) {
        opts.openEditor(nodeId);
        return;
      }
      const page = opts.pageRef.current;
      if (!page || host.pickConnector(point)) return;
      const id = opts.mintId('node');
      opts.commit(buildInsertShapeCommand(page, { kind: 'text', id, at: textOrigin(host.screenToWorld(point)) }));
      opts.applyConnectorSelection(null);
      opts.applySelection(replaceSelection([id]));
      opts.openEditor(id);
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
