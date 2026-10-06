// The pointer gestures v2 knows, as data and pure steps: what each operation
// carries, the geometry it needs, and the command its release commits.
// useV2Pointer owns the event wiring and the state machine around them.
import { buildNodeStateMap } from '../../domain/scene/nodeState';
import type { RefObject } from 'react';
import type { DocumentCommand } from '../../domain/commands/types';
import type { SceneNode } from '../../domain/document/types';
import { quadrantContent, quadrantPointPosition } from '../../domain/nodes/chartNodePresentation';
import type { ConnectorRouteKind, SceneConnector, ScenePage } from '../../domain/document/types';
import type { JsonObject } from '../../domain/document/json';
import type { CanvasCamera } from '../../domain/camera/types';
import type { TransformHandle, TransformResult } from '../../domain/transforms/types';
import type { Bounds2d, Matrix2d, Point2d } from '../../domain/geometry/types';
import { areStructurallyEqual } from '../../domain/commands/equality';
import { addToSelection, clearSelection, replaceSelection, type CanvasSelection } from '../../application/selection/selection';
import { createTransformCommand, transformBefore } from '../../domain/transforms/transformSelection';
import { reparentByPosition } from '../../domain/transforms/containment';
import type { PixiRendererHost } from '../../infrastructure/pixi/PixiRendererHost';
import { boundsBetween, selectionAfterClick, transformLabel, updateTransformOperation, type PixiPointerOperation, type TransformModifiers } from './pointerOperations';
import { pickConnectHandle, type ConnectSide } from '../../domain/connectors/connectHandles';
import { connectorEditLabel, updateConnectorOperation } from './v2ConnectorOperations';
import { createConnectorEditCommand } from '../../domain/connectors/editing';
import { ensureConnectorEndpointPorts } from '../../domain/connectors/portAuthoring';
import { defaultShapeSize } from '../../domain/nodes/shapeNode';
import { buildInsertConnectorCommand, buildInsertShapeCommand, buildQuickCreateCommand, type V2ShapeKind } from '../../domain/commands/sceneEdits';
import type { V2Tool } from './V2CreationToolbar';
import { simplifyStroke, strokeBounds } from '../../domain/nodes/strokeGeometry';
import { buildNodeWorldMatrices } from '../../domain/scene/worldGeometry';
import { applyMatrixToPoint } from '../../domain/geometry/matrix';
import type { FreeformPreviewFrame } from '../../infrastructure/pixi/PixiFreeformPreview';
import { buildDeleteSelectionCommand } from '../../domain/commands/sceneEdits';
import { CONNECTOR_ROUTE, connectorHeadEnd, type V2ToolConfig } from './v2ToolCatalog';


