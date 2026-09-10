import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useTranslation } from 'react-i18next';
import { useFlowStore } from '@/store';
import { projectActiveDocument } from '../application/active-document/activeDocumentProjection';
import {
  projectConnectorSelectionToEdges,
  projectSelectionToNodes,
} from '../application/active-document/productionSelectionBridge';
import { projectProductionConnectorEdit } from '../application/active-document/productionConnectorBridge';
import { applyProductionNodeMutation } from '../application/active-document/productionNodeBridge';
import { isNodeEditableOnLayer } from '../application/active-document/productionLayers';
import { OpenCanvasTextEditorOverlay } from './OpenCanvasTextEditorOverlay';
import { createOpenCanvasSurfaceApi } from './openCanvasSurfaceApi';
import {
  publishActiveCanvasViewport,
  registerActiveCanvas,
  useActiveCanvas,
} from '@/canvas/activeCanvas';
import { ContextMenu } from '@/components/ContextMenu';
import { ConnectMenu } from '@/components/ConnectMenu';
import type { FlowNode, NodeData } from '@/lib/types';
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
import { projectProductionTransform } from '../application/active-document/productionTransformBridge';
import { openCanvasRendererFamilyFlags } from '../application/renderer/rendererFamilyFlags';
import {
  beginCameraPan,
  moveCameraPan,
  zoomReadOnlyCamera,
  type CameraPanGesture,
} from '../application/renderer/readOnlyCameraInteraction';
import { DEFAULT_CANVAS_CAMERA, fitCameraToBounds } from '../domain/camera/camera';
import type { CanvasCamera } from '../domain/camera/types';
import { detectWebGlCapability } from '../infrastructure/pixi/capabilities';
import { PixiRendererHost } from '../infrastructure/pixi/PixiRendererHost';

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
  const marqueeRef = useRef<AnchoredMarqueePointerOperation | null>(null);
  const selectionRef = useRef<CanvasSelection>(EMPTY_CANVAS_SELECTION);
  const spacePanRef = useRef(false);
  const transformRef = useRef<TransformPointerOperation | null>(null);
  const pendingToggleRef = useRef<string | null>(null);
  const connectorRef = useRef<ConnectorPointerOperation | null>(null);
  const connectRef = useRef<ConnectPointerOperation | null>(null);
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
      setNodes: current.setNodes,
      setSelectedNodeId: current.setSelectedNodeId,
      setSelectedEdgeId: current.setSelectedEdgeId,
      setEdges: current.setEdges,
      setGraph: current.setGraph,
      recordHistoryV2: current.recordHistoryV2,
    }))
  );
  const projection = useMemo(
    () => projectActiveDocument(state, new Date().toISOString()),
    [state]
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

  // Projected legacy records carry no transient flags, so every write from
  // the canonical document restates the surface's selection.
  const withSelection = useCallback(
    (nodes: FlowNode[]) => projectSelectionToNodes(nodes, selectionRef.current).nodes ?? nodes,
    []
  );

  const commitTransform = useCallback((operation: TransformPointerOperation) => {
    hostRef.current?.setTransformPreview(null);
    if (!operation.result || projection.status !== 'ready' || !activePage) return;
    try {
      const next = projectProductionTransform(
        projection.document, activePage.id, operation.result, new Date().toISOString()
      );
      state.recordHistoryV2();
      state.setNodes(withSelection(next.nodes));
    } catch {
      setStatus('failed');
    }
  }, [activePage, projection, state, withSelection]);

  const commitConnector = useCallback((operation: ConnectorPointerOperation) => {
    hostRef.current?.setConnectorPreview(null);
    if (projection.status !== 'ready' || !activePage) return;
    try {
      const result = projectProductionConnectorEdit(
        projection.document, activePage.id, operation.before, operation.preview,
        new Date().toISOString()
      );
      if (!result.changed) return;
      state.recordHistoryV2();
      state.setEdges(result.projection.edges);
    } catch {
      setStatus('failed');
    }
  }, [activePage, projection, state]);

  const commitRename = useCallback((nodeId: string, label: string) => {
    if (projection.status !== 'ready' || !activePage) return;
    try {
      const result = applyProductionNodeMutation(
        projection.document, activePage.id, { kind: 'rename', nodeId, label },
        new Date().toISOString()
      );
      if (!result.changed) return;
      state.recordHistoryV2();
      state.setGraph(withSelection(result.projection.nodes), result.projection.edges);
    } catch {
      setStatus('failed');
    }
  }, [activePage, projection, state, withSelection]);

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
    hostRef.current?.setTransformPreview(null);
    hostRef.current?.setConnectorPreview(null);
    hostRef.current?.setConnectionPreview(null);
  }, []);

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
        targetHandle: targetBounds ? nearestSide(targetBounds, host.screenToWorld(screen)) : null,
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
        if (transformRef.current || connectorRef.current) cancelTransform();
        else applySelection(clearSelection());
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
      className="relative h-full w-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
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
        if (event.button === 1 || spacePanRef.current) {
          panRef.current = beginCameraPan(event.pointerId, screen);
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
          // Deselecting on press would move the wrong set on the drag that follows.
          pendingToggleRef.current = nodeId && wasSelected && additive ? nodeId : null;
          // A plain click on an already selected node makes it the primary
          // one, so the inspector follows the click even after undo/reload.
          const next = nodeId && !wasSelected
            ? selectionAfterClick(selectionRef.current, nodeId, additive)
            : nodeId && !additive && state.selectedNodeId !== nodeId
              ? { nodeIds: selectionRef.current.nodeIds, primaryNodeId: nodeId }
              : selectionRef.current;
          if (next !== selectionRef.current) applySelection(next);
          if (next.nodeIds.length > 0 && activePage) {
            transformRef.current = beginTransformOperation(
              event.pointerId, activePage, next.nodeIds, handle, host.screenToWorld(screen)
            );
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
        const pan = panRef.current;
        if (pan && pan.pointerId === event.pointerId) {
          const next = moveCameraPan(cameraRef.current, pan, screen);
          panRef.current = next.gesture;
          applyCamera(next.camera);
          return;
        }
        if (!host) return;
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
          const next = updateTransformOperation(
            transform, host.screenToWorld(screen), !event.altKey
          );
          transformRef.current = next;
          host.setTransformPreview(next.result);
          return;
        }
        const marquee = marqueeRef.current;
        if (!marquee || marquee.pointerId !== event.pointerId) return;
        marqueeRef.current = { ...marquee, currentScreen: screen };
        host.setMarquee(anchoredMarqueeBounds(marqueeRef.current, cameraRef.current));
      }}
      onPointerUp={(event) => {
        if (panRef.current?.pointerId === event.pointerId) {
          panRef.current = null;
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
            applySelection(selectionAfterClick(selectionRef.current, toggle, true));
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
