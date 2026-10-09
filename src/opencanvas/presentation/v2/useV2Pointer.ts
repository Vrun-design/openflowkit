import { buildNodeStateMap } from '../../domain/scene/nodeState';
import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent, type RefObject } from 'react';
import type { Point2d } from '../../domain/geometry/types';
import { panCamera } from '../../domain/camera/camera';
import { clearSelection, replaceSelection } from '../../application/selection/selection';
import { beginTransformOperation, boundsBetween, updateTransformOperation, type TransformModifiers } from './pointerOperations';
import { sideAnchor } from '../../domain/connectors/connectHandles';
import { beginConnectorOperation, updateConnectorOperation } from './v2ConnectorOperations';
import { defaultShapeSize } from '../../domain/nodes/shapeNode';
import { buildInsertShapeCommand, type V2ShapeKind } from '../../domain/commands/sceneEdits';
import { strokeHitBySegment } from '../../domain/nodes/strokeGeometry';
import { buildNodeWorldMatrices } from '../../domain/scene/worldGeometry';
import {
  CLICK_THRESHOLD_PX, OBJECT_SNAP_PX, MIN_CREATE_SIZE, HANDLE_CURSORS, modifiersOf, localPoint,
  latestLocalPoint, textOrigin, nodeCenterWorld, pickHandleNear, connectorPreview, stickyAppearance,
  ERASE_RADIUS_PX, pickChartPoint, inkPreview, retargetSample, strokeWorldPoints,
  finishGesture, type V2Operation, type V2PointerOptions, type PointerLike,
} from './v2PointerGestures';
import { useV2Touch } from './useV2Touch';

