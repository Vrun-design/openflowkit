import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useTranslation } from 'react-i18next';
import { useFlowStore } from '@/store';
import { projectActiveDocumentMemoized } from '../application/active-document/activeDocumentProjection';
import {
  projectConnectorSelectionToEdges,
  projectSelectionToNodes,
} from '../application/active-document/productionSelectionBridge';
import { buildProductionConnectorCommand } from '../application/active-document/productionConnectorBridge';
import {
  buildProductionNodeMutationCommand,
  type ProductionNodeMutation,
} from '../application/active-document/productionNodeBridge';
import type { CanonicalCommandBuilder } from '@/store/actions/createCanonicalCommandActions';
import { isNodeEditableOnLayer } from '../application/active-document/productionLayers';
import { OpenCanvasTextEditorOverlay } from './OpenCanvasTextEditorOverlay';
import { OpenCanvasSemanticSceneTree } from './OpenCanvasSemanticSceneTree';
import { createOpenCanvasSurfaceApi } from './openCanvasSurfaceApi';
import {
  publishActiveCanvasViewport,
  registerActiveCanvas,
  useActiveCanvas,
} from '@/canvas/activeCanvas';
import { ContextMenu } from '@/components/ContextMenu';
import { ConnectMenu } from '@/components/ConnectMenu';
import type { NodeData } from '@/lib/types';
import { NavigationControls } from '@/components/NavigationControls';
import { useFlowCanvasMenusAndActions } from '@/components/flow-canvas/useFlowCanvasMenusAndActions';
import { useCanvasExternalInput } from '@/components/flow-canvas/useCanvasExternalInput';
import { useFlowOperations } from '@/hooks/useFlowOperations';
import { APP_EVENT_NAMES } from '@/lib/legacyBranding';
import { useNodeLabelEditRequestActions, usePendingNodeLabelEditRequest } from '@/store/selectionHooks';
import type { Bounds2d, Point2d } from '../domain/geometry/types';
import {
  beginConnectorOperation,
  updateConnectorOperation,
  type ConnectorPointerOperation,
} from './pixiConnectorOperations';
import type { ConnectorEditHandle } from '../domain/connectors/editing';
import { nearestSide, sideAnchor, type ConnectSide } from '../domain/connectors/connectHandles';
import {
  beginFreeformOperation,
  finishFreeformOperation,
  freeformPreviewPoints,
  freeformPreviewStyle,
  updateFreeformOperation,
  type FreeformPointerOperation,
} from './pixiFreeformOperations';
import { projectPointerSamples } from './pointerSampleProjection';
import { computeAlignmentSnap, type AlignmentSnap } from '../domain/transforms/alignmentGuides';
import {
  addToSelection,
  clearSelection,
  replaceSelection,
  EMPTY_CANVAS_SELECTION,
  type CanvasSelection,
} from '../application/selection/selection';
import {
  anchoredMarqueeBounds,
  beginTransformOperation,
  selectionAfterClick,
  updateTransformOperation,
  type AnchoredMarqueePointerOperation,
  type TransformPointerOperation,
} from './pixiPointerOperations';
import { buildProductionTransformCommand } from '../application/active-document/productionTransformBridge';
import { openCanvasRendererFamilyFlags } from '../application/renderer/rendererFamilyFlags';
import {
  beginCameraPan,
  moveCameraPan,
  zoomReadOnlyCamera,
  type CameraPanGesture,
} from '../application/renderer/readOnlyCameraInteraction';
import {
  beginTouchCameraGesture,
  endTouchCameraGesture,
  moveTouchCameraGesture,
  type TouchCameraGesture,
} from '../application/renderer/touchCameraGesture';
import { DEFAULT_CANVAS_CAMERA, fitCameraToBounds } from '../domain/camera/camera';
import type { CanvasCamera } from '../domain/camera/types';
import { detectWebGlCapability } from '../infrastructure/pixi/capabilities';
import { PixiRendererHost } from '../infrastructure/pixi/PixiRendererHost';

/** Screen distance within which a moving selection snaps to another node's edge or centre. */
const GUIDE_THRESHOLD_PIXELS = 8;

/** Chrome drawn over the canvas (zoom controls, menus) keeps its own pointer events. */
function isCanvasTarget(event: React.SyntheticEvent<HTMLDivElement>): boolean {
  return event.target === event.currentTarget || event.target instanceof HTMLCanvasElement;
}

function surfacePoint(
  event: React.MouseEvent<HTMLDivElement>
): { x: number; y: number } {
  const bounds = event.currentTarget.getBoundingClientRect();
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
}

interface OpenCanvasSurfaceProps {
  /** React Flow canvas rendered instead whenever OpenCanvas cannot draw. */
  readonly fallback: React.ReactNode;
  /** Same history hook the React Flow canvas gets, so both share undo. */
  readonly recordHistory: () => void;
}

