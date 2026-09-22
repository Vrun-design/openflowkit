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
import type { ConnectorRouteKind, SceneConnector, ScenePage } from '../../domain/document/types';
import type { JsonObject } from '../../domain/document/json';
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
import { createTransformCommand, transformBefore } from '../../domain/transforms/transformSelection';
import { reparentByPosition } from '../../domain/transforms/containment';
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
  type TransformModifiers,
} from './pointerOperations';
import {
  pickConnectHandle,
  sideAnchor,
  type ConnectSide,
} from '../../domain/connectors/connectHandles';
import {
  beginConnectorOperation,
  connectorEditLabel,
  updateConnectorOperation,
} from './v2ConnectorOperations';
import { createConnectorEditCommand } from '../../domain/connectors/editing';
import { ensureConnectorEndpointPorts } from '../../domain/connectors/portAuthoring';
import {
  V2_DEFAULT_SHAPE_SIZE,
  V2_DEFAULT_TEXT_SIZE,
  buildInsertConnectorCommand,
  buildInsertShapeCommand,
  buildQuickCreateCommand,
  type V2ShapeKind,
} from '../../domain/commands/sceneEdits';
import type { V2Tool } from './V2CreationToolbar';
import { CONNECTOR_ROUTE, connectorHeadEnd, type V2ToolConfig } from './v2ToolCatalog';

const CLICK_THRESHOLD_PX = 4;
// Handles sit 22 px outside the node edge; search a box around the press.
const HANDLE_SEARCH_RADIUS_PX = 40;
// Object-snap reach in screen pixels; divided by zoom before it meets world units.
const OBJECT_SNAP_PX = 6;
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
  /** Handle side the drag started from; null for connector-tool drags. */
  readonly sourceSide: ConnectSide | null;
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
  /** Which variant a flyout tool draws with (shape library, connector kind). */
  readonly toolConfigRef: RefObject<V2ToolConfig>;
  readonly spacePanRef: RefObject<boolean>;
  readonly readOnlyRef: RefObject<boolean>;
  readonly gestureApiRef: RefObject<V2GestureApi | null>;
  readonly commit: (command: DocumentCommand) => void;
  readonly applySelection: (selection: CanvasSelection) => void;
  readonly applyConnectorSelection: (connectorId: string | null) => void;
  readonly updateCamera: (camera: CanvasCamera) => void;
  readonly openEditor: (nodeId: string, options?: { readonly isNew?: boolean }) => void;
  readonly openConnectorEditor: (connectorId: string, at: Point2d) => void;
  readonly onToolChange: (tool: V2Tool) => void;
  readonly onTransformPreview?: (result: TransformResult | null) => void;
  readonly snapToGrid?: boolean;
  readonly mintId: (prefix: string) => string;
  /**
   * Model pages wrap a connector insert with the matching model relation, so a
   * connector drawn on a C4 view survives the next Generate.
   */
  readonly extendConnectorCommand?: (command: DocumentCommand, fromNodeId: string, toNodeId: string) => DocumentCommand;
  /** Sticky defaults: appearance the last style edit left behind, per kind (tldraw). */
  readonly stylePresetsRef?: RefObject<StylePresets>;
}

export interface StylePresets {
  shape: JsonObject;
  text: JsonObject;
  connector: JsonObject;
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
  readonly shiftKey: boolean;
  readonly metaKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly nativeEvent?: Partial<PointerEvent>;
}

function modifiersOf(event: PointerLike): TransformModifiers {
  return { shiftKey: event.shiftKey, altKey: event.altKey, metaKey: Boolean(event.metaKey || event.ctrlKey) };
}

function localPoint(event: PointerLike): Point2d {
  const bounds = event.currentTarget.getBoundingClientRect();
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
}

