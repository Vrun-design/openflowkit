import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
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
import type { Bounds2d } from '../domain/geometry/types';
import {
  beginConnectorOperation,
  updateConnectorOperation,
  type ConnectorPointerOperation,
} from './pixiConnectorOperations';
import type { ConnectorEditHandle } from '../domain/connectors/editing';
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

function surfacePoint(
  event: React.MouseEvent<HTMLDivElement>
): { x: number; y: number } {
  const bounds = event.currentTarget.getBoundingClientRect();
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
}

interface OpenCanvasSurfaceProps {
  /** React Flow canvas rendered instead whenever OpenCanvas cannot draw. */
  readonly fallback: React.ReactNode;
}

/**
 * Draws the active page with the OpenCanvas renderer inside the production
 * editor chrome, with camera navigation, selection, and transforms.
 */
export function OpenCanvasSurface({ fallback }: OpenCanvasSurfaceProps): React.JSX.Element {
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
  const selectedConnectorIdRef = useRef<string | null>(null);
  const fittedRef = useRef<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'ready' | 'failed'>('idle');
  const [textEditor, setTextEditor] = useState<
    { readonly nodeId: string; readonly value: string; readonly bounds: Bounds2d } | null
  >(null);
  const capability = useMemo(() => detectWebGlCapability(), []);

  const state = useFlowStore(
    useShallow((current) => ({
      nodes: current.nodes,
      edges: current.edges,
      documents: current.documents,
      activeDocumentId: current.activeDocumentId,
      pages: current.tabs,
      activePageId: current.activeTabId,
      layers: current.layers,
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

  const applyCamera = useCallback((camera: CanvasCamera) => {
    cameraRef.current = camera;
    hostRef.current?.setCamera(camera);
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

  const commitTransform = useCallback((operation: TransformPointerOperation) => {
    hostRef.current?.setTransformPreview(null);
    if (!operation.result || projection.status !== 'ready' || !activePage) return;
    try {
      const next = projectProductionTransform(
        projection.document, activePage.id, operation.result, new Date().toISOString()
      );
      state.recordHistoryV2();
      state.setNodes(next.nodes);
    } catch {
      setStatus('failed');
    }
  }, [activePage, projection, state]);

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
      state.setGraph(result.projection.nodes, result.projection.edges);
    } catch {
      setStatus('failed');
    }
  }, [activePage, projection, state]);

  const cancelTransform = useCallback(() => {
    transformRef.current = null;
    pendingToggleRef.current = null;
    connectorRef.current = null;
    hostRef.current?.setTransformPreview(null);
    hostRef.current?.setConnectorPreview(null);
  }, []);

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

  if (!usable) return <>{fallback}</>;

  return (
    <div
      ref={viewportRef}
      data-testid="opencanvas-surface"
      className="h-full w-full"
      onPointerDown={(event) => {
        const host = hostRef.current;
        if (!host || (event.button !== 0 && event.button !== 1)) return;
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
        const handle = host.pickTransformHandle(screen);
        const nodeId = handle ? null : host.pickNode(screen);
        if (handle || nodeId) {
          if (nodeId) applyConnectorSelection(null);
          const wasSelected = nodeId ? selectionRef.current.nodeIds.includes(nodeId) : false;
          // Deselecting on press would move the wrong set on the drag that follows.
          pendingToggleRef.current = nodeId && wasSelected && additive ? nodeId : null;
          const next = nodeId && !wasSelected
            ? selectionAfterClick(selectionRef.current, nodeId, additive)
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
      onDoubleClick={(event) => {
        const host = hostRef.current;
        if (!host || !activePage) return;
        const nodeId = host.pickNode(surfacePoint(event));
        if (!nodeId || !isNodeEditableOnLayer(activePage, nodeId)) return;
        const node = activePage.nodes.find(({ id }) => id === nodeId);
        const bounds = host.getNodeScreenBounds(nodeId);
        if (!node || !bounds) return;
        setTextEditor({
          nodeId,
          value: typeof node.content.label === 'string' ? node.content.label : node.id,
          bounds,
        });
      }}
      onWheel={(event) => {
        const host = hostRef.current;
        if (!host) return;
        const rect = event.currentTarget.getBoundingClientRect();
        applyCamera(zoomReadOnlyCamera(
          cameraRef.current,
          { x: event.clientX - rect.left, y: event.clientY - rect.top },
          event.deltaY
        ));
      }}
    >
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