/** Rubber-band drag from a connect handle to create a new connector. */
interface ConnectPointerOperation {
  readonly pointerId: number;
  readonly sourceNodeId: string;
  readonly side: ConnectSide;
  readonly from: Point2d;
  readonly startScreen: Point2d;
  readonly moved: boolean;
}

interface LabelEditRequest {
  readonly nodeId: string;
  readonly seedText?: string;
  readonly replaceExisting?: boolean;
}

/**
 * Draws the active page with the OpenCanvas renderer inside the production
 * editor chrome, with camera navigation, selection, and transforms.
 */
export function OpenCanvasSurface({
  fallback,
  recordHistory,
}: OpenCanvasSurfaceProps): React.JSX.Element {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<PixiRendererHost | null>(null);
  const cameraRef = useRef<CanvasCamera>(DEFAULT_CANVAS_CAMERA);
  const panRef = useRef<CameraPanGesture | null>(null);
  const touchRef = useRef<TouchCameraGesture | null>(null);
  const marqueeRef = useRef<AnchoredMarqueePointerOperation | null>(null);
  const selectionRef = useRef<CanvasSelection>(EMPTY_CANVAS_SELECTION);
  const spacePanRef = useRef(false);
  const transformRef = useRef<TransformPointerOperation | null>(null);
  const pendingToggleRef = useRef<string | null>(null);
  const pendingToggleAdditiveRef = useRef(false);
  const connectorRef = useRef<ConnectorPointerOperation | null>(null);
  const connectRef = useRef<ConnectPointerOperation | null>(null);
  const freeformRef = useRef<FreeformPointerOperation | null>(null);
  const guideCandidatesRef = useRef<readonly Bounds2d[]>([]);
  const selectedConnectorIdRef = useRef<string | null>(null);
  const fittedRef = useRef<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'ready' | 'failed'>('idle');
  const [textEditor, setTextEditor] = useState<
    { readonly nodeId: string; readonly value: string; readonly bounds: Bounds2d } | null
  >(null);
  const capability = useMemo(() => detectWebGlCapability(), []);
  const { t } = useTranslation();

  const state = useFlowStore(
    useShallow((current) => ({
      nodes: current.nodes,
      edges: current.edges,
      documents: current.documents,
      activeDocumentId: current.activeDocumentId,
      pages: current.tabs,
      activePageId: current.activeTabId,
      layers: current.layers,
      selectedNodeId: current.selectedNodeId,
      selectedEdgeId: current.selectedEdgeId,
      activeLayerId: current.activeLayerId,
      setNodes: current.setNodes,
      setSelectedNodeId: current.setSelectedNodeId,
      setSelectedEdgeId: current.setSelectedEdgeId,
      setEdges: current.setEdges,
      setGraph: current.setGraph,
      recordHistoryV2: current.recordHistoryV2,
      applyCanonicalCommand: current.applyCanonicalCommand,
    }))
  );
  // Shared, per-page memoised projection: the store's command path reads the
  // same instance, so both see one canonical document per state.
  const projection = useMemo(() => projectActiveDocumentMemoized(state), [state]);
  // Kept out of `state` so arming a tool never re-projects the document.
  const drawingTool = useFlowStore((current) => current.viewSettings.drawingTool);
  const alignmentGuidesEnabled = useFlowStore(
    (current) => current.viewSettings.alignmentGuidesEnabled
  );

  // The same operations and menu state the React Flow canvas composes, so
  // every menu item here is the exact behaviour users get on fallback.
  const operations = useFlowOperations(recordHistory);
  const { screenToFlowPosition, fitView } = useActiveCanvas();
  const lastPointerRef = useRef<Point2d | null>(null);
  const externalInput = useCanvasExternalInput({
    recordHistory,
    screenToFlowPosition,
    fitView,
    handleAddImage: operations.handleAddImage,
    pasteSelection: operations.pasteSelection,
    getCanvasCenterScreen: () => {
      const rect = viewportRef.current?.getBoundingClientRect();
      return rect
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    },
    getLastInteractionScreen: () => lastPointerRef.current,
  });
  const {
    connectMenu,
    setConnectMenu,
    contextMenu,
    onNodeContextMenu,
    onPaneContextMenu,
    onEdgeContextMenu,
    onCloseContextMenu,
    contextActions,
  } = useFlowCanvasMenusAndActions({
    screenToFlowPosition,
    copySelection: operations.copySelection,
    pasteSelection: operations.pasteSelection,
    pasteSelectionInPlace: operations.pasteSelectionInPlace,
    copyStyleSelection: operations.copyStyleSelection,
    pasteStyleSelection: operations.pasteStyleSelection,
    duplicateNode: operations.duplicateNode,
    deleteNode: operations.deleteNode,
    deleteEdge: operations.deleteEdge,
    updateNodeZIndex: operations.updateNodeZIndex,
    updateNodeType: operations.updateNodeType,
    updateNodeData: operations.updateNodeData,
    fitSectionToContents: operations.fitSectionToContents,
    releaseFromSection: operations.releaseFromSection,
    bringContentsIntoSection: operations.handleBringContentsIntoSection,
    handleAlignNodes: operations.handleAlignNodes,
    handleDistributeNodes: operations.handleDistributeNodes,
    handleGroupNodes: operations.handleGroupNodes,
    handleWrapInSection: operations.handleWrapInSection,
    handleUngroupSection: operations.handleUngroupSection,
    nodes: state.nodes,
  });
  const pendingLabelEdit = usePendingNodeLabelEditRequest();
  const { clearPendingNodeLabelEditRequest } = useNodeLabelEditRequestActions();

  const applyCamera = useCallback((camera: CanvasCamera) => {
    cameraRef.current = camera;
    hostRef.current?.setCamera(camera);
    publishActiveCanvasViewport(camera);
    setTextEditor((current) => {
      if (!current) return null;
      const bounds = hostRef.current?.getNodeScreenBounds(current.nodeId);
      return bounds ? { ...current, bounds } : null;
    });
  }, []);

  const applySelection = useCallback((selection: CanvasSelection) => {
    selectionRef.current = selection;
    hostRef.current?.setSelection(selection.nodeIds, selection.primaryNodeId);
    const projected = projectSelectionToNodes(state.nodes, selection);
    if (projected.nodes) state.setNodes(projected.nodes);
    state.setSelectedNodeId(projected.selectedNodeId);
  }, [state]);


  const applyConnectorSelection = useCallback((
    connectorId: string | null,
    handle: ConnectorEditHandle | null = null
  ) => {
    selectedConnectorIdRef.current = connectorId;
    hostRef.current?.setConnectorSelection(connectorId, handle);
    const projected = projectConnectorSelectionToEdges(state.edges, connectorId);
    if (projected.edges) state.setEdges(projected.edges);
    state.setSelectedEdgeId(projected.selectedEdgeId);
  }, [state]);

  const activePage = projection.status === 'ready'
    ? projection.document.pages.find(({ id }) => id === state.activePageId)
      ?? projection.document.pages[0] ?? null
    : null;

  // Every canonical edit goes through one store action that applies the
  // command, records history, and writes the projection atomically.
  const dispatch = useCallback((build: CanonicalCommandBuilder): boolean => {
    try {
      return state.applyCanonicalCommand(build);
    } catch {
      setStatus('failed');
      return false;
    }
  }, [state]);

  const commitTransform = useCallback((operation: TransformPointerOperation) => {
    hostRef.current?.setTransformPreview(null);
    hostRef.current?.setAlignmentGuides(null);
    const { result } = operation;
    if (!result) return;
    dispatch((document, pageId) => buildProductionTransformCommand(document, pageId, result));
  }, [dispatch]);

  const commitConnector = useCallback((operation: ConnectorPointerOperation) => {
    hostRef.current?.setConnectorPreview(null);
    dispatch((document, pageId) =>
      buildProductionConnectorCommand(document, pageId, operation.before, operation.preview));
  }, [dispatch]);

  const commitNodeMutation = useCallback((mutation: ProductionNodeMutation) => {
    dispatch((document, pageId) => {
      const page = document.pages.find(({ id }) => id === pageId);
      return page ? buildProductionNodeMutationCommand(page, mutation).command : null;
    });
  }, [dispatch]);

  const commitRename = useCallback((nodeId: string, label: string) => {
    commitNodeMutation({ kind: 'rename', nodeId, label });
  }, [commitNodeMutation]);

  const startTextEditing = useCallback((request: LabelEditRequest): boolean => {
    const host = hostRef.current;
    const { nodeId } = request;
    if (!host || !activePage || !isNodeEditableOnLayer(activePage, nodeId)) return false;
    const node = activePage.nodes.find(({ id }) => id === nodeId);
    const bounds = host.getNodeScreenBounds(nodeId);
    if (!node || !bounds) return false;
    const label = typeof node.content.label === 'string' ? node.content.label : '';
    setTextEditor({
      nodeId,
      value: request.replaceExisting ? request.seedText ?? '' : label + (request.seedText ?? ''),
      bounds,
    });
    return true;
  }, [activePage]);

  const cancelTransform = useCallback(() => {
    transformRef.current = null;
    pendingToggleRef.current = null;
    connectorRef.current = null;
    connectRef.current = null;
    freeformRef.current = null;
    hostRef.current?.setTransformPreview(null);
    hostRef.current?.setAlignmentGuides(null);
    hostRef.current?.setConnectorPreview(null);
    hostRef.current?.setConnectionPreview(null);
    hostRef.current?.setFreeformPreview(null);
  }, []);

  const commitFreeform = useCallback((operation: FreeformPointerOperation) => {
    hostRef.current?.setFreeformPreview(null);
    if (!activePage) return;
    const layerId = activePage.layers.some(({ id }) => id === state.activeLayerId)
      ? state.activeLayerId
      : activePage.layers[0]?.id ?? 'default';
    const node = finishFreeformOperation(
      operation, `opencanvas-${operation.tool}-${crypto.randomUUID()}`, layerId
    );
    if (node) commitNodeMutation({ kind: 'insert', node });
  }, [activePage, commitNodeMutation, state.activeLayerId]);

  const finishConnect = useCallback((
    operation: ConnectPointerOperation,
    screen: Point2d,
    client: Point2d
  ) => {
    const host = hostRef.current;
    host?.setConnectionPreview(null);
    if (!host || !operation.moved) return;
    const targetId = host.pickNode(screen);
    if (targetId) {
      const targetBounds = host.getNodesWorldBounds([targetId]);
      // ponytail: the legacy edge factory keeps fallback edges byte-identical
      // to React Flow's; move to the canonical insert-connector command with
      // store ownership (M1 architecture item).
      operations.onConnect({
        source: operation.sourceNodeId,
        target: targetId,
        sourceHandle: operation.side,
        // The target port faces where the connector comes from, not the
        // exact drop pixel, so dropping on the node's middle still looks right.
        targetHandle: targetBounds ? nearestSide(targetBounds, operation.from) : null,
      });
      return;
    }
    const sourceType = state.nodes.find(({ id }) => id === operation.sourceNodeId)?.type ?? null;
    setConnectMenu({
      position: client,
      sourceId: operation.sourceNodeId,
      sourceHandle: operation.side,
      sourceType,
    });
  }, [operations, setConnectMenu, state.nodes]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.code === 'Space') spacePanRef.current = true;
      else if (event.key === 'Escape') {
        if (
          transformRef.current || connectorRef.current
          || connectRef.current || freeformRef.current
        ) {
          cancelTransform();
        } else if (useFlowStore.getState().viewSettings.drawingTool) {
          useFlowStore.getState().setViewSettings({ drawingTool: null });
        } else applySelection(clearSelection());
      }
    };
    const onKeyUp = (event: KeyboardEvent): void => {
      if (event.code === 'Space') spacePanRef.current = false;
    };
    const onBlur = (): void => { spacePanRef.current = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [applySelection, cancelTransform]);

  // Keyboard, inspector, and paste change selection in the store; mirror it
  // here so the overlay never disagrees with the rest of the editor.
  useEffect(() => {
    // Insertion and the inspector set `selectedNodeId` without flagging the
    // node, so the primary counts as selected either way.
    const flagged = state.nodes.filter((node) => node.selected).map(({ id }) => id);
    const primary = state.selectedNodeId && state.nodes.some(({ id }) => id === state.selectedNodeId)
      ? state.selectedNodeId
      : flagged[0] ?? null;
    const nodeIds = primary && !flagged.includes(primary) ? [...flagged, primary] : flagged;
    const current = selectionRef.current;
    if (
      current.primaryNodeId !== primary ||
      current.nodeIds.length !== nodeIds.length ||
      current.nodeIds.some((id, index) => id !== nodeIds[index])
    ) {
      selectionRef.current = { nodeIds, primaryNodeId: primary };
      hostRef.current?.setSelection(nodeIds, primary);
    }
    const connectorId = state.edges.find((edge) => edge.selected)?.id ?? null;
    if (selectedConnectorIdRef.current !== connectorId) {
      selectedConnectorIdRef.current = connectorId;
      hostRef.current?.setConnectorSelection(connectorId, null);
    }
  }, [state.nodes, state.edges, state.selectedNodeId]);

  const semanticSelection = useMemo<CanvasSelection>(() => {
    const nodeIds = state.nodes.filter((node) => node.selected).map(({ id }) => id);
    const primary = state.selectedNodeId ?? nodeIds[0] ?? null;
    return {
      nodeIds: primary && !nodeIds.includes(primary) ? [...nodeIds, primary] : nodeIds,
      primaryNodeId: primary,
    };
  }, [state.nodes, state.selectedNodeId]);

  const usable = capability.supported && projection.status !== 'invalid' && status !== 'failed';

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !usable) return;
    let disposed = false;
    const host = new PixiRendererHost({
      ...openCanvasRendererFamilyFlags(),
      onStatusChange: (next) => {
        if (disposed) return;
        if (next === 'context-lost') setStatus('failed');
        else if (next === 'ready') setStatus('ready');
      },
    });
    hostRef.current = host;
    void host.mount(viewport).catch(() => {
      if (!disposed) setStatus('failed');
    });
    const observer = new ResizeObserver(() => host.resize());
    observer.observe(viewport);
    return () => {
      disposed = true;
      observer.disconnect();
      host.destroy();
      hostRef.current = null;
    };
  }, [usable]);

  // Toolbar, shortcuts, menus, and insertion read the camera through this
  // registration, so they act on the visible canvas instead of React Flow.
  useEffect(() => {
    if (status !== 'ready') return;
    const api = createOpenCanvasSurfaceApi({
      getCamera: () => cameraRef.current,
      applyCamera,
      getViewportSize: () => hostRef.current?.getViewportSize() ?? { width: 1, height: 1 },
      getViewportOrigin: () => {
        const rect = viewportRef.current?.getBoundingClientRect();
        return rect ? { x: rect.left, y: rect.top } : { x: 0, y: 0 };
      },
      getContentBounds: () => hostRef.current?.getContentBounds() ?? null,
      getNodesWorldBounds: (ids) => hostRef.current?.getNodesWorldBounds(ids) ?? null,
    });
    const unregister = registerActiveCanvas(api);
    return () => {
      unregister();
      api.dispose();
    };
  }, [applyCamera, status]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || status !== 'ready' || projection.status !== 'ready') return;
    const page = projection.document.pages.find(({ id }) => id === state.activePageId)
      ?? projection.document.pages[0];
    if (!page) return;
    host.setPage(page);
    // setPage rebuilds renderer objects, so the selection overlay is restated.
    host.setSelection(selectionRef.current.nodeIds, selectionRef.current.primaryNodeId);
    const fitKey = `${projection.document.id}:${page.id}`;
    if (fittedRef.current === fitKey) {
      host.setCamera(cameraRef.current);
      return;
    }
    fittedRef.current = fitKey;
    const bounds = host.getContentBounds();
    applyCamera(bounds ? fitCameraToBounds(bounds, host.getViewportSize()) : DEFAULT_CANVAS_CAMERA);
  }, [applyCamera, projection, state.activePageId, status]);

  // F2, typing on a selected node, "Edit label", and fresh insertions all ask
  // for a label editor through the store or a window event; answer them here
  // since no React Flow node is mounted to do it.
  useEffect(() => {
    if (!pendingLabelEdit || status !== 'ready') return;
    if (startTextEditing(pendingLabelEdit)) clearPendingNodeLabelEditRequest();
  }, [clearPendingNodeLabelEditRequest, pendingLabelEdit, startTextEditing, status]);

  useEffect(() => {
    const onRequest = (event: Event): void => {
      const detail = (event as CustomEvent<LabelEditRequest>).detail;
      if (detail?.nodeId) startTextEditing(detail);
    };
    window.addEventListener(APP_EVENT_NAMES.nodeLabelEditRequest, onRequest);
    return () => window.removeEventListener(APP_EVENT_NAMES.nodeLabelEditRequest, onRequest);
  }, [startTextEditing]);

  if (!usable) return <>{fallback}</>;

  return (
    <div
      ref={viewportRef}
      data-testid="opencanvas-surface"
      className={`relative h-full w-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] ${drawingTool ? 'cursor-crosshair' : ''}`}
      style={{ touchAction: 'none' }}
      tabIndex={0}
      role="application"
      aria-label={t('flowCanvas.canvasLabel', 'Diagram canvas')}
      onDragOver={externalInput.onDragOver}
      onDrop={externalInput.onDrop}
      onPasteCapture={externalInput.onPasteCapture}
      onPointerDown={(event) => {
        const host = hostRef.current;
        if (!host || !isCanvasTarget(event) || (event.button !== 0 && event.button !== 1)) return;
        lastPointerRef.current = { x: event.clientX, y: event.clientY };
        // Focus keeps clipboard paste events arriving at this canvas; an open
        // label editor inside it already has focus and keeps it.
        if (!event.currentTarget.contains(document.activeElement)) {
          event.currentTarget.focus({ preventScroll: true });
        }
        event.currentTarget.setPointerCapture(event.pointerId);
        const screen = surfacePoint(event);
        if (event.pointerType === 'touch') {
          // A finger on a node edits like a mouse would; on empty space it
          // pans, and a second finger turns anything in progress into a pinch.
          const editing = transformRef.current || connectorRef.current
            || connectRef.current || freeformRef.current || marqueeRef.current;
          if (touchRef.current || editing || !host.pickNode(screen)) {
            if (editing) {
              cancelTransform();
              marqueeRef.current = null;
              host.setMarquee(null);
            }
            touchRef.current = beginTouchCameraGesture(
              touchRef.current, event.pointerId, screen, event.timeStamp
            );
            return;
          }
        }
        if (event.button === 1 || spacePanRef.current) {
          panRef.current = beginCameraPan(event.pointerId, screen);
          return;
        }
        if (drawingTool) {
          const rect = event.currentTarget.getBoundingClientRect();
          const start = projectPointerSamples(
            event.nativeEvent, { x: rect.left, y: rect.top }, (point) => host.screenToWorld(point)
          ).confirmed.at(-1) ?? host.screenToWorld(screen);
          freeformRef.current = beginFreeformOperation(event.pointerId, drawingTool, start);
          return;
        }
        const additive = event.shiftKey || event.metaKey || event.ctrlKey;
        // Handles are only drawn for the selected connector, so picking one
        // that is not drawn would start a drag on an invisible target.
        const selectedConnector = selectedConnectorIdRef.current && activePage
          ? activePage.connectors.find(({ id }) => id === selectedConnectorIdRef.current) ?? null
          : null;
        const connectorHandle = selectedConnector ? host.pickConnectorHandle(screen) : null;
        if (selectedConnector && connectorHandle && activePage) {
          host.setConnectorSelection(selectedConnector.id, connectorHandle);
          connectorRef.current = beginConnectorOperation(
            event.pointerId, activePage, selectedConnector, connectorHandle
          );
          return;
        }
        const connectSide = host.pickConnectHandle(screen);
        const sourceNodeId = selectionRef.current.nodeIds[0];
        const sourceBounds = connectSide ? host.getNodesWorldBounds([sourceNodeId]) : null;
        if (connectSide && sourceBounds) {
          connectRef.current = {
            pointerId: event.pointerId,
            sourceNodeId,
            side: connectSide,
            from: sideAnchor(sourceBounds, connectSide),
            startScreen: screen,
            moved: false,
          };
          return;
        }
        const handle = host.pickTransformHandle(screen);
        const nodeId = handle ? null : host.pickNode(screen);
        if (handle || nodeId) {
          if (nodeId) applyConnectorSelection(null);
          const wasSelected = nodeId ? selectionRef.current.nodeIds.includes(nodeId) : false;
          // Deselecting on press would move the wrong set on the drag that
          // follows: additive clicks toggle and plain clicks collapse a
          // multi-selection only once the pointer lifts without dragging.
          pendingToggleRef.current = nodeId && wasSelected ? nodeId : null;
          pendingToggleAdditiveRef.current = additive;
          // A plain click on an already selected node makes it the primary
          // one, so the inspector follows the click even after undo/reload.
          const next = nodeId && !wasSelected
            ? selectionAfterClick(selectionRef.current, nodeId, additive)
            : nodeId && !additive && state.selectedNodeId !== nodeId
              ? { nodeIds: selectionRef.current.nodeIds, primaryNodeId: nodeId }
              : selectionRef.current;
          if (next !== selectionRef.current) applySelection(next);
          // Locked (section or layer) nodes stay selectable but never move.
          const movable = activePage
            ? next.nodeIds.filter((id) => isNodeEditableOnLayer(activePage, id))
            : [];
          if (movable.length > 0 && activePage) {
            transformRef.current = beginTransformOperation(
              event.pointerId, activePage, movable, handle, host.screenToWorld(screen)
            );
            const moving = new Set(movable);
            guideCandidatesRef.current = activePage.nodes
              .filter((node) => !moving.has(node.id))
              .map((node) => host.getNodesWorldBounds([node.id]))
              .filter((bounds): bounds is Bounds2d => bounds !== null);
          }
          return;
        }
        const connectorId = host.pickConnector(screen);
        if (connectorId) {
          applySelection(clearSelection());
          applyConnectorSelection(connectorId);
          return;
        }
        marqueeRef.current = {
          kind: 'marquee',
          pointerId: event.pointerId,
          startScreen: screen,
          startWorld: host.screenToWorld(screen),
          currentScreen: screen,
          additive,
        };
      }}
      onPointerMove={(event) => {
        const host = hostRef.current;
        const screen = surfacePoint(event);
        const touch = touchRef.current;
        if (touch && event.pointerType === 'touch') {
          const moved = moveTouchCameraGesture(
            cameraRef.current, touch, event.pointerId, screen, event.timeStamp
          );
          touchRef.current = moved.gesture;
          if (moved.camera !== cameraRef.current) applyCamera(moved.camera);
          return;
        }
        const pan = panRef.current;
        if (pan && pan.pointerId === event.pointerId) {
          const next = moveCameraPan(cameraRef.current, pan, screen);
          panRef.current = next.gesture;
          applyCamera(next.camera);
          return;
        }
        if (!host) return;
        const freeform = freeformRef.current;
        if (freeform && freeform.pointerId === event.pointerId) {
          const rect = event.currentTarget.getBoundingClientRect();
          const samples = projectPointerSamples(
            event.nativeEvent, { x: rect.left, y: rect.top }, (point) => host.screenToWorld(point)
          );
          const next = updateFreeformOperation(freeform, samples.confirmed);
          freeformRef.current = next;
          host.setFreeformPreview({
            ...freeformPreviewPoints(next, samples.predicted),
            ...freeformPreviewStyle(next.tool),
          });
          return;
        }
        const connect = connectRef.current;
        if (connect && connect.pointerId === event.pointerId) {
          const moved = connect.moved
            || Math.hypot(screen.x - connect.startScreen.x, screen.y - connect.startScreen.y) > 4;
          connectRef.current = { ...connect, moved };
          if (moved) host.setConnectionPreview({ from: connect.from, to: host.screenToWorld(screen) });
          return;
        }
        const connector = connectorRef.current;
        if (connector && connector.pointerId === event.pointerId) {
          const world = host.screenToWorld(screen);
          const next = updateConnectorOperation(
            connector,
            world,
            connector.handle.kind === 'endpoint' ? host.pickNode(screen) : null
          );
          connectorRef.current = next;
          host.setConnectorPreview(next.preview);
          return;
        }
        const transform = transformRef.current;
        if (transform && transform.pointerId === event.pointerId) {
          const world = host.screenToWorld(screen);
          let next = updateTransformOperation(transform, world, !event.altKey);
          // Moves snap to the edges/centres of other nodes; Alt disables all
          // snapping. Guides win over the grid, as on the React Flow canvas,
          // so the candidate is measured on the raw (un-gridded) move.
          let guides: AlignmentSnap | null = null;
          if (!transform.handle && !event.altKey && alignmentGuidesEnabled) {
            const raw = updateTransformOperation(transform, world, false).result;
            const snap = raw
              ? computeAlignmentSnap(
                  raw.bounds, guideCandidatesRef.current,
                  GUIDE_THRESHOLD_PIXELS / cameraRef.current.zoom
                )
              : null;
            if (snap && (snap.x !== null || snap.y !== null)) {
              next = updateTransformOperation(
                transform, { x: world.x + snap.dx, y: world.y + snap.dy }, false
              );
              guides = snap;
            }
          }
          transformRef.current = next;
          host.setTransformPreview(next.result);
          host.setAlignmentGuides(guides);
          return;
        }
        const marquee = marqueeRef.current;
        if (!marquee || marquee.pointerId !== event.pointerId) return;
        marqueeRef.current = { ...marquee, currentScreen: screen };
        host.setMarquee(anchoredMarqueeBounds(marqueeRef.current, cameraRef.current));
      }}
      onPointerUp={(event) => {
        const touch = touchRef.current;
        if (touch && event.pointerType === 'touch') {
          touchRef.current = endTouchCameraGesture(touch, event.pointerId, event.timeStamp).gesture;
          return;
        }
        if (panRef.current?.pointerId === event.pointerId) {
          panRef.current = null;
          return;
        }
        const freeform = freeformRef.current;
        if (freeform && freeform.pointerId === event.pointerId) {
          freeformRef.current = null;
          commitFreeform(freeform);
          return;
        }
        const connect = connectRef.current;
        if (connect && connect.pointerId === event.pointerId) {
          connectRef.current = null;
          finishConnect(connect, surfacePoint(event), { x: event.clientX, y: event.clientY });
          return;
        }
        const connector = connectorRef.current;
        if (connector && connector.pointerId === event.pointerId) {
          connectorRef.current = null;
          commitConnector(connector);
          return;
        }
        const transform = transformRef.current;
        if (transform && transform.pointerId === event.pointerId) {
          transformRef.current = null;
          const toggle = pendingToggleRef.current;
          pendingToggleRef.current = null;
          commitTransform(transform);
          if (!transform.result && toggle) {
            applySelection(pendingToggleAdditiveRef.current
              ? selectionAfterClick(selectionRef.current, toggle, true)
              : replaceSelection([toggle]));
          }
          return;
        }
        const host = hostRef.current;
        const marquee = marqueeRef.current;
        if (!host || !marquee || marquee.pointerId !== event.pointerId) return;
        marqueeRef.current = null;
        host.setMarquee(null);
        const bounds = anchoredMarqueeBounds(marquee, cameraRef.current);
        if (bounds.width < 4 && bounds.height < 4) {
          applySelection(selectionAfterClick(selectionRef.current, null, marquee.additive));
          return;
        }
        const ids = host.pickNodesInScreenBounds(bounds);
        applySelection(marquee.additive
          ? addToSelection(selectionRef.current, ids)
          : replaceSelection(ids));
      }}
      onPointerCancel={() => {
        panRef.current = null;
        touchRef.current = null;
        marqueeRef.current = null;
        hostRef.current?.setMarquee(null);
        cancelTransform();
      }}
      onContextMenu={(event) => {
        const host = hostRef.current;
        if (!host || !isCanvasTarget(event)) return;
        event.preventDefault();
        const screen = surfacePoint(event);
        const nodeId = host.pickNode(screen);
        if (nodeId) {
          if (!selectionRef.current.nodeIds.includes(nodeId)) {
            applySelection(selectionAfterClick(selectionRef.current, nodeId, false));
          }
          const node = state.nodes.find(({ id }) => id === nodeId);
          if (node) onNodeContextMenu(event, node);
          return;
        }
        const connectorId = host.pickConnector(screen);
        if (connectorId) {
          applySelection(clearSelection());
          applyConnectorSelection(connectorId);
          const edge = state.edges.find(({ id }) => id === connectorId);
          if (edge) onEdgeContextMenu(event, edge);
          return;
        }
        onPaneContextMenu(event);
      }}
      onDoubleClick={(event) => {
        if (!isCanvasTarget(event)) return;
        const nodeId = hostRef.current?.pickNode(surfacePoint(event));
        if (nodeId) startTextEditing({ nodeId });
        // Empty space: add a node there, as the React Flow canvas does.
        else operations.handleAddNode(screenToFlowPosition({ x: event.clientX, y: event.clientY }));
      }}
      onWheel={(event) => {
        const host = hostRef.current;
        if (!host || !isCanvasTarget(event)) return;
        const rect = event.currentTarget.getBoundingClientRect();
        applyCamera(zoomReadOnlyCamera(
          cameraRef.current,
          { x: event.clientX - rect.left, y: event.clientY - rect.top },
          event.deltaY
        ));
      }}
    >
      {activePage ? (
        // Screen readers and keyboard users reach every object through this
        // sr-only tree; it mirrors the store's selection.
        <OpenCanvasSemanticSceneTree
          page={activePage}
          selection={semanticSelection}
          selectedConnectorId={state.edges.find((edge) => edge.selected)?.id ?? null}
          onSelectNode={(nodeId, additive) => {
            applyConnectorSelection(null);
            applySelection(selectionAfterClick(selectionRef.current, nodeId, additive));
          }}
          onSelectConnector={(connectorId) => {
            applySelection(clearSelection());
            applyConnectorSelection(connectorId);
          }}
        />
      ) : null}
      <NavigationControls />
      {connectMenu ? (
        <ConnectMenu
          position={connectMenu.position}
          sourceId={connectMenu.sourceId}
          sourceType={connectMenu.sourceType}
          onClose={() => setConnectMenu(null)}
          onSelect={(type, shape, edgePreset) => {
            operations.handleAddAndConnect(
              type,
              screenToFlowPosition(connectMenu.position),
              connectMenu.sourceId,
              connectMenu.sourceHandle,
              shape as NodeData['shape'],
              edgePreset
            );
            setConnectMenu(null);
          }}
          onSelectAsset={(item) => {
            operations.handleAddDomainLibraryItemAndConnect(
              item,
              screenToFlowPosition(connectMenu.position),
              connectMenu.sourceId,
              connectMenu.sourceHandle
            );
            setConnectMenu(null);
          }}
        />
      ) : null}
      {contextMenu.isOpen ? (
        <ContextMenu
          {...contextMenu}
          onClose={onCloseContextMenu}
          onCopy={operations.copySelection}
          onPaste={contextActions.onPaste}
          onPasteInPlace={contextActions.onPasteInPlace}
          onCopyStyle={contextActions.onCopyStyle}
          onPasteStyle={contextActions.onPasteStyle}
          onDuplicate={contextActions.onDuplicate}
          onDelete={contextActions.onDelete}
          onSendToBack={contextActions.onSendToBack}
          onReverseEdge={contextActions.onReverseEdge}
          onChangeNodeType={contextActions.onChangeNodeType}
          onEditLabel={() => {
            contextActions.onEditLabel();
            if (contextMenu.id && contextMenu.type === 'node') {
              startTextEditing({ nodeId: contextMenu.id });
            }
          }}
          onFitSectionToContents={contextActions.onFitSectionToContents}
          onBringContentsIntoSection={contextActions.onBringContentsIntoSection}
          onReleaseFromSection={contextActions.onReleaseFromSection}
          onUngroupSection={contextActions.onUngroupSection}
          onToggleSectionLock={contextActions.onToggleSectionLock}
          onToggleSectionHidden={contextActions.onToggleSectionHidden}
          onGroupSelected={contextActions.onGroupSelected}
          canPaste={true}
          selectedCount={contextActions.selectedCount}
          onAlignNodes={contextActions.onAlignNodes}
          onDistributeNodes={contextActions.onDistributeNodes}
          onTogglePinPosition={contextActions.onTogglePinPosition}
          isPinPositionToggleApplicable={contextActions.isPinPositionToggleApplicable}
          isCurrentNodePinned={contextActions.isCurrentNodePinned}
        />
      ) : null}
      {textEditor ? (
        <OpenCanvasTextEditorOverlay
          key={textEditor.nodeId}
          bounds={textEditor.bounds}
          value={textEditor.value}
          onCancel={() => setTextEditor(null)}
          onCommit={(label) => {
            const { nodeId } = textEditor;
            setTextEditor(null);
            if (label.trim()) commitRename(nodeId, label);
          }}
        />
      ) : null}
    </div>
  );
}