// Trackpads report at 120 Hz+; the browser queues more moves than we can
// paint. Collapse each batch to its latest point — intermediate positions are
// never shown, so computing previews for them is pure waste.
function latestLocalPoint(event: PointerLike): Point2d {
  const coalesced = typeof event.nativeEvent?.getCoalescedEvents === 'function'
    ? event.nativeEvent.getCoalescedEvents()
    : null;
  if (!coalesced || coalesced.length === 0) return localPoint(event);
  const bounds = event.currentTarget.getBoundingClientRect();
  const last = coalesced[coalesced.length - 1];
  return { x: last.clientX - bounds.left, y: last.clientY - bounds.top };
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

// A side handle under the pointer, found by searching the neighbourhood:
// handles sit outside node bounds (and touch never hovers first).
function pickHandleNear(
  host: PixiRendererHost,
  opts: V2PointerOptions,
  point: Point2d,
  states?: ReturnType<typeof buildNodeStateMap>
): { readonly nodeId: string; readonly side: ConnectSide; readonly bounds: Bounds2d } | null {
  const nearby = host.pickNodesInScreenBounds(boundsBetween(
    { x: point.x - HANDLE_SEARCH_RADIUS_PX, y: point.y - HANDLE_SEARCH_RADIUS_PX },
    { x: point.x + HANDLE_SEARCH_RADIUS_PX, y: point.y + HANDLE_SEARCH_RADIUS_PX }
  ));
  const locked = states ?? (opts.pageRef.current ? buildNodeStateMap(opts.pageRef.current) : null);
  for (const nodeId of nearby) {
    if (locked?.get(nodeId)?.locked) continue;
    const bounds = host.getNodesWorldBounds([nodeId]);
    const side = bounds ? pickConnectHandle(bounds, point, opts.cameraRef.current) : null;
    if (bounds && side) return { nodeId, side, bounds };
  }
  return null;
}

// The dragged-out connector as it will commit: routed live, so the user sees
// the real lane and the side it will bind to before letting go.
function previewConnector(
  options: V2PointerOptions,
  operation: V2ConnectOperation,
  targetNodeId: string | null,
  toWorld: Point2d
): SceneConnector {
  const kind = options.toolConfigRef.current.connector;
  return {
    id: '__connect-preview',
    source: operation.sourceNodeId
      ? { nodeId: operation.sourceNodeId, portId: null, anchor: null, point: null }
      : { nodeId: null, portId: null, anchor: null, point: operation.fromWorld },
    target: targetNodeId
      ? { nodeId: targetNodeId, portId: null, anchor: null, point: null }
      : { nodeId: null, portId: null, anchor: null, point: toWorld },
    route: { kind: CONNECTOR_ROUTE[kind], ownership: 'automatic' },
    waypoints: [], labels: [], appearance: { markerEnd: connectorHeadEnd(kind) },
    semantics: {}, metadata: {}, extensions: {},
  };
}

function stickyAppearance(options: V2PointerOptions, shape: V2ShapeKind): JsonObject | undefined {
  return options.stylePresetsRef?.current[shape === 'text' ? 'text' : 'shape'];
}

// The picked connector tool decides route and target marker; sticky style
// carries the rest, so "arrow" always points and "line" never does.
function connectorAppearance(options: V2PointerOptions): JsonObject {
  const kind = options.toolConfigRef.current.connector;
  return { ...options.stylePresetsRef?.current.connector, markerEnd: connectorHeadEnd(kind) };
}

function connectorRoute(options: V2PointerOptions): ConnectorRouteKind {
  return CONNECTOR_ROUTE[options.toolConfigRef.current.connector];
}

// Handle flow released on empty canvas (or clicked without dragging): the new
// same-kind node at the fixed gap, side-bound, selected, label editing open.
function commitQuickCreateDelivery(
  options: V2PointerOptions,
  operation: V2ConnectOperation,
  sourceNodeId: string,
  sourceSide: ConnectSide
): void {
  const nodeId = options.mintId('node');
  const connectorId = options.mintId('connector');
  options.commit(buildQuickCreateCommand(operation.page, {
    sourceNodeId, sourceSide, newNodeId: nodeId, connectorId,
  }));
  options.applyConnectorSelection(null);
  options.applySelection(replaceSelection([nodeId]));
  options.onToolChange('select');
  options.openEditor(nodeId, { isNew: true });
}

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

  const cancelGesture = useCallback((): boolean => {
    detachWindow();
    cancelTransformFrame();
    if (!operationRef.current) return false;
    operationRef.current = null;
    clearPreviews();
    return true;
  }, [clearPreviews, detachWindow, cancelTransformFrame]);
  useEffect(() => () => {
    detachWindow();
    cancelTransformFrame();
  }, [detachWindow, cancelTransformFrame]);

  useEffect(() => {
    gestureApiRef.current = { cancelGesture };
  }, [gestureApiRef, cancelGesture]);

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
        if (opts.toolRef.current === 'select' && event.target instanceof HTMLCanvasElement) {
          const handle = host.pickTransformHandle(point);
          // Handles sit outside their node, so a hover over one comes from
          // the neighbourhood search, not from the node under the pointer.
          const handleHit = opts.readOnlyRef.current ? null : pickHandleNear(host, opts, point);
          const hoverNode = handleHit?.nodeId ?? host.pickNode(point);
          const hoverSide = handleHit?.side ?? null;
          host.setHover(hoverNode, hoverSide);
          const connectorHandle = host.getSelectedConnectorId() ? host.pickConnectorHandle(point) : null;
          const cursor = hoverSide ? 'crosshair'
            : handle ? HANDLE_CURSORS[handle]
              : hoverNode ? 'move'
                : connectorHandle ? (connectorHandle.kind === 'endpoint' ? 'crosshair' : 'grab')
                  : host.pickConnector(point) ? 'pointer' : '';
          event.target.style.cursor = cursor;
        } else {
          host.setHover(null, null);
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
        host.setMarquee(boundsBetween(operation.startScreen, point));
      } else if (operation.kind === 'connect') {
        const toWorld = host.screenToWorld(point);
        operationRef.current = { ...operation, toWorld };
        const overNode = host.pickNode(point);
        host.setConnectionPreview(previewConnector(opts, operation, overNode !== operation.sourceNodeId ? overNode : null, toWorld));
      } else if (operation.kind === 'connector-edit') {
        // Shift pins a dragged endpoint to free canvas space instead of binding.
        const overNode = operation.handle.kind === 'endpoint' && !event.shiftKey
          ? host.pickNode(point)
          : null;
        const next = updateConnectorOperation(operation, host.screenToWorld(point), overNode);
        operationRef.current = next;
        host.setConnectorPreview(next.preview);
      } else if (operation.kind === 'marquee') {
        operationRef.current = { ...operation, current: point };
        host.setMarquee(boundsBetween(operation.start, point));
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
        // The release point is authoritative: a fast flick may never have
        // painted a preview frame, but a past-threshold release still commits.
        const worldPoint = host.screenToWorld(point);
        const releaseDistance = Math.hypot(worldPoint.x - operation.start.x, worldPoint.y - operation.start.y)
          * opts.cameraRef.current.zoom;
        const final = operation.result || releaseDistance >= CLICK_THRESHOLD_PX
          ? updateTransformOperation(operation, worldPoint, Boolean(opts.snapToGrid),
              OBJECT_SNAP_PX / opts.cameraRef.current.zoom, modifiersOf(event))
          : operation;
        host.setTransformPreview(null);
        host.setAlignmentGuides(null);
        opts.onTransformPreview?.(null);
        if (final.result) {
          const before = transformBefore(operation.snapshot);
          // A move can drop nodes into or out of a section (FigJam); the
          // reparent rides in the same undo step.
          const after = operation.transformKind === 'move'
            ? reparentByPosition(operation.page, final.result.nodes) : final.result.nodes;
          const changed = after.some((node, index) => !areStructurallyEqual(node, before[index]));
          if (changed) {
            opts.commit(
              createTransformCommand(
                operation.page.id,
                before,
                after,
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
              appearance: stickyAppearance(opts, operation.shape),
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
              appearance: stickyAppearance(opts, operation.shape),
            })
          );
        }
        opts.applyConnectorSelection(null);
        opts.applySelection(replaceSelection([id]));
        opts.onToolChange('select');
        if (operation.shape === 'text') opts.openEditor(id, { isNew: true });
      } else if (operation.kind === 'connect') {
        host.setConnectionPreview(null);
        const moved = Math.hypot(
          point.x - operation.startScreen.x,
          point.y - operation.startScreen.y
        );
        const targetId = host.pickNode(point);
        if (operation.sourceSide && operation.sourceNodeId) {
          const sourceNodeId = operation.sourceNodeId;
          const sourceSide = operation.sourceSide;
          if (moved < CLICK_THRESHOLD_PX) {
            // Click on a handle: same as releasing on empty canvas that way.
            commitQuickCreateDelivery(opts, operation, sourceNodeId, sourceSide);
          } else if (targetId && targetId !== sourceNodeId) {
            const id = opts.mintId('connector');
            const command = buildInsertConnectorCommand(operation.page, {
              id, source: { nodeId: sourceNodeId }, target: { nodeId: targetId },
              route: connectorRoute(opts), appearance: connectorAppearance(opts),
            });
            opts.commit(opts.extendConnectorCommand?.(command, sourceNodeId, targetId) ?? command);
            opts.applySelection(clearSelection());
            opts.applyConnectorSelection(id);
            opts.onToolChange('select');
          } else if (targetId === null) {
            commitQuickCreateDelivery(opts, operation, sourceNodeId, sourceSide);
          }
          // Release back on the source node cancels; loops arrive in 1.6.
        } else if (moved >= CLICK_THRESHOLD_PX && !(targetId && targetId === operation.sourceNodeId)) {
          const id = opts.mintId('connector');
          const command = buildInsertConnectorCommand(operation.page, {
            id,
            source: operation.sourceNodeId
              ? { nodeId: operation.sourceNodeId }
              : { point: operation.fromWorld },
            target: targetId ? { nodeId: targetId } : { point: host.screenToWorld(point) },
            route: connectorRoute(opts), appearance: connectorAppearance(opts),
          });
          opts.commit(
            operation.sourceNodeId && targetId
              ? opts.extendConnectorCommand?.(command, operation.sourceNodeId, targetId) ?? command
              : command
          );
          opts.applySelection(clearSelection());
          opts.applyConnectorSelection(id);
          opts.onToolChange('select');
        }
      } else if (operation.kind === 'connector-edit') {
        const final = updateConnectorOperation(
          operation,
          host.screenToWorld(point),
          operation.handle.kind === 'endpoint' && !event.shiftKey ? host.pickNode(point) : null
        );
        host.setConnectorPreview(null);
        const command = createConnectorEditCommand(
          operation.page.id,
          operation.before,
          final.preview,
          connectorEditLabel(operation.handle)
        );
        if (command) {
          // Ports bound live mid-drag materialise with the gesture: one step.
          const portFixings = ensureConnectorEndpointPorts(operation.page, final.preview);
          if (portFixings.length === 0) {
            opts.commit(command);
          } else {
            opts.commit({
              kind: 'batch',
              id: `${command.id}:ports`,
              label: command.label,
              commands: [
                ...portFixings.map((fixing) => ({
                  kind: 'set-node' as const,
                  id: `connect-port:${fixing.after.id}`,
                  label: command.label,
                  pageId: operation.page.id,
                  before: fixing.before,
                  after: fixing.after,
                })),
                command,
              ],
            });
          }
        }
        host.setConnectorSelection(operation.before.id, null);
      }
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
        nativeEvent: native,
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
          sourceSide: null,
          fromWorld: (nodeId && nodeCenterWorld(page, nodeId)) || world,
          startScreen: point,
          toWorld: world,
        };
        return;
      }
      host.setHover(null, null);
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
            opts.applyConnectorSelection(null);
            opts.applySelection(replaceSelection([hit.nodeId]));
          }
          operationRef.current = { kind: 'connect', pointerId: event.pointerId, page,
            sourceNodeId: hit.nodeId, sourceSide: hit.side,
            fromWorld: sideAnchor(hit.bounds, hit.side),
            startScreen: point, toWorld: host.screenToWorld(point) };
          return;
        }
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
      opts.applyConnectorSelection(null);
      opts.applySelection(replaceSelection([id]));
      opts.openEditor(id, { isNew: true });
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