export function useV2Pointer(options: V2PointerOptions) {
  const operationRef = useRef<V2Operation | null>(null);
  // One document preview per frame: moves store their latest point, a single
  // rAF computes and previews it. Without this every queued move pays full
  // transform math + a renderer preview and the main thread never catches up.
  const pendingTransformRef = useRef<{
    readonly pointerId: number; readonly world: Point2d; readonly modifiers: TransformModifiers;
  } | null>(null);
  const transformFrameRef = useRef<number | null>(null);
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
    host?.setPlacementGhost(null);
    host?.setTransformPreview(null);
    host?.setAlignmentGuides(null);
    host?.setConnectionPreview(null);
    optionsRef.current.onTransformPreview?.(null);
  }, []);

  const detachWindow = useCallback(() => {
    windowListenersRef.current?.();
    windowListenersRef.current = null;
  }, []);

  const cancelTransformFrame = useCallback(() => {
    if (transformFrameRef.current !== null) cancelAnimationFrame(transformFrameRef.current);
    transformFrameRef.current = null;
    pendingTransformRef.current = null;
  }, []);

  // Drops the drag in flight.
  const abandonOperation = useCallback((): boolean => {
    detachWindow();
    cancelTransformFrame();
    if (!operationRef.current) return false;
    operationRef.current = null;
    clearPreviews();
    return true;
  }, [clearPreviews, detachWindow, cancelTransformFrame]);

  const cancelGesture = useCallback((): boolean => {
    detachWindow();
    cancelTransformFrame();
    return abandonOperation();
  }, [abandonOperation, detachWindow, cancelTransformFrame]);
  useEffect(() => () => {
    detachWindow();
    cancelTransformFrame();
  }, [detachWindow, cancelTransformFrame]);

  useEffect(() => {
    gestureApiRef.current = { cancelGesture };
  }, [gestureApiRef, cancelGesture]);

  const lastPointerTypeRef = useRef<string>('mouse');
  const doubleTapAt = useDoubleTap(optionsRef);
  const { beginTouch, moveTouch, endTouch, resetTouch } = useV2Touch(optionsRef, abandonOperation);

  const applyPendingTransformPreview = useCallback(() => {
    const opts = optionsRef.current;
    const pending = pendingTransformRef.current;
    pendingTransformRef.current = null;
    const operation = operationRef.current;
    const host = opts.hostRef.current;
    if (!pending || !host || !operation || operation.kind !== 'transform'
      || operation.pointerId !== pending.pointerId) return;
    const next = updateTransformOperation(operation, pending.world, Boolean(opts.snapToGrid),
      OBJECT_SNAP_PX / opts.cameraRef.current.zoom, pending.modifiers);
    operationRef.current = next;
    host.setTransformPreview(next.result);
    host.setAlignmentGuides(
      next.result?.guideX != null || next.result?.guideY != null
        ? { x: next.result.guideX ?? null, y: next.result.guideY ?? null }
        : null
    );
    opts.onTransformPreview?.(next.result);
  }, []);

  const pointerMove = useCallback(
    (event: PointerLike) => {
      const opts = optionsRef.current;
      const operation = operationRef.current;
      const host = opts.hostRef.current;
      if (!host) return;
      const point = latestLocalPoint(event);
      if (!operation) {
        const tool = opts.toolRef.current;
        const shapeTool = tool === 'rectangle' || tool === 'ellipse' || tool === 'text' || tool === 'shape';
        if (shapeTool && !opts.readOnlyRef.current && event.target instanceof HTMLCanvasElement) {
          // The shape a click will drop, centred on the pointer like the click is.
          const shape: V2ShapeKind = tool === 'shape' ? opts.toolConfigRef.current.shape : tool;
          const size = defaultShapeSize(shape);
          const world = host.screenToWorld(point);
          host.setPlacementGhost({ shape, bounds: {
            x: world.x - size.width / 2, y: world.y - size.height / 2, width: size.width, height: size.height,
          } });
          host.setHover(null, null);
          return;
        }
        host.setPlacementGhost(null);
        if (tool === 'select' && event.target instanceof HTMLCanvasElement) {
          const readOnly = opts.readOnlyRef.current;
          const handle = readOnly ? null : host.pickTransformHandle(point);
          // Handles sit outside their node, so a hover over one comes from
          // the neighbourhood search, not from the node under the pointer.
          const handleHit = readOnly ? null : pickHandleNear(host, opts, point);
          const hoverNode = handleHit?.nodeId ?? host.pickNode(point);
          const hoverSide = handleHit?.side ?? null;
          host.setHover(hoverNode, hoverSide);
          const connectorHandle = host.getSelectedConnectorId() ? host.pickConnectorHandle(point) : null;
          const hoverConnector = hoverNode || handle || connectorHandle ? null : host.pickConnector(point);
          host.setHoveredConnector(hoverConnector);
          const cursor = hoverSide ? 'crosshair'
            : handle ? HANDLE_CURSORS[handle]
              : hoverNode ? (readOnly ? 'pointer' : 'move')
                : connectorHandle ? (connectorHandle.kind === 'endpoint' ? 'crosshair' : 'grab')
                  : hoverConnector ? 'pointer' : '';
          event.target.style.cursor = cursor;
        } else {
          host.setHover(null, null);
          host.setHoveredConnector(null);
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
        pendingTransformRef.current = {
          pointerId: operation.pointerId, world: worldPoint, modifiers: modifiersOf(event),
        };
        if (transformFrameRef.current === null) {
          transformFrameRef.current = requestAnimationFrame(() => {
            transformFrameRef.current = null;
            applyPendingTransformPreview();
          });
        }
      } else if (operation.kind === 'create') {
        operationRef.current = { ...operation, currentScreen: point };
        const moved = Math.hypot(point.x - operation.startScreen.x, point.y - operation.startScreen.y);
        if (moved >= CLICK_THRESHOLD_PX) {
          // Past the click threshold the ghost is the drag box: what release commits.
          const world = host.screenToWorld(point);
          host.setPlacementGhost({ shape: operation.shape, bounds: {
            x: Math.min(world.x, operation.startWorld.x),
            y: Math.min(world.y, operation.startWorld.y),
            width: Math.max(MIN_CREATE_SIZE, Math.abs(world.x - operation.startWorld.x)),
            height: Math.max(MIN_CREATE_SIZE, Math.abs(world.y - operation.startWorld.y)),
          } });
        }
      } else if (operation.kind === 'ink') {
        const world = host.screenToWorld(point);
        // Coalesced events are the real input rate; a plain mouse move reports
        // one point, a stylus or trackpad reports the whole batch.
        const native = event.nativeEvent?.getCoalescedEvents?.();
        const batch = native && native.length > 0
          ? native.map((sample) => host.screenToWorld(localPoint(retargetSample(event, sample))))
          : [world];
        const last = operation.points.at(-1)!;
        for (const sample of batch) {
          if (Math.hypot(sample.x - last.x, sample.y - last.y) > 0.35) operation.points.push(sample);
        }
        host.setFreeformPreview(inkPreview(opts, operation.stroke, operation.points));
      } else if (operation.kind === 'erase') {
        const world = host.screenToWorld(point);
        const radius = ERASE_RADIUS_PX / opts.cameraRef.current.zoom;
        for (const node of operation.page.nodes) {
          if (operation.removed.has(node.id)) continue;
          if (node.kind !== 'pen' && node.kind !== 'highlighter') continue;
          const points = strokeWorldPoints(node, operation.matrices);
          if (points.length < 2) continue;
          if (strokeHitBySegment(points, [operation.from, world], radius)) operation.removed.add(node.id);
        }
        operationRef.current = { ...operation, from: world };
      } else if (operation.kind === 'connect') {
        const toWorld = host.screenToWorld(point);
        operationRef.current = { ...operation, toWorld };
        const overNode = host.pickNode(point);
        const target = overNode !== operation.sourceNodeId ? overNode : null;
        host.setConnectionPreview(connectorPreview(opts, {
          source: { nodeId: operation.sourceNodeId, point: operation.fromWorld },
          target: { nodeId: target, point: toWorld },
        }));
        host.setDropTarget(target);
      } else if (operation.kind === 'connector-edit') {
        // Shift pins a dragged endpoint to free canvas space instead of binding.
        const overNode = operation.handle.kind === 'endpoint' && !event.shiftKey
          ? host.pickNode(point)
          : null;
        const next = updateConnectorOperation(operation, host.screenToWorld(point), overNode);
        operationRef.current = next;
        host.setConnectorPreview(next.preview);
        host.setDropTarget(overNode);
      } else if (operation.kind === 'marquee') {
        operationRef.current = { ...operation, current: point };
        if (!operation.fromNode) host.setMarquee(boundsBetween(operation.start, point));
      }
    },
    [applyPendingTransformPreview]
  );

  const pointerUp = useCallback(
    (event: PointerLike) => {
      const opts = optionsRef.current;
      const operation = operationRef.current;
      const host = opts.hostRef.current;
      if (!operation || operation.pointerId !== event.pointerId || !host) return;
      operationRef.current = null;
      detachWindow();
      cancelTransformFrame();
      const point = latestLocalPoint(event);
      finishGesture(operation, opts, host, point, event);
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        /* already released */
      }
    },
    [detachWindow, cancelTransformFrame]
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget && !(event.target instanceof HTMLCanvasElement)) return;
      lastPointerTypeRef.current = event.pointerType;
      if (event.pointerType === 'touch' && !beginTouch(event)) return;
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
        shiftKey: native.shiftKey, metaKey: native.metaKey, ctrlKey: native.ctrlKey,
        pointerType: native.pointerType, nativeEvent: native,
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
      // The laser only points: V2LaserTrail draws it, the document never hears of it.
      if (tool === 'laser') return;
      if (opts.readOnlyRef.current) {
        const additive = event.shiftKey || event.metaKey || event.ctrlKey;
        const fromNode = opts.onNodeDrag && !additive ? host.pickNode(point) : null;
        operationRef.current = {
          kind: 'marquee',
          pointerId: event.pointerId,
          start: point,
          current: point,
          additive,
          ...(fromNode ? { fromNode } : {}),
        };
        return;
      }
      if (tool === 'rectangle' || tool === 'ellipse' || tool === 'text' || tool === 'shape') {
        const shape: V2ShapeKind = tool === 'shape' ? opts.toolConfigRef.current.shape : tool;
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
        return;
      }
      if (tool === 'pen' || tool === 'highlighter') {
        const world = host.screenToWorld(point);
        operationRef.current = {
          kind: 'ink', pointerId: event.pointerId, page, stroke: tool, points: [world],
        };
        host.setFreeformPreview(inkPreview(opts, tool, [world]));
        return;
      }
      if (tool === 'eraser') {
        operationRef.current = {
          kind: 'erase', pointerId: event.pointerId, page,
          matrices: buildNodeWorldMatrices(page),
          from: host.screenToWorld(point), removed: new Set(),
        };
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
          sourceSide: null,
          fromWorld: (nodeId && nodeCenterWorld(page, nodeId)) || world,
          startScreen: point,
          toWorld: world,
        };
        return;
      }
      host.setHover(null, null);
      host.setHoveredConnector(null);
      const additive = event.shiftKey || event.metaKey || event.ctrlKey;
      const selectedConnectorId = host.getSelectedConnectorId();
      const selectedConnector = selectedConnectorId
        ? page.connectors.find(({ id }) => id === selectedConnectorId) ?? null
        : null;
      const connectorHandle = selectedConnector ? host.pickConnectorHandle(point) : null;
      if (selectedConnector && connectorHandle && !additive) {
        host.setConnectorSelection([selectedConnector.id], connectorHandle);
        operationRef.current = beginConnectorOperation(
          event.pointerId, page, selectedConnector, connectorHandle
        );
        return;
      }
      const states = buildNodeStateMap(page);
      const canTransform = opts.selectionRef.current.nodeIds.every((id) => !states.get(id)?.locked);
      const handle = canTransform ? host.pickTransformHandle(point) : null;
      if (handle && !additive && opts.selectionRef.current.nodeIds.length > 0) {
        operationRef.current = beginTransformOperation(event.pointerId, page,
          opts.selectionRef.current.nodeIds, handle, host.screenToWorld(point));
        return;
      }
      // A side handle starts a quick-create drag from that side, whether or
      // not its node is selected; the preview runs from the side anchor.
      // Handles sit outside the node bounds, so search neighbours by
      // proximity (this also covers touch, which never hovers first).
      if (!additive) {
        const hit = pickHandleNear(host, opts, point, states);
        if (hit) {
          if (!opts.selectionRef.current.nodeIds.includes(hit.nodeId)) {
            opts.applyConnectorSelection([]);
            opts.applySelection(replaceSelection([hit.nodeId]));
          }
          operationRef.current = { kind: 'connect', pointerId: event.pointerId, page,
            sourceNodeId: hit.nodeId, sourceSide: hit.side,
            fromWorld: sideAnchor(hit.bounds, hit.side),
            startScreen: point, toWorld: host.screenToWorld(point) };
          return;
        }
      }
      const chartPoint = opts.readOnlyRef.current ? null
        : pickChartPoint(host, page, point, opts.cameraRef.current.zoom);
      if (chartPoint && !additive) {
        opts.applyConnectorSelection([]);
        opts.applySelection(replaceSelection([chartPoint.node.id]));
        operationRef.current = {
          kind: 'chart-point', pointerId: event.pointerId, page,
          node: chartPoint.node, index: chartPoint.index,
        };
        return;
      }
      const nodeId = host.pickNode(point);
      if (nodeId && !additive) {
        if (!opts.selectionRef.current.nodeIds.includes(nodeId)) {
          opts.applyConnectorSelection([]);
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
        opts.applyConnectorSelection([connectorId]);
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
    [beginTouch, detachWindow, pointerMove, pointerUp]
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (moveTouch(event)) return;
      pointerMove(event);
    },
    [moveTouch, pointerMove]
  );
  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const tap = endTouch(event);
      pointerUp(event);
      if (tap) doubleTapAt(tap.at);
    },
    [endTouch, pointerUp, doubleTapAt]
  );

  const handlePointerCancel = useCallback(() => {
    resetTouch();
    cancelGesture();
  }, [resetTouch, cancelGesture]);
  // Leaving the canvas for the rail takes the placement ghost with it.
  const handlePointerLeave = useCallback(() => {
    if (!operationRef.current) optionsRef.current.hostRef.current?.setPlacementGhost(null);
    optionsRef.current.hostRef.current?.setHoveredConnector(null);
  }, []);

  const handleDoubleClick = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget && !(event.target instanceof HTMLCanvasElement)) return;
      // Touch double-taps are synthesised on release; the dblclick some
      // browsers fire afterwards would open the editor (or add text) twice.
      if (lastPointerTypeRef.current === 'touch') return;
      const bounds = event.currentTarget.getBoundingClientRect();
      doubleTapAt({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
    },
    [doubleTapAt]
  );

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handlePointerLeave,
    handleDoubleClick,
    cancelGesture,
  };
}