export const CLICK_THRESHOLD_PX = 4;
// Handles sit 22 px outside the node edge; search a box around the press.
const HANDLE_SEARCH_RADIUS_PX = 40;
// Object-snap reach in screen pixels; divided by zoom before it meets world units.
export const OBJECT_SNAP_PX = 6;
export const MIN_CREATE_SIZE = 8;
export const HANDLE_CURSORS: Record<TransformHandle, string> = {
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

// The ink tools capture raw points; the document is written once on release.
interface V2InkOperation {
  readonly kind: 'ink';
  readonly pointerId: number;
  readonly page: ScenePage;
  readonly stroke: 'pen' | 'highlighter';
  readonly points: Point2d[];
}

// The eraser is a drag too: it collects the strokes it crossed.
interface V2EraseOperation {
  readonly kind: 'erase';
  readonly pointerId: number;
  readonly page: ScenePage;
  readonly matrices: ReadonlyMap<string, Matrix2d>;
  readonly from: Point2d;
  readonly removed: Set<string>;
}

// Dragging a quadrant point writes x/y on release: one undo, like any drag.
interface V2ChartPointOperation {
  readonly kind: 'chart-point';
  readonly pointerId: number;
  readonly page: ScenePage;
  readonly node: SceneNode;
  readonly index: number;
}


export type V2Operation =
  | PixiPointerOperation | V2CreateOperation | V2ConnectOperation
  | V2InkOperation | V2EraseOperation | V2ChartPointOperation;

// The path tool is click-by-click, so its draft lives beside the pointer
// operations: points are the ends committed so far, cursor is the live end.
interface V2PathPoint {
  readonly at: Point2d;
  readonly nodeId: string | null;
}

export interface V2PathDraft {
  readonly page: ScenePage;
  readonly points: V2PathPoint[];
  cursor: Point2d;
}

export interface V2GestureApi {
  readonly cancelGesture: () => boolean;
  /** Enter: finish the click-by-click path (false when no draft is open). */
  readonly commitGesture: () => boolean;
}

export interface V2PointerOptions {
  readonly hostRef: RefObject<PixiRendererHost | null>;
  readonly cameraRef: RefObject<CanvasCamera>;
  readonly pageRef: RefObject<ScenePage | null>;
  readonly selectionRef: RefObject<CanvasSelection>;
  readonly selectedConnectorIdsRef: RefObject<readonly string[]>;
  readonly toolRef: RefObject<V2Tool>;
  /** Which variant a flyout tool draws with (shape library, connector kind). */
  readonly toolConfigRef: RefObject<V2ToolConfig>;
  readonly spacePanRef: RefObject<boolean>;
  readonly readOnlyRef: RefObject<boolean>;
  readonly gestureApiRef: RefObject<V2GestureApi | null>;
  readonly commit: (command: DocumentCommand) => void;
  readonly applySelection: (selection: CanvasSelection) => void;
  readonly applyConnectorSelection: (connectorIds: readonly string[]) => void;
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
  /** Double-click on a chart opens its data panel; true means it was handled. */
  readonly onOpenChartData?: (nodeId: string) => boolean;
}

export interface StylePresets {
  shape: JsonObject;
  text: JsonObject;
  connector: JsonObject;
  /** Last ink pick: colour, width and opacity for the next stroke. */
  ink: JsonObject;
}

// Both React's synthetic event and a native window event, re-targeted at the
// canvas section, satisfy this.
export interface PointerLike {
  readonly currentTarget: HTMLElement;
  readonly target: EventTarget | null;
  readonly clientX: number;
  readonly clientY: number;
  readonly pointerId: number;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
  readonly metaKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly pointerType?: string;
  readonly nativeEvent?: Partial<PointerEvent>;
}

export function modifiersOf(event: PointerLike): TransformModifiers {
  return { shiftKey: event.shiftKey, altKey: event.altKey, metaKey: Boolean(event.metaKey || event.ctrlKey) };
}

export function localPoint(event: PointerLike): Point2d {
  const bounds = event.currentTarget.getBoundingClientRect();
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
}

// Trackpads report at 120 Hz+; the browser queues more moves than we can
// paint. Collapse each batch to its latest point — intermediate positions are
// never shown, so computing previews for them is pure waste.
export function latestLocalPoint(event: PointerLike): Point2d {
  const coalesced = typeof event.nativeEvent?.getCoalescedEvents === 'function'
    ? event.nativeEvent.getCoalescedEvents()
    : null;
  if (!coalesced || coalesced.length === 0) return localPoint(event);
  const bounds = event.currentTarget.getBoundingClientRect();
  const last = coalesced[coalesced.length - 1];
  return { x: last.clientX - bounds.left, y: last.clientY - bounds.top };
}

export function textOrigin(center: Point2d): Point2d {
  const size = defaultShapeSize('text');
  return { x: center.x - size.width / 2, y: center.y - size.height / 2 };
}

export function nodeCenterWorld(page: ScenePage, nodeId: string): Point2d | null {
  const node = page.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return null;
  return {
    x: node.transform.translation.x + node.size.width / 2,
    y: node.transform.translation.y + node.size.height / 2,
  };
}

// A side handle under the pointer, found by searching the neighbourhood:
// handles sit outside node bounds (and touch never hovers first).
export function pickHandleNear(
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

// The dragged-out (or click-by-click) connector as it will commit: routed live,
// so the user sees the real lane and the side it will bind to before letting go.
export function connectorPreview(options: V2PointerOptions, ends: {
  readonly source: { readonly nodeId: string | null; readonly point: Point2d };
  readonly target: { readonly nodeId: string | null; readonly point: Point2d };
  readonly waypoints?: readonly Point2d[];
}, routeKind?: ConnectorRouteKind): SceneConnector {
  const kind = routeKind ?? CONNECTOR_ROUTE[options.toolConfigRef.current.connector];
  const waypoints = ends.waypoints ?? [];
  return {
    id: '__connect-preview',
    source: ends.source.nodeId
      ? { nodeId: ends.source.nodeId, portId: null, anchor: null, point: null }
      : { nodeId: null, portId: null, anchor: null, point: ends.source.point },
    target: ends.target.nodeId
      ? { nodeId: ends.target.nodeId, portId: null, anchor: null, point: null }
      : { nodeId: null, portId: null, anchor: null, point: ends.target.point },
    route: { kind, ownership: waypoints.length ? 'manual' : 'automatic' },
    waypoints: waypoints.map((point) => ({ ...point })),
    labels: [], appearance: { markerEnd: connectorHeadEnd(options.toolConfigRef.current.connector) },
    semantics: {}, metadata: {}, extensions: {},
  };
}

export function stickyAppearance(options: V2PointerOptions, shape: V2ShapeKind): JsonObject | undefined {
  return options.stylePresetsRef?.current[shape === 'text' ? 'text' : 'shape'];
}

// The picked connector tool decides route and target marker; sticky style
// carries the rest, so "arrow" always points and "line" never does.
export function connectorAppearance(options: V2PointerOptions): JsonObject {
  const kind = options.toolConfigRef.current.connector;
  return { ...options.stylePresetsRef?.current.connector, markerEnd: connectorHeadEnd(kind) };
}

function connectorRoute(options: V2PointerOptions): ConnectorRouteKind {
  return CONNECTOR_ROUTE[options.toolConfigRef.current.connector];
}

// Ink defaults, overridden by the style bar's last ink pick. Numbers stay in
// the catalogue's range so a stroke and a catalog star look like siblings.
function inkDefaults(options: V2PointerOptions, stroke: 'pen' | 'highlighter'): JsonObject {
  const preset = options.stylePresetsRef?.current.ink;
  return stroke === 'highlighter'
    ? { strokeColor: '#fde047', strokeWidth: 16, transparency: 0.45, ...preset }
    : { strokeColor: '#334155', strokeWidth: 3, transparency: 1, ...preset };
}

/** One insert-node per stroke: the points are local to the node's own box. */
function buildInkCommand(options: V2PointerOptions, operation: V2InkOperation): DocumentCommand | null {
  const tolerance = 0.75 / options.cameraRef.current.zoom;
  const simplified = simplifyStroke(operation.points, tolerance);
  if (simplified.length < 2) return null;
  const bounds = strokeBounds(simplified);
  const id = options.mintId('node');
  const local = simplified.map((point) => ({ x: point.x - bounds.x, y: point.y - bounds.y }));
  return {
    kind: 'insert-node',
    id: `create-node:${id}`,
    label: operation.stroke === 'pen' ? 'Draw' : 'Highlight',
    pageId: operation.page.id,
    index: operation.page.nodes.length,
    node: {
      id,
      kind: operation.stroke,
      parentId: null,
      layerId: operation.page.layers[0]?.id ?? 'default',
      zIndex: operation.page.nodes.reduce((max, node) => Math.max(max, node.zIndex), -1) + 1,
      transform: {
        translation: { x: bounds.x, y: bounds.y },
        rotationRadians: 0,
        scale: { x: 1, y: 1 },
      },
      size: { width: Math.max(1, bounds.width), height: Math.max(1, bounds.height) },
      content: { ...inkDefaults(options, operation.stroke), points: local },
      appearance: {},
      ports: [],
      metadata: {},
      extensions: {},
    },
  };
}

/** Every stroke the eraser has crossed so far, as one undo step. */
function buildEraseCommand(operation: V2EraseOperation): DocumentCommand | null {
  if (operation.removed.size === 0) return null;
  return buildDeleteSelectionCommand(operation.page, [...operation.removed], []);
}

// Eraser reach: half the widest stroke it can hit, in world units.
export const ERASE_RADIUS_PX = 10;
// How close a press must land to grab a quadrant point, in screen pixels.
const CHART_POINT_REACH_PX = 14;

/** A quadrant point within reach of the cursor, in a chart under it. */
export function pickChartPoint(
  host: PixiRendererHost, page: ScenePage, point: Point2d, zoom: number
): { readonly node: SceneNode; readonly index: number } | null {
  const world = host.screenToWorld(point);
  const reach = CHART_POINT_REACH_PX / zoom;
  for (const node of page.nodes) {
    const quadrant = quadrantContent(node);
    if (!quadrant) continue;
    const matrix = buildNodeWorldMatrices(page).get(node.id);
    if (!matrix) continue;
    const plot = { x: 48, y: 8, width: node.size.width - 86, height: node.size.height - 30 };
    for (const [index, entry] of quadrant.points.entries()) {
      const local = quadrantPointPosition(quadrant, entry, plot);
      const at = applyMatrixToPoint(matrix, local);
      if (Math.hypot(at.x - world.x, at.y - world.y) <= reach) return { node, index };
    }
  }
  return null;
}

/** A quadrant point's new 0–1 coordinates from a world position. */
function quadrantValueAt(node: SceneNode, world: Point2d): { x: number; y: number } {
  const inverse = { a: 1, b: 0, c: 0, d: 1, tx: -node.transform.translation.x, ty: -node.transform.translation.y };
  const local = applyMatrixToPoint(inverse, world);
  const plot = { x: 48, y: 8, width: node.size.width - 86, height: node.size.height - 30 };
  return {
    x: Math.min(1, Math.max(0, (local.x - plot.x) / Math.max(1, plot.width))),
    y: Math.min(1, Math.max(0, 1 - (local.y - plot.y) / Math.max(1, plot.height))),
  };
}

/** The live stroke as the renderer needs it: world points, ink colours. */
export function inkPreview(
  options: V2PointerOptions, stroke: 'pen' | 'highlighter', points: readonly Point2d[]
): FreeformPreviewFrame {
  const preset = inkDefaults(options, stroke);
  return {
    confirmed: [...points],
    predicted: [],
    color: Number.parseInt(String(preset.strokeColor).slice(1), 16),
    width: Number(preset.strokeWidth),
    alpha: Number(preset.transparency),
  };
}

/** A coalesced sample re-pointed at the section, so its client coords resolve. */
export function retargetSample(event: PointerLike, sample: { clientX: number; clientY: number }): PointerLike {
  return { ...event, clientX: sample.clientX, clientY: sample.clientY };
}

export function strokeWorldPoints(
  node: ScenePage['nodes'][number], matrices: ReadonlyMap<string, Matrix2d>
): Point2d[] {
  const matrix = matrices.get(node.id);
  const raw = node.content.points;
  if (!matrix || !Array.isArray(raw)) return [];
  return raw.flatMap((point) => {
    if (!point || typeof point !== 'object' || Array.isArray(point)) return [];
    const { x, y } = point as { x?: unknown; y?: unknown };
    return typeof x === 'number' && typeof y === 'number'
      ? [applyMatrixToPoint(matrix, { x, y })] : [];
  });
}

// Handle flow released on empty canvas (or clicked without dragging): the new
// same-kind node at the fixed gap, side-bound, selected, label editing open.
function commitQuickCreateDelivery(
  options: V2PointerOptions,
  operation: V2ConnectOperation,
  sourceNodeId: string,
  sourceSide: ConnectSide,
  dropAt?: Point2d
): void {
  const nodeId = options.mintId('node');
  const connectorId = options.mintId('connector');
  options.commit(buildQuickCreateCommand(operation.page, {
    sourceNodeId, sourceSide, newNodeId: nodeId, connectorId, ...(dropAt ? { dropAt } : {}),
  }));
  options.applyConnectorSelection([]);
  options.applySelection(replaceSelection([nodeId]));
  options.onToolChange('select');
  options.openEditor(nodeId, { isNew: true });
}

/**
 * A released gesture becomes its one command (or a selection): the release point is
 * authoritative, so a fast flick that never painted a preview still commits.
 */
export function finishGesture(operation: V2Operation, opts: V2PointerOptions, host: PixiRendererHost, point: Point2d, event: PointerLike): void {
  if (operation.kind === 'marquee') {
    const bounds: Bounds2d = boundsBetween(operation.start, point);
    const moved = Math.hypot(point.x - operation.start.x, point.y - operation.start.y);
    host.setMarquee(null);
    if (moved >= CLICK_THRESHOLD_PX) {
      const ids = host.pickNodesInScreenBounds(bounds);
      const connectorIds = host.pickConnectorsInScreenBounds(bounds);
      opts.applySelection(
        operation.additive
          ? addToSelection(opts.selectionRef.current, ids)
          : replaceSelection(ids)
      );
      opts.applyConnectorSelection(operation.additive
        ? [...new Set([...opts.selectedConnectorIdsRef.current, ...connectorIds])]
        : connectorIds);
    } else {
      const nodeId = host.pickNode(point);
      const connectorId = nodeId ? null : host.pickConnector(point);
      if (connectorId) {
        opts.applySelection(clearSelection());
        opts.applyConnectorSelection([connectorId]);
      } else {
        if (nodeId || !operation.additive) opts.applyConnectorSelection([]);
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
    host.setPlacementGhost(null);
    const world = host.screenToWorld(point);
    const moved = Math.hypot(
      point.x - operation.startScreen.x,
      point.y - operation.startScreen.y
    );
    const id = opts.mintId('node');
    if (moved < CLICK_THRESHOLD_PX) {
      const size = defaultShapeSize(operation.shape);
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
    opts.applyConnectorSelection([]);
    opts.applySelection(replaceSelection([id]));
    opts.onToolChange('select');
    if (operation.shape === 'text') opts.openEditor(id, { isNew: true });
  } else if (operation.kind === 'ink') {
    host.setFreeformPreview(null);
    const command = buildInkCommand(opts, operation);
    if (command) {
      opts.commit(command);
      const nodeId = 'node' in command && command.kind === 'insert-node' ? command.node.id : null;
      if (nodeId) {
        opts.applyConnectorSelection([]);
        opts.applySelection(replaceSelection([nodeId]));
      }
    }
    opts.onToolChange('select');
  } else if (operation.kind === 'erase') {
    const command = buildEraseCommand(operation);
    if (command) {
      opts.applyConnectorSelection([]);
      opts.applySelection(clearSelection());
      opts.commit(command);
    }
  } else if (operation.kind === 'chart-point') {
    const quadrant = quadrantContent(operation.node);
    const current = quadrant?.points[operation.index];
    const next = quadrantValueAt(operation.node, host.screenToWorld(point));
    if (quadrant && current
      && (Math.abs(current.x - next.x) > 1e-4 || Math.abs(current.y - next.y) > 1e-4)) {
      opts.commit({
        kind: 'set-node',
        id: `chart-point:${operation.node.id}:${operation.index}`,
        label: 'Move quadrant point',
        pageId: operation.page.id,
        before: operation.node,
        after: {
          ...operation.node,
          content: {
            ...operation.node.content,
            points: quadrant.points.map((entry, index) =>
              index === operation.index ? { ...entry, x: next.x, y: next.y } : entry),
          },
        },
      });
    }
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
        opts.applyConnectorSelection([id]);
        opts.onToolChange('select');
      } else if (targetId === null) {
        // A drag lands the new node where it was released (FigJam, Miro); a click keeps the fixed gap.
        commitQuickCreateDelivery(opts, operation, sourceNodeId, sourceSide, host.screenToWorld(point));
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
      opts.applyConnectorSelection([id]);
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
    host.setConnectorSelection([operation.before.id], null);
  }
}