function useDoubleTap(optionsRef: RefObject<V2PointerOptions>) {
  return useCallback(
    (point: Point2d) => {
      const opts = optionsRef.current;
      const host = opts.hostRef.current;
      if (!host) return;
      if (opts.readOnlyRef.current) {
        const nodeId = opts.onNodeDoubleClick ? host.pickNode(point) : null;
        if (nodeId) opts.onNodeDoubleClick!(nodeId);
        return;
      }
      if (opts.toolRef.current !== 'select') return;
      const nodeId = host.pickNode(point);
      if (nodeId) {
        // Charts are data: their double-click edits the numbers, not a label.
        if (opts.onOpenChartData?.(nodeId)) return;
        opts.openEditor(nodeId);
        return;
      }
      const connectorId = host.pickConnector(point);
      if (connectorId) {
        opts.openConnectorEditor(connectorId, point);
        return;
      }
      const page = opts.pageRef.current;
      if (!page) return;
      const id = opts.mintId('node');
      opts.commit(buildInsertShapeCommand(page, {
        kind: 'text', id, label: '', at: textOrigin(host.screenToWorld(point)), appearance: stickyAppearance(opts, 'text'),
      }));
      opts.applyConnectorSelection([]);
      opts.applySelection(replaceSelection([id]));
      opts.openEditor(id, { isNew: true });
    },
    [optionsRef]
  );
}