import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { ROLLOUT_FLAGS } from '@/config/rolloutFlags';
import { useFlowStore } from '@/store';
import { projectActiveDocument } from '../application/active-document/activeDocumentProjection';
import {
  buildProductionConnectorCommand,
  buildProductionPortConnectorCommand,
  buildProductionRemoveConnectorCommand,
  projectProductionConnectorEdit,
} from '../application/active-document/productionConnectorBridge';
import {
  PRODUCTION_NODE_CATALOG,
  createProductionSceneNode,
} from '../application/active-document/productionNodeCatalog';
import {
  applyProductionNodeMutation,
  buildProductionNodeMutationCommand,
  createProductionProcessNode,
  createProductionFreeformNode,
  type ProductionNodeMutation,
} from '../application/active-document/productionNodeBridge';
import {
  buildProductionTransformCommand,
  projectProductionTransform,
} from '../application/active-document/productionTransformBridge';
import {
  addToSelection,
  clearSelection,
  replaceSelection,
  selectionAnnouncement,
  type CanvasSelection,
} from '../application/selection/selection';
import { arrowSpatialDirection, spatialNeighborId } from '../application/selection/spatialNavigation';
import { canvasRendererLocation } from '../application/renderer/rendererSelection';
import { openCanvasRendererFamilyFlags } from '../application/renderer/rendererFamilyFlags';
import {
  beginCameraPan,
  moveCameraPan,
  releaseCameraPanVelocity,
  zoomReadOnlyCamera,
} from '../application/renderer/readOnlyCameraInteraction';
import {
  resolveWheelGesture,
  type WheelGestureState,
} from '../application/renderer/wheelGesture';
import {
  beginTouchCameraGesture,
  endTouchCameraGesture,
  moveTouchCameraGesture,
  type TouchCameraGesture,
} from '../application/renderer/touchCameraGesture';
import { DEFAULT_CANVAS_CAMERA, fitCameraToBounds, panCamera, zoomCameraAt } from '../domain/camera/camera';
import type { CanvasCamera } from '../domain/camera/types';
import { cameraEquals } from '../domain/camera/transition';
import type { Bounds2d } from '../domain/geometry/types';
import {
  resetConnectorRoute,
  setPrimaryConnectorLabel,
  type ConnectorEditHandle,
} from '../domain/connectors/editing';
import type { SceneConnector, SceneDocumentV1 } from '../domain/document/types';
import { applyDocumentCommand } from '../domain/commands/execute';
import type { DocumentCommand } from '../domain/commands/types';
import { createTransformSnapshot, moveTransform } from '../domain/transforms/transformSelection';
import {
  alignNodes,
  distributeNodes,
  gridNodes,
  packNodes,
  stackNodes,
  tidyNodes,
} from '../domain/transforms/arrangement';
import type { TransformResult } from '../domain/transforms/types';
import {
  anchoredMarqueeBounds,
  arrowNudgeDelta,
  beginTransformOperation,
  isEditableTarget,
  selectionAfterClick,
  updateTransformOperation,
} from './pixiPointerOperations';
import {
  beginConnectorOperation,
  updateConnectorOperation,
} from './pixiConnectorOperations';
import { detectWebGlCapability } from '../infrastructure/pixi/capabilities';
import { PixiRendererHost, type PixiRendererStatus } from '../infrastructure/pixi/PixiRendererHost';
import { projectSceneDocumentToReactFlow } from '../infrastructure/reactflow/toReactFlow';
import { useOpenCanvasCanonicalCollaboration } from './useOpenCanvasCanonicalCollaboration';
import { OpenCanvasNodePropertyForm } from './OpenCanvasNodePropertyForm';
import { OpenCanvasNodeSizingForm } from './OpenCanvasNodeSizingForm';
import { OpenCanvasPageThumbnail } from './OpenCanvasPageThumbnail';
import { OpenCanvasTextEditorOverlay } from './v2/OpenCanvasTextEditorOverlay';
import { OpenCanvasCameraControls } from './OpenCanvasCameraControls';
import { OpenCanvasSemanticSceneTree } from './v2/OpenCanvasSemanticSceneTree';
import { CameraMotionController } from './CameraMotionController';
import { CameraInertiaController } from './CameraInertiaController';
import { EdgeScrollController } from './EdgeScrollController';
import { PixiNodeLayoutBar } from './PixiNodeLayoutBar';
import { resolveNodeContentLayout } from '../domain/node-layout/model';
import { buildProductionNodeLayoutCommand } from '../application/active-document/productionNodeLayout';
import { exportCanonicalSvg } from '../infrastructure/export/canonicalSvg';
import { serializeCanonicalJson } from '../infrastructure/export/canonicalJson';
import { lintStructuredPage } from '../domain/structured/diagramValidation';
import { buildProductionScopedLayoutCommand } from '../application/active-document/productionScopedLayout';
import { buildSetCanvasPrecisionCommand, resolveCanvasPrecisionSettings } from '../application/active-document/productionPrecision';
import { OpenCanvasPrecisionForm } from './OpenCanvasPrecisionForm';
import {
  buildProductionLayerCommand,
  buildProductionInsertLayerCommand,
  buildProductionNodeLayerCommand,
  buildProductionRemoveLayerCommand,
  buildProductionReorderLayerCommand,
  isNodeEditableOnLayer,
} from '../application/active-document/productionLayers';
import {
  buildProductionDuplicatePageCommand,
  buildProductionInsertPageCommand,
  buildProductionRemovePageCommand,
  buildProductionRenamePageCommand,
  buildProductionReorderPageCommand,
} from '../application/active-document/productionPages';
import {
  buildProductionReparentCommand,
  buildProductionZOrderCommand,
  productionParentCandidates,
} from '../application/active-document/productionOrganization';
import {
  buildPasteProductionNodeStyleCommand,
  buildPasteProductionSelectionCommand,
  copyProductionNodeStyle,
  copyProductionSelection,
  type ProductionClipboardSnapshot,
  type ProductionStyleSnapshot,
} from '../application/active-document/productionClipboard';
import {
  buildCreateSymbolDefinitionCommand,
  buildCreateSymbolInstanceCommand,
  buildSetSymbolOverridesCommand,
  buildUpdateSymbolDefinitionCommand,
  symbolBinding,
} from '../application/active-document/productionSymbols';
import './pixiSpikePage.css';
import { beginFreeformOperation, finishFreeformOperation, freeformPreviewPoints,
  freeformPreviewStyle, updateFreeformEdgeScrollOperation, updateFreeformOperation,
  type DrawingTool } from './pixiFreeformOperations';
import {
  cancelProductionCanvasGesture,
  type ProductionCanvasPointerOperation,
} from './pixiGestureCancellation';
import { projectPointerSamples } from './pointerSampleProjection';

export const OPEN_CANVAS_CANARY_FALLBACK_EVENT = 'openflowkit:opencanvas-canary-fallback';

function userPrefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function downloadCanonicalArtifact(
  name: string,
  extension: 'json' | 'svg',
  mimeType: string,
  content: string
): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const anchor = document.createElement('a');
  const baseName = name.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase() || 'diagram';
  anchor.href = url;
  anchor.download = `${baseName}.${extension}`;
  anchor.click();
  queueMicrotask(() => URL.revokeObjectURL(url));
}

interface ActiveTextEditor {
  readonly nodeId: string;
  readonly value: string;
  readonly bounds: Bounds2d;
}

function touchPointerIds(gesture: TouchCameraGesture): readonly number[] {
  return gesture.kind === 'single'
    ? [gesture.pointer.id]
    : gesture.pointers.map((pointer) => pointer.id);
}

const INSERT_CATALOG_GROUPS = [
  ...PRODUCTION_NODE_CATALOG.reduce((groups, entry) => {
    groups.set(entry.group, [...(groups.get(entry.group) ?? []), entry]);
    return groups;
  }, new Map<string, (typeof PRODUCTION_NODE_CATALOG)[number][]>()),
];

export function OpenCanvasDocumentPage(): React.JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const viewportRef = useRef<HTMLElement>(null);
  const hostRef = useRef<PixiRendererHost | null>(null);
  const cameraRef = useRef<CanvasCamera>(DEFAULT_CANVAS_CAMERA);
  const previousCameraRef = useRef<CanvasCamera | null>(null);
  const cameraMotionRef = useRef<CameraMotionController | null>(null);
  const cameraInertiaRef = useRef<CameraInertiaController | null>(null);
  const edgeScrollRef = useRef<EdgeScrollController | null>(null);
  const wheelGestureRef = useRef<WheelGestureState | null>(null);
  const touchCameraGestureRef = useRef<TouchCameraGesture | null>(null);
  const spacePanRef = useRef(false);
  const pointerOperationRef = useRef<ProductionCanvasPointerOperation | null>(null);
  const fittedDocumentRef = useRef<string | null>(null);
  const additiveSelectionRef = useRef(false);
  const pendingSelectionToggleRef = useRef<string | null>(null);
  const selectionRef = useRef<CanvasSelection>(clearSelection());
  const selectedConnectorIdRef = useRef<string | null>(null);
  const activeConnectorHandleRef = useRef<ConnectorEditHandle | null>(null);
  const gestureSelectionSnapshotRef = useRef<{
    readonly selection: CanvasSelection;
    readonly connectorId: string | null;
  } | null>(null);
  const clipboardRef = useRef<ProductionClipboardSnapshot | null>(null);
  const editingNodeIdRef = useRef<string | null>(null);
  const [clipboard, setClipboard] = useState<ProductionClipboardSnapshot | null>(null);
  const [styleClipboard, setStyleClipboard] = useState<ProductionStyleSnapshot | null>(null);
  const [status, setStatus] = useState<PixiRendererStatus>('initializing');
  const [semanticSelection, setSemanticSelection] = useState<CanvasSelection>(clearSelection());
  const [selectionMessage, setSelectionMessage] = useState('Canvas selection cleared.');
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [drawingTool, setDrawingTool] = useState<DrawingTool | null>(null);
  const [insertCatalogId, setInsertCatalogId] = useState<string>(
    PRODUCTION_NODE_CATALOG[0]!.id
  );
  const [textEditor, setTextEditor] = useState<ActiveTextEditor | null>(null);
  const [canRecallPreviousCamera, setCanRecallPreviousCamera] = useState(false);
  const [renderDiagnostics, setRenderDiagnostics] = useState<ReturnType<
    PixiRendererHost['getRenderDiagnostics']
  > | null>(null);
  const fallbackPath = canvasRendererLocation(
    location.pathname,
    location.search,
    'reactflow'
  );
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
      setEdges: current.setEdges,
      setGraph: current.setGraph,
      setGraphAndLayers: current.setGraphAndLayers,
      replacePageWorkspace: current.replacePageWorkspace,
      setActivePageId: current.setActiveTabId,
      recordHistoryV2: current.recordHistoryV2,
      undoV2: current.undoV2,
      redoV2: current.redoV2,
      canUndo: current.canUndoV2(),
      canRedo: current.canRedoV2(),
    }))
  );
  const projection = useMemo(
    () => projectActiveDocument(state, new Date().toISOString()),
    [state]
  );
  const activeScenePage = projection.status === 'ready'
    ? projection.document.pages.find((page) => page.id === state.activePageId)
      ?? projection.document.pages[0]
    : null;
  const structuredLintIssues = useMemo(() => activeScenePage
    ? lintStructuredPage(activeScenePage) : [], [activeScenePage]);

  const fallback = useCallback((code: string) => {
    window.dispatchEvent(new CustomEvent(OPEN_CANVAS_CANARY_FALLBACK_EVENT, {
      detail: { code },
    }));
    navigate(fallbackPath, { replace: true });
  }, [fallbackPath, navigate]);

  const replaceWorkspaceFromDocument = useCallback((document: SceneDocumentV1) => {
    const existingById = new Map(state.pages.map((page) => [page.id, page]));
    const tabs = document.pages.map((page) => {
      const next = projectSceneDocumentToReactFlow(document, page.id);
      const existing = existingById.get(page.id);
      return {
        id: page.id, name: page.name,
        diagramType: page.diagramKind as typeof state.pages[number]['diagramType'],
        updatedAt: new Date().toISOString(), nodes: next.nodes, edges: next.edges,
        layers: [...next.layers], playback: existing?.playback,
        canvasExtensions: structuredClone(next.pageExtensions),
        history: existing?.history ?? { past: [], future: [] },
      };
    });
    if (tabs.length === 0) return false;
    const activePageId = tabs.some((page) => page.id === state.activePageId)
      ? state.activePageId : tabs[0].id;
    state.replacePageWorkspace(tabs, activePageId);
    return true;
  }, [state]);

  const canonicalCollaboration = useOpenCanvasCanonicalCollaboration({
    document: projection.status === 'ready' ? projection.document : null,
    pageId: projection.status === 'ready' ? activeScenePage!.id : null,
    onBeforeLocalApply: state.recordHistoryV2,
    onConflict: () => fallback('COLLABORATION_COMMAND_REJECTED'),
    onDocumentChange: (document) => {
      if (!replaceWorkspaceFromDocument(document)) fallback('COLLABORATION_DOCUMENT_INVALID');
    },
  });

  const applyCamera = useCallback((camera: CanvasCamera) => {
    cameraRef.current = camera;
    hostRef.current?.setCamera(camera);
    viewportRef.current?.setAttribute('data-camera-zoom', camera.zoom.toFixed(4));
    viewportRef.current?.setAttribute('data-camera-x', camera.x.toFixed(2));
    viewportRef.current?.setAttribute('data-camera-y', camera.y.toFixed(2));
    setTextEditor((current) => {
      if (!current) return null;
      const bounds = hostRef.current?.getNodeScreenBounds(current.nodeId);
      return bounds ? { ...current, bounds } : null;
    });
  }, []);

  const animateCamera = useCallback((from: CanvasCamera, to: CanvasCamera) => {
    cameraInertiaRef.current?.cancel();
    cameraMotionRef.current ??= new CameraMotionController();
    cameraMotionRef.current.start(from, to, applyCamera, {
      reducedMotion: userPrefersReducedMotion(),
    });
  }, [applyCamera]);

  const startCameraInertia = useCallback((velocity: { x: number; y: number }) => {
    cameraInertiaRef.current ??= new CameraInertiaController();
    cameraInertiaRef.current.start(velocity, (delta) => {
      applyCamera(panCamera(cameraRef.current, delta));
    }, { reducedMotion: userPrefersReducedMotion() });
  }, [applyCamera]);

  const updateDragEdgeScroll = useCallback((point: { x: number; y: number }, snap: boolean) => {
    const host = hostRef.current;
    const operation = pointerOperationRef.current;
    if (!host || (operation?.kind !== 'transform' && operation?.kind !== 'connector-edit'
      && operation?.kind !== 'freeform' && operation?.kind !== 'marquee')) {
      edgeScrollRef.current?.cancel();
      return;
    }
    edgeScrollRef.current ??= new EdgeScrollController();
    edgeScrollRef.current.update(point, host.getViewportSize(), (delta) => {
      const currentHost = hostRef.current;
      const currentOperation = pointerOperationRef.current;
      if (!currentHost || (currentOperation?.kind !== 'transform'
        && currentOperation?.kind !== 'connector-edit' && currentOperation?.kind !== 'freeform'
        && currentOperation?.kind !== 'marquee')) {
        edgeScrollRef.current?.cancel();
        return;
      }
      applyCamera(panCamera(cameraRef.current, delta));
      const worldPoint = currentHost.screenToWorld(point);
      if (currentOperation.kind === 'transform') {
        const next = updateTransformOperation(currentOperation, worldPoint, snap);
        pointerOperationRef.current = next;
        currentHost.setTransformPreview(next.result);
        return;
      }
      if (currentOperation.kind === 'freeform') {
        const next = updateFreeformEdgeScrollOperation(currentOperation, worldPoint);
        pointerOperationRef.current = next;
        currentHost.setFreeformPreview({
          ...freeformPreviewPoints(next, []),
          ...freeformPreviewStyle(next.tool),
        });
        return;
      }
      if (currentOperation.kind === 'marquee') {
        currentHost.setMarquee(anchoredMarqueeBounds(currentOperation, cameraRef.current));
        return;
      }
      const next = updateConnectorOperation(
        currentOperation,
        worldPoint,
        currentOperation.handle.kind === 'endpoint' ? currentHost.pickNode(point) : null
      );
      pointerOperationRef.current = next;
      currentHost.setConnectorPreview(next.preview);
    });
  }, [applyCamera]);

  const transitionToCamera = useCallback((target: CanvasCamera) => {
    const current = cameraRef.current;
    if (cameraEquals(current, target)) return;
    previousCameraRef.current = current;
    setCanRecallPreviousCamera(true);
    animateCamera(current, target);
  }, [animateCamera]);

  const fitPageCamera = useCallback(() => {
    const host = hostRef.current;
    const bounds = host?.getContentBounds();
    if (host && bounds) transitionToCamera(fitCameraToBounds(bounds, host.getViewportSize()));
  }, [transitionToCamera]);

  const fitSelectionCamera = useCallback(() => {
    const host = hostRef.current;
    const bounds = host?.getSelectionWorldBounds();
    if (host && bounds) transitionToCamera(fitCameraToBounds(bounds, host.getViewportSize()));
  }, [transitionToCamera]);

  const resetCameraZoom = useCallback(() => {
    const host = hostRef.current;
    if (!host) return;
    const viewport = host.getViewportSize();
    transitionToCamera(zoomCameraAt(cameraRef.current, {
      x: viewport.width / 2,
      y: viewport.height / 2,
    }, 1));
  }, [transitionToCamera]);

  const recallPreviousCamera = useCallback(() => {
    const previous = previousCameraRef.current;
    if (!previous) return;
    const current = cameraRef.current;
    previousCameraRef.current = current;
    animateCamera(current, previous);
  }, [animateCamera]);

  const applySelection = useCallback((selection: CanvasSelection) => {
    selectionRef.current = selection;
    setSemanticSelection(selection);
    hostRef.current?.setSelection(selection.nodeIds, selection.primaryNodeId);
    setSelectionMessage(selectionAnnouncement(selection));
  }, []);

  const applyConnectorSelection = useCallback((
    connectorId: string | null,
    handle: ConnectorEditHandle | null = null
  ) => {
    selectedConnectorIdRef.current = connectorId;
    activeConnectorHandleRef.current = handle;
    setSelectedConnectorId(connectorId);
    if (connectorId) applySelection(clearSelection());
    hostRef.current?.setConnectorSelection(connectorId, handle);
  }, [applySelection]);

  const commitTransform = useCallback((result: TransformResult) => {
    if (projection.status !== 'ready') return;
    if (result.nodes.some((node) => !isNodeEditableOnLayer(activeScenePage!, node.id))) return;
    try {
      if (canonicalCollaboration.running) {
        const command = buildProductionTransformCommand(
          projection.document, activeScenePage!.id, result
        );
        if (!canonicalCollaboration.submit(command)) fallback('COLLABORATION_COMMAND_REJECTED');
        return;
      }
      const next = projectProductionTransform(
        projection.document,
        activeScenePage!.id,
        result,
        new Date().toISOString()
      );
      state.recordHistoryV2();
      state.setNodes(next.nodes);
    } catch {
      fallback('TRANSFORM_COMMIT_FAILED');
    }
  }, [activeScenePage, canonicalCollaboration, fallback, projection, state]);

  const commitConnector = useCallback((before: SceneConnector, after: SceneConnector) => {
    if (projection.status !== 'ready') return;
    try {
      if (canonicalCollaboration.running) {
        const command = buildProductionConnectorCommand(
          projection.document, activeScenePage!.id, before, after
        );
        if (command && !canonicalCollaboration.submit(command)) {
          fallback('COLLABORATION_COMMAND_REJECTED');
        }
        return;
      }
      const result = projectProductionConnectorEdit(
        projection.document,
        activeScenePage!.id,
        before,
        after,
        new Date().toISOString()
      );
      if (!result.changed) return;
      state.recordHistoryV2();
      state.setEdges(result.projection.edges);
    } catch {
      fallback('CONNECTOR_COMMIT_FAILED');
    }
  }, [activeScenePage, canonicalCollaboration, fallback, projection, state]);

  const commitDocumentCommand = useCallback((command: DocumentCommand) => {
    if (projection.status !== 'ready') return false;
    try {
      let effectiveCommand = command;
      if (command.kind === 'set-node') {
        const binding = symbolBinding(command.before);
        const page = projection.document.pages.find(({ id }) => id === command.pageId);
        if (binding?.role === 'definition' && page) {
          effectiveCommand = buildUpdateSymbolDefinitionCommand(
            page, binding.definitionId, command.after
          );
        }
      }
      if (canonicalCollaboration.running) {
        if (!canonicalCollaboration.submit(effectiveCommand)) {
          fallback('COLLABORATION_COMMAND_REJECTED');
          return false;
        }
        return true;
      }
      const document = applyDocumentCommand(projection.document, effectiveCommand).document;
      state.recordHistoryV2();
      if (!replaceWorkspaceFromDocument(document)) return false;
      return true;
    } catch {
      fallback('DOCUMENT_COMMAND_FAILED');
      return false;
    }
  }, [canonicalCollaboration, fallback, projection, replaceWorkspaceFromDocument, state]);

  const commitNodeMutation = useCallback((mutation: ProductionNodeMutation) => {
    if (projection.status !== 'ready') return;
    if (mutation.kind !== 'insert'
      && !isNodeEditableOnLayer(activeScenePage!, mutation.nodeId)) return;
    try {
      if (canonicalCollaboration.running) {
        const result = buildProductionNodeMutationCommand(
          activeScenePage!, mutation
        );
        if (result.command && !canonicalCollaboration.submit(result.command)) {
          fallback('COLLABORATION_COMMAND_REJECTED');
          return;
        }
        applyConnectorSelection(null);
        applySelection(result.selectedNodeId
          ? { nodeIds: [result.selectedNodeId], primaryNodeId: result.selectedNodeId }
          : clearSelection());
        return;
      }
      const result = applyProductionNodeMutation(
        projection.document,
        activeScenePage!.id,
        mutation,
        new Date().toISOString()
      );
      if (!result.changed) return;
      state.recordHistoryV2();
      state.setGraph(result.projection.nodes, result.projection.edges);
      applyConnectorSelection(null);
      applySelection(result.selectedNodeId
        ? { nodeIds: [result.selectedNodeId], primaryNodeId: result.selectedNodeId }
        : clearSelection());
    } catch {
      fallback('NODE_COMMIT_FAILED');
    }
  }, [
    activeScenePage, applyConnectorSelection, applySelection, canonicalCollaboration,
    fallback, projection, state,
  ]);

  const startTextEditing = useCallback((nodeId: string) => {
    const node = activeScenePage?.nodes.find((candidate) => candidate.id === nodeId);
    const bounds = hostRef.current?.getNodeScreenBounds(nodeId);
    if (!node || !bounds || !isNodeEditableOnLayer(activeScenePage!, nodeId)) return;
    editingNodeIdRef.current = nodeId;
    setTextEditor({
      nodeId,
      value: typeof node.content.label === 'string' ? node.content.label : node.id,
      bounds,
    });
  }, [activeScenePage]);

  const closeTextEditor = useCallback(() => {
    editingNodeIdRef.current = null;
    setTextEditor(null);
    viewportRef.current?.focus();
  }, []);

  const cancelPointerOperation = useCallback((capture: HTMLElement | null = viewportRef.current) => {
    edgeScrollRef.current?.cancel();
    const touchGesture = touchCameraGestureRef.current;
    if (touchGesture && capture) {
      for (const pointerId of touchPointerIds(touchGesture)) {
        if (capture.hasPointerCapture(pointerId)) capture.releasePointerCapture(pointerId);
      }
    }
    touchCameraGestureRef.current = null;
    const operation = pointerOperationRef.current;
    const operationCanceled = cancelProductionCanvasGesture(operation, hostRef.current, capture);
    if (!operationCanceled && !touchGesture) return false;
    pointerOperationRef.current = null;
    pendingSelectionToggleRef.current = null;
    activeConnectorHandleRef.current = null;
    const snapshot = gestureSelectionSnapshotRef.current;
    gestureSelectionSnapshotRef.current = null;
    if (snapshot) {
      applySelection(snapshot.selection);
      applyConnectorSelection(snapshot.connectorId);
    } else {
      hostRef.current?.setConnectorSelection(selectedConnectorIdRef.current, null);
    }
    setSelectionMessage('Gesture canceled. Document unchanged.');
    return true;
  }, [applyConnectorSelection, applySelection]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    if (isEditableTarget(event.target)) return;
    if (event.code === 'Space' && event.target === viewportRef.current) {
      spacePanRef.current = true;
      event.preventDefault();
      return;
    }
    if (event.shiftKey && (event.code === 'Digit1' || event.key === '1')) {
      fitPageCamera();
      event.preventDefault();
      return;
    }
    if (event.shiftKey && (event.code === 'Digit2' || event.key === '2')) {
      fitSelectionCamera();
      event.preventDefault();
      return;
    }
    if (event.shiftKey && (event.code === 'Digit0' || event.key === '0')) {
      recallPreviousCamera();
      event.preventDefault();
      return;
    }
    if ((event.code === 'Digit0' || event.key === '0')
      && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
      resetCameraZoom();
      event.preventDefault();
      return;
    }
    if (event.key === 'Escape') {
      const cameraWasMoving = cameraMotionRef.current?.running === true
        || cameraInertiaRef.current?.running === true;
      cameraMotionRef.current?.cancel();
      cameraInertiaRef.current?.cancel();
      if (!cancelPointerOperation() && !cameraWasMoving) {
        applySelection(clearSelection());
        applyConnectorSelection(null);
      }
      event.preventDefault();
      return;
    }
    if (event.key.toLowerCase() === 'z' && (event.metaKey || event.ctrlKey)) {
      if (canonicalCollaboration.running) {
        if (event.shiftKey) canonicalCollaboration.redo();
        else canonicalCollaboration.undo();
        event.preventDefault();
        return;
      }
      if (event.shiftKey) state.redoV2();
      else state.undoV2();
      event.preventDefault();
      return;
    }
    const selected = selectionRef.current.nodeIds;
    const enterOnCanvas = event.key === 'Enter' && event.target === viewportRef.current;
    if ((event.key === 'F2' || enterOnCanvas) && selected.length === 1) {
      startTextEditing(selected[0]);
      event.preventDefault();
      return;
    }
    const spatialDirection = event.altKey ? arrowSpatialDirection(event.key) : null;
    if (spatialDirection && projection.status === 'ready') {
      const nextId = spatialNeighborId(
        activeScenePage!,
        selectionRef.current.primaryNodeId,
        spatialDirection
      );
      if (nextId) {
        applyConnectorSelection(null);
        applySelection({ nodeIds: [nextId], primaryNodeId: nextId });
      }
      event.preventDefault();
      return;
    }
    if ((event.key === 'Delete' || event.key === 'Backspace') && selected.length === 1) {
      commitNodeMutation({ kind: 'delete', nodeId: selected[0] });
      event.preventDefault();
      return;
    }
    if (event.key.toLowerCase() === 'd' && (event.metaKey || event.ctrlKey) && selected.length === 1) {
      commitNodeMutation({
        kind: 'duplicate',
        nodeId: selected[0],
        newNodeId: `opencanvas-${crypto.randomUUID()}`,
      });
      event.preventDefault();
      return;
    }
    if (event.key.toLowerCase() === 'c' && (event.metaKey || event.ctrlKey) && selected.length > 0) {
      clipboardRef.current = copyProductionSelection(activeScenePage!, selected);
      setClipboard(clipboardRef.current);
      event.preventDefault();
      return;
    }
    if (event.key.toLowerCase() === 'v' && (event.metaKey || event.ctrlKey) && clipboardRef.current) {
      const pasted = buildPasteProductionSelectionCommand(activeScenePage!, clipboardRef.current,
        (kind) => `opencanvas-${kind}-${crypto.randomUUID()}`);
      if (commitDocumentCommand(pasted.command)) {
        applySelection({ nodeIds: pasted.pastedNodeIds, primaryNodeId: pasted.pastedNodeIds[0] ?? null });
      }
      event.preventDefault();
      return;
    }
    if (!event.key.startsWith('Arrow') || projection.status !== 'ready') return;
    if (selected.length === 0) return;
    const page = activeScenePage!;
    const snapshot = createTransformSnapshot(page, selected);
    const delta = arrowNudgeDelta(event.key, event.shiftKey ? 10 : 1);
    commitTransform(moveTransform(snapshot, delta, { snap: false }));
    event.preventDefault();
  }, [
    activeScenePage, applyConnectorSelection, applySelection, cancelPointerOperation,
    canonicalCollaboration,
    commitDocumentCommand, commitNodeMutation, commitTransform, fitPageCamera, fitSelectionCamera,
    projection, recallPreviousCamera, resetCameraZoom, startTextEditing, state,
  ]);

  const handleKeyUp = useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    if (event.code !== 'Space') return;
    spacePanRef.current = false;
    if (event.target === viewportRef.current) event.preventDefault();
  }, []);

  useEffect(() => () => {
    cameraMotionRef.current?.cancel();
    cameraInertiaRef.current?.cancel();
    edgeScrollRef.current?.cancel();
  }, []);

  useEffect(() => {
    const resetSpacePan = (): void => { spacePanRef.current = false; };
    window.addEventListener('blur', resetSpacePan);
    return () => window.removeEventListener('blur', resetSpacePan);
  }, []);

  useEffect(() => {
    if (!capability.supported) fallback('WEBGL_UNAVAILABLE');
    else if (projection.status === 'invalid') fallback(projection.code);
  }, [capability.supported, fallback, projection]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !capability.supported) return;
    let disposed = false;
    const host = new PixiRendererHost({
      ...openCanvasRendererFamilyFlags(),
      onStatusChange: (nextStatus) => {
        if (disposed) return;
        setStatus(nextStatus);
        if (nextStatus === 'context-lost') {
          cancelPointerOperation();
          fallback('WEBGL_CONTEXT_LOST');
        }
      },
    });
    hostRef.current = host;
    void host.mount(viewport).catch(() => {
      if (!disposed) fallback('RENDERER_MOUNT_FAILED');
    });
    const observer = new ResizeObserver(() => host.resize());
    observer.observe(viewport);
    return () => {
      disposed = true;
      observer.disconnect();
      host.destroy();
      hostRef.current = null;
    };
  }, [cancelPointerOperation, capability.supported, fallback]);

  useEffect(() => {
    if (projection.status === 'ready' && status === 'ready') {
      const host = hostRef.current;
      if (!host) return;
      host.setPage(activeScenePage!);
      const page = activeScenePage!;
      const fitKey = `${projection.document.id}:${page.id}`;
      if (fittedDocumentRef.current !== fitKey) {
        const bounds = host.getContentBounds();
        applyCamera(bounds
          ? fitCameraToBounds(bounds, host.getViewportSize())
          : DEFAULT_CANVAS_CAMERA);
        fittedDocumentRef.current = fitKey;
      }
    }
  }, [activeScenePage, applyCamera, projection, status]);

  return (
    <main id="main-content" className="pixi-spike"
      onKeyDown={handleKeyDown} onKeyUp={handleKeyUp}>
      <header className="pixi-spike__toolbar">
        <div>
          <strong>OpenCanvas canary</strong>
          <span aria-live="polite">
            {' · '}{status}{' · write canary'}
            {canonicalCollaboration.running ? ' · canonical collaboration' : ''}
          </span>
        </div>
        <button
          type="button"
          disabled={projection.status !== 'ready'}
          onClick={() => {
            if (projection.status !== 'ready') return;
            const page = activeScenePage!;
            const viewport = hostRef.current?.getViewportSize() ?? { width: 800, height: 600 };
            const point = hostRef.current?.screenToWorld({
              x: viewport.width / 2,
              y: viewport.height / 2,
            }) ?? { x: 0, y: 0 };
            commitNodeMutation({
              kind: 'insert',
              node: createProductionProcessNode(
                `opencanvas-${crypto.randomUUID()}`,
                point,
                page.layers[0]?.id ?? 'default'
              ),
            });
          }}
        >
          Add process node
        </button>
        {(['pen', 'highlighter', 'line', 'arrow', 'sticky', 'callout'] as const).map((kind) => (
          <button key={kind} type="button" disabled={projection.status !== 'ready'} onClick={() => {
            const page = activeScenePage!;
            const viewport = hostRef.current?.getViewportSize() ?? { width: 800, height: 600 };
            const point = hostRef.current?.screenToWorld({ x: viewport.width / 2, y: viewport.height / 2 })
              ?? { x: 0, y: 0 };
            commitNodeMutation({ kind: 'insert', node: createProductionFreeformNode(
              `opencanvas-${kind}-${crypto.randomUUID()}`, kind, point, page.layers[0]?.id ?? 'default'
            ) });
          }}>Add {kind}</button>
        ))}
        {ROLLOUT_FLAGS.openCanvasNodeInsertionV1 ? (
          <>
            <select
              aria-label="Node to insert"
              value={insertCatalogId}
              onChange={(event) => setInsertCatalogId(event.target.value)}
            >
              {INSERT_CATALOG_GROUPS.map(([group, entries]) => (
                <optgroup key={group} label={group}>
                  {entries.map((entry) => (
                    <option key={entry.id} value={entry.id}>{entry.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button
              type="button"
              disabled={projection.status !== 'ready'}
              onClick={() => {
                if (projection.status !== 'ready') return;
                const page = activeScenePage!;
                const viewport = hostRef.current?.getViewportSize() ?? { width: 800, height: 600 };
                const point = hostRef.current?.screenToWorld({
                  x: viewport.width / 2,
                  y: viewport.height / 2,
                }) ?? { x: 0, y: 0 };
                commitNodeMutation({
                  kind: 'insert',
                  node: createProductionSceneNode(
                    insertCatalogId,
                    `opencanvas-${insertCatalogId}-${crypto.randomUUID()}`,
                    point,
                    page.layers[0]?.id ?? 'default'
                  ),
                });
              }}
            >
              Insert node
            </button>
          </>
        ) : null}
        {(['pen', 'highlighter', 'line', 'arrow'] as const).map((tool) => (
          <button key={`draw-${tool}`} type="button" aria-pressed={drawingTool === tool}
            onClick={() => setDrawingTool((current) => current === tool ? null : tool)}>Draw {tool}</button>
        ))}
        <button
          type="button"
          disabled={canonicalCollaboration.running ? !canonicalCollaboration.canUndo : !state.canUndo}
          onClick={canonicalCollaboration.running ? canonicalCollaboration.undo : state.undoV2}
        >Undo</button>
        <button
          type="button"
          disabled={canonicalCollaboration.running ? !canonicalCollaboration.canRedo : !state.canRedo}
          onClick={canonicalCollaboration.running ? canonicalCollaboration.redo : state.redoV2}
        >Redo</button>
        <button type="button" aria-expanded={inspectorOpen} aria-controls="opencanvas-inspector"
          onClick={() => setInspectorOpen((open) => !open)}>Inspector</button>
        <button type="button" disabled={projection.status !== 'ready'} onClick={() => {
          if (projection.status !== 'ready') return;
          const svg = exportCanonicalSvg(projection.document, { pageId: activeScenePage!.id });
          downloadCanonicalArtifact(projection.document.name, 'svg', 'image/svg+xml', svg);
        }}>Export SVG</button>
        <button type="button" disabled={projection.status !== 'ready'} onClick={() => {
          if (projection.status !== 'ready') return;
          downloadCanonicalArtifact(
            projection.document.name,
            'json',
            'application/json',
            serializeCanonicalJson(projection.document)
          );
        }}>Export canonical JSON</button>
        <button type="button" disabled={status !== 'ready'} onClick={() =>
          setRenderDiagnostics(hostRef.current?.getRenderDiagnostics() ?? null)
        }>Render diagnostics</button>
        <button
          type="button"
          disabled={semanticSelection.nodeIds.length !== 2 || projection.status !== 'ready'}
          onClick={() => {
            if (projection.status !== 'ready' || semanticSelection.nodeIds.length !== 2) return;
            const connectorId = `opencanvas-connector-${crypto.randomUUID()}`;
            const command = buildProductionPortConnectorCommand(
              projection.document,
              activeScenePage!.id,
              connectorId,
              { nodeId: semanticSelection.nodeIds[0], side: 'right' },
              { nodeId: semanticSelection.nodeIds[1], side: 'left' }
            );
            if (commitDocumentCommand(command)) applyConnectorSelection(connectorId);
          }}
        >Connect selected nodes</button>
        {ROLLOUT_FLAGS.openCanvasOrganizationV1 ? (
          <div role="group" aria-label="Arrange selected nodes">
            {(['left', 'center-x', 'right', 'top', 'center-y', 'bottom'] as const).map((mode) => (
              <button key={mode} type="button" disabled={semanticSelection.nodeIds.length < 2}
                onClick={() => commitTransform(alignNodes(
                  activeScenePage!, selectionRef.current.nodeIds, mode
                ))}>Align {mode}</button>
            ))}
            {(['horizontal', 'vertical'] as const).map((axis) => (
              <button key={`distribute-${axis}`} type="button"
                disabled={semanticSelection.nodeIds.length < 3}
                onClick={() => commitTransform(distributeNodes(
                  activeScenePage!, selectionRef.current.nodeIds, axis
                ))}>Distribute {axis}</button>
            ))}
            {(['horizontal', 'vertical'] as const).map((axis) => (
              <button key={`stack-${axis}`} type="button"
                disabled={semanticSelection.nodeIds.length < 2}
                onClick={() => commitTransform(stackNodes(
                  activeScenePage!, selectionRef.current.nodeIds, axis
                ))}>Stack {axis}</button>
            ))}
            <button type="button" disabled={semanticSelection.nodeIds.length < 2}
              onClick={() => commitTransform(gridNodes(
                activeScenePage!, selectionRef.current.nodeIds
              ))}>Grid selection</button>
            <button type="button" disabled={semanticSelection.nodeIds.length < 2}
              onClick={() => commitTransform(tidyNodes(
                activeScenePage!, selectionRef.current.nodeIds
              ))}>Tidy selection</button>
            <button type="button" disabled={semanticSelection.nodeIds.length < 2}
              onClick={() => commitTransform(packNodes(
                activeScenePage!, selectionRef.current.nodeIds
              ))}>Pack selection</button>
          </div>
        ) : null}
        <button type="button" disabled={projection.status !== 'ready'} onClick={() => {
          if (projection.status !== 'ready') return;
          void buildProductionScopedLayoutCommand(
            projection.document, activeScenePage!.id, [], { direction: 'LR' }
          ).then((command) => { if (command) commitDocumentCommand(command); })
            .catch(() => fallback('LAYOUT_COMMIT_FAILED'));
        }}>Layout page</button>
        <button type="button" disabled={projection.status !== 'ready'
          || semanticSelection.nodeIds.length === 0} onClick={() => {
          if (projection.status !== 'ready') return;
          void buildProductionScopedLayoutCommand(
            projection.document, activeScenePage!.id, semanticSelection.nodeIds, { direction: 'LR' }
          ).then((command) => { if (command) commitDocumentCommand(command); })
            .catch(() => fallback('LAYOUT_COMMIT_FAILED'));
        }}>Layout selection</button>
        <Link to={fallbackPath}>Use React Flow</Link>
      </header>
      <OpenCanvasCameraControls
        canFitSelection={semanticSelection.nodeIds.length > 0}
        canRecallPrevious={canRecallPreviousCamera}
        onFitPage={fitPageCamera}
        onFitSelection={fitSelectionCamera}
        onResetZoom={resetCameraZoom}
        onRecallPrevious={recallPreviousCamera}
      />
      <section
        ref={viewportRef}
        className="pixi-spike__viewport"
        aria-label="OpenCanvas document write canary. Drag to pan and use the wheel to zoom."
        data-testid="opencanvas-document-viewport"
        tabIndex={0}
        style={{ touchAction: 'none' }}
        onPointerDown={(event) => {
          if ((event.button !== 0 && event.button !== 1) || !hostRef.current) return;
          cameraMotionRef.current?.cancel();
          cameraInertiaRef.current?.cancel();
          edgeScrollRef.current?.cancel();
          const bounds = event.currentTarget.getBoundingClientRect();
          const point = {
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
          };
          if (event.pointerType === 'pen' && touchCameraGestureRef.current) {
            for (const pointerId of touchPointerIds(touchCameraGestureRef.current)) {
              if (event.currentTarget.hasPointerCapture(pointerId)) {
                event.currentTarget.releasePointerCapture(pointerId);
              }
            }
            touchCameraGestureRef.current = null;
          }
          if (event.pointerType === 'touch') {
            if (pointerOperationRef.current) return;
            touchCameraGestureRef.current = beginTouchCameraGesture(
              touchCameraGestureRef.current,
              event.pointerId,
              point,
              event.timeStamp
            );
            event.currentTarget.focus();
            event.currentTarget.setPointerCapture(event.pointerId);
            return;
          }
          gestureSelectionSnapshotRef.current = {
            selection: {
              nodeIds: [...selectionRef.current.nodeIds],
              primaryNodeId: selectionRef.current.primaryNodeId,
            },
            connectorId: selectedConnectorIdRef.current,
          };
          additiveSelectionRef.current = event.shiftKey || event.metaKey || event.ctrlKey;
          const host = hostRef.current;
          const forceCameraPan = event.button === 1 || spacePanRef.current;
          if (forceCameraPan) {
            pointerOperationRef.current = {
              kind: 'camera',
              gesture: beginCameraPan(event.pointerId, point, event.timeStamp),
              selectOnClick: false,
            };
            event.currentTarget.focus();
            event.currentTarget.setPointerCapture(event.pointerId);
            return;
          }
          if (drawingTool && event.button === 0) {
            const initialSample = projectPointerSamples(
              event.nativeEvent,
              { x: bounds.left, y: bounds.top },
              (screenPoint) => host.screenToWorld(screenPoint)
            ).confirmed.at(-1) ?? host.screenToWorld(point);
            pointerOperationRef.current = beginFreeformOperation(
              event.pointerId, drawingTool, initialSample
            );
            event.currentTarget.focus();
            event.currentTarget.setPointerCapture(event.pointerId);
            return;
          }
          const selectedConnector = projection.status === 'ready' && selectedConnectorIdRef.current
            ? activeScenePage!.connectors.find(
                (connector) => connector.id === selectedConnectorIdRef.current
              ) ?? null
            : null;
          const connectorHandle = event.button === 0 && selectedConnector
            ? host.pickConnectorHandle(point)
            : null;
          const handle = event.button === 0 ? host.pickTransformHandle(point) : null;
          const nodeId = event.button === 0 ? host.pickNode(point) : null;
          if (connectorHandle && selectedConnector && projection.status === 'ready') {
            activeConnectorHandleRef.current = connectorHandle;
            host.setConnectorSelection(selectedConnector.id, connectorHandle);
            pointerOperationRef.current = beginConnectorOperation(
              event.pointerId,
              activeScenePage!,
              selectedConnector,
              connectorHandle
            );
          } else if (handle || nodeId) {
            applyConnectorSelection(null);
            const wasSelected = nodeId ? selectionRef.current.nodeIds.includes(nodeId) : false;
            pendingSelectionToggleRef.current =
              nodeId && wasSelected && additiveSelectionRef.current ? nodeId : null;
            const nextSelection = nodeId && !wasSelected
              ? selectionAfterClick(selectionRef.current, nodeId, additiveSelectionRef.current)
              : selectionRef.current;
            if (nextSelection !== selectionRef.current) applySelection(nextSelection);
            if (nextSelection.nodeIds.length > 0 && projection.status === 'ready') {
              pointerOperationRef.current = beginTransformOperation(
                event.pointerId,
                activeScenePage!,
                nextSelection.nodeIds,
                handle,
                host.screenToWorld(point)
              );
            }
          } else {
            pointerOperationRef.current = {
              kind: 'marquee',
              pointerId: event.pointerId,
              startScreen: point,
              startWorld: host.screenToWorld(point),
              currentScreen: point,
              additive: additiveSelectionRef.current,
            };
          }
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const touchGesture = touchCameraGestureRef.current;
          if (event.pointerType === 'touch' && touchGesture) {
            const bounds = event.currentTarget.getBoundingClientRect();
            const moved = moveTouchCameraGesture(
              cameraRef.current,
              touchGesture,
              event.pointerId,
              { x: event.clientX - bounds.left, y: event.clientY - bounds.top },
              event.timeStamp
            );
            touchCameraGestureRef.current = moved.gesture;
            applyCamera(moved.camera);
            return;
          }
          const operation = pointerOperationRef.current;
          if (!operation || (operation.kind === 'camera'
            ? operation.gesture.pointerId
            : operation.pointerId) !== event.pointerId) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          const point = {
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
          };
          if (operation.kind === 'camera') {
            edgeScrollRef.current?.cancel();
            const next = moveCameraPan(
              cameraRef.current, operation.gesture, point, event.shiftKey, event.timeStamp
            );
            pointerOperationRef.current = { ...operation, gesture: next.gesture };
            applyCamera(next.camera);
          } else if (operation.kind === 'freeform') {
            const host = hostRef.current;
            if (!host) return;
            const samples = projectPointerSamples(
              event.nativeEvent,
              { x: bounds.left, y: bounds.top },
              (screenPoint) => host.screenToWorld(screenPoint)
            );
            const next = updateFreeformOperation(operation, samples.confirmed);
            pointerOperationRef.current = next;
            host.setFreeformPreview({
              ...freeformPreviewPoints(next, samples.predicted),
              ...freeformPreviewStyle(next.tool),
            });
            updateDragEdgeScroll(point, true);
          } else if (operation.kind === 'marquee') {
            const next = { ...operation, currentScreen: point };
            pointerOperationRef.current = next;
            hostRef.current?.setMarquee(anchoredMarqueeBounds(next, cameraRef.current));
            updateDragEdgeScroll(point, true);
          } else if (operation.kind === 'transform') {
            const next = updateTransformOperation(
              operation,
              hostRef.current?.screenToWorld(point) ?? point,
              !event.altKey
            );
            pointerOperationRef.current = next;
            hostRef.current?.setTransformPreview(next.result);
            updateDragEdgeScroll(point, !event.altKey);
          } else {
            const host = hostRef.current;
            if (!host) return;
            const next = updateConnectorOperation(
              operation,
              host.screenToWorld(point),
              operation.handle.kind === 'endpoint' ? host.pickNode(point) : null
            );
            pointerOperationRef.current = next;
            host.setConnectorPreview(next.preview);
            updateDragEdgeScroll(point, true);
          }
        }}
        onPointerUp={(event) => {
          edgeScrollRef.current?.cancel();
          const touchGesture = touchCameraGestureRef.current;
          if (event.pointerType === 'touch' && touchGesture) {
            const ended = endTouchCameraGesture(touchGesture, event.pointerId, event.timeStamp);
            touchCameraGestureRef.current = ended.gesture;
            if (!ended.gesture) startCameraInertia(ended.releaseVelocity);
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
            return;
          }
          const operation = pointerOperationRef.current;
          if (!operation || (operation.kind === 'camera'
            ? operation.gesture.pointerId
            : operation.pointerId) !== event.pointerId) return;
          if (operation.kind === 'camera') {
            if (operation.selectOnClick && !operation.gesture.moved && event.button === 0) {
              const pickedNode = hostRef.current?.pickNode(operation.gesture.last) ?? null;
              applySelection(selectionAfterClick(
                selectionRef.current,
                pickedNode,
                additiveSelectionRef.current
              ));
              applyConnectorSelection(
                pickedNode ? null : hostRef.current?.pickConnector(operation.gesture.last) ?? null
              );
            }
            if (operation.gesture.moved) {
              startCameraInertia(releaseCameraPanVelocity(operation.gesture, event.timeStamp));
            }
          } else if (operation.kind === 'marquee') {
            const host = hostRef.current;
            host?.setMarquee(null);
            const moved = Math.hypot(
              operation.currentScreen.x - operation.startScreen.x,
              operation.currentScreen.y - operation.startScreen.y
            );
            if (host && moved >= 4) {
              const ids = host.pickNodesInScreenBounds(
                anchoredMarqueeBounds(operation, cameraRef.current)
              );
              applyConnectorSelection(null);
              applySelection(operation.additive
                ? addToSelection(selectionRef.current, ids)
                : replaceSelection(ids));
            } else {
              if (!operation.additive) applyConnectorSelection(null);
              applySelection(selectionAfterClick(
                selectionRef.current, null, operation.additive
              ));
            }
          } else if (operation.kind === 'freeform') {
            hostRef.current?.setFreeformPreview(null);
            const node = finishFreeformOperation(operation,
              `opencanvas-${operation.tool}-${crypto.randomUUID()}`,
              activeScenePage!.layers[0]?.id ?? 'default');
            if (node) commitNodeMutation({ kind: 'insert', node });
          } else if (operation.kind === 'transform') {
            hostRef.current?.setTransformPreview(null);
            if (!operation.result && pendingSelectionToggleRef.current) {
              applySelection(selectionAfterClick(
                selectionRef.current,
                pendingSelectionToggleRef.current,
                true
              ));
            } else if (operation.result) commitTransform(operation.result);
          } else {
            hostRef.current?.setConnectorPreview(null);
            commitConnector(operation.before, operation.preview);
            applyConnectorSelection(operation.before.id);
          }
          pendingSelectionToggleRef.current = null;
          pointerOperationRef.current = null;
          gestureSelectionSnapshotRef.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onPointerCancel={(event) => cancelPointerOperation(event.currentTarget)}
        onWheel={(event) => {
          edgeScrollRef.current?.cancel();
          cameraMotionRef.current?.cancel();
          cameraInertiaRef.current?.cancel();
          const bounds = event.currentTarget.getBoundingClientRect();
          event.preventDefault();
          const host = hostRef.current;
          const viewport = host?.getViewportSize() ?? {
            width: bounds.width,
            height: bounds.height,
          };
          const decision = resolveWheelGesture(event, wheelGestureRef.current, viewport);
          wheelGestureRef.current = decision.state;
          if (decision.mode === 'pan') {
            applyCamera(panCamera(cameraRef.current, decision.panDelta));
          } else {
            applyCamera(zoomReadOnlyCamera(cameraRef.current, {
              x: event.clientX - bounds.left,
              y: event.clientY - bounds.top,
            }, decision.zoomDeltaY));
          }
        }}
        onDoubleClick={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const nodeId = hostRef.current?.pickNode({
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
          });
          if (nodeId) startTextEditing(nodeId);
        }}
      >
        {textEditor ? (
          <OpenCanvasTextEditorOverlay
            key={textEditor.nodeId}
            bounds={textEditor.bounds}
            value={textEditor.value}
            onCancel={closeTextEditor}
            onCommit={(label) => {
              const nodeId = editingNodeIdRef.current;
              closeTextEditor();
              if (nodeId && label.trim()) commitNodeMutation({ kind: 'rename', nodeId, label });
            }}
          />
        ) : null}
      </section>
      {renderDiagnostics ? (
        <output className="pixi-spike__diagnostics" aria-label="OpenCanvas render diagnostics">
          {renderDiagnostics.renderedNodeCount}/{renderDiagnostics.nodeCount}n ·{' '}
          {renderDiagnostics.renderedConnectorCount}/{renderDiagnostics.connectorCount}e ·{' '}
          {renderDiagnostics.detailLevel} detail ·{' '}
          {renderDiagnostics.renderCount} renders · {renderDiagnostics.coalescedRequests} coalesced ·{' '}
          {renderDiagnostics.lastRenderDurationMs.toFixed(2)} ms ·{' '}
          {renderDiagnostics.continuousTickerRunning ? 'continuous' : 'idle-on-demand'}
        </output>
      ) : null}
      <p className="sr-only" aria-live="polite">{selectionMessage}</p>
      {projection.status === 'ready' && ROLLOUT_FLAGS.openCanvasA11yV1 && (
        <>
        <OpenCanvasSemanticSceneTree
          page={activeScenePage!}
          selection={semanticSelection}
          selectedConnectorId={selectedConnectorId}
          onSelectNode={(nodeId, additive) => {
            applyConnectorSelection(null);
            applySelection(selectionAfterClick(selectionRef.current, nodeId, additive));
          }}
          onSelectConnector={(connectorId) => applyConnectorSelection(connectorId)}
        />
        <aside id="opencanvas-inspector" hidden={!inspectorOpen}
          className="pixi-spike__inspector" aria-label="OpenCanvas inspector">
        <button type="button" onClick={() => setInspectorOpen(false)}>Close inspector</button>
        <section aria-label="Diagram lint">
          <h2>Diagram lint</h2>
          {structuredLintIssues.length === 0 ? <p>No structured diagram issues.</p> : (
            <ul>{structuredLintIssues.map((issue) => (
              <li key={issue.id} data-severity={issue.severity}>
                <span>{issue.message}</span>
                {issue.fix ? <button type="button" onClick={() => commitDocumentCommand(issue.fix!)}>
                  Fix {issue.id}
                </button> : null}
              </li>
            ))}</ul>
          )}
        </section>
        <section aria-label="Canvas precision">
          <h2>Canvas precision</h2>
          <form onSubmit={(event) => {
            event.preventDefault(); const form = new FormData(event.currentTarget);
            const current = resolveCanvasPrecisionSettings(activeScenePage!);
            const command = buildSetCanvasPrecisionCommand(activeScenePage!, {
              ...current, gridEnabled: form.get('gridEnabled') === 'on',
              snapEnabled: form.get('snapEnabled') === 'on', gridSize: Number(form.get('gridSize')),
              subdivisions: Number(form.get('subdivisions')),
            });
            if (command) commitDocumentCommand(command);
          }}>
            <label><input name="gridEnabled" type="checkbox"
              defaultChecked={resolveCanvasPrecisionSettings(activeScenePage!).gridEnabled} />Grid</label>
            <label><input name="snapEnabled" type="checkbox"
              defaultChecked={resolveCanvasPrecisionSettings(activeScenePage!).snapEnabled} />Snap</label>
            <label>Grid size<input name="gridSize" type="number" min="1" max="1000"
              defaultValue={resolveCanvasPrecisionSettings(activeScenePage!).gridSize} /></label>
            <label>Subdivisions<input name="subdivisions" type="number" min="1" max="16"
              defaultValue={resolveCanvasPrecisionSettings(activeScenePage!).subdivisions} /></label>
            <button type="submit">Update canvas precision</button>
          </form>
        </section>
        {ROLLOUT_FLAGS.openCanvasOrganizationV1 ? (
          <section aria-label="Canvas pages">
            <h2>Canvas pages</h2>
            <form
              aria-label="Add canvas page"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                commitDocumentCommand(buildProductionInsertPageCommand(
                  projection.document,
                  `opencanvas-page-${crypto.randomUUID()}`,
                  String(form.get('name') ?? '')
                ));
                event.currentTarget.reset();
              }}
            >
              <label>New page name<input name="name" required /></label>
              <button type="submit">Add page</button>
            </form>
            {projection.document.pages.map((page) => (
              <form
                key={page.id}
                aria-label={`Page ${page.name}`}
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  const command = buildProductionRenamePageCommand(
                    projection.document, page.id, String(form.get('name') ?? '')
                  );
                  if (command) commitDocumentCommand(command);
                }}
              >
                <OpenCanvasPageThumbnail page={page} />
                <button type="button" aria-pressed={page.id === state.activePageId}
                  onClick={() => state.setActivePageId(page.id)}>Open page {page.name}</button>
                <label>Page name {page.name}<input name="name" defaultValue={page.name} /></label>
                <button type="submit">Rename page {page.name}</button>
                <button type="button" onClick={() => commitDocumentCommand(
                  buildProductionDuplicatePageCommand(
                    projection.document, page.id, `opencanvas-page-${crypto.randomUUID()}`
                  )
                )}>Duplicate page {page.name}</button>
                {(['left', 'right'] as const).map((direction) => (
                  <button key={direction} type="button" onClick={() => {
                    const command = buildProductionReorderPageCommand(
                      projection.document, page.id, direction
                    );
                    if (command) commitDocumentCommand(command);
                  }}>Move page {page.name} {direction}</button>
                ))}
                {projection.document.pages.length > 1 ? (
                  <button type="button" onClick={() => commitDocumentCommand(
                    buildProductionRemovePageCommand(projection.document, page.id)
                  )}>Delete page {page.name}</button>
                ) : null}
              </form>
            ))}
          </section>
        ) : null}
        {ROLLOUT_FLAGS.openCanvasOrganizationV1 ? (
          <section aria-label="Canvas layers">
            <h2>Canvas layers</h2>
            <form
              aria-label="Add canvas layer"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                commitDocumentCommand(buildProductionInsertLayerCommand(
                  activeScenePage!,
                  `opencanvas-layer-${crypto.randomUUID()}`,
                  String(form.get('name') ?? '')
                ));
                event.currentTarget.reset();
              }}
            >
              <label>
                New layer name
                <input name="name" required />
              </label>
              <button type="submit">Add layer</button>
            </form>
            {activeScenePage!.layers.map((layer) => (
              <form
                key={layer.id}
                aria-label={`Layer ${layer.name}`}
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  const command = buildProductionLayerCommand(
                    activeScenePage!, layer.id, {
                      name: String(form.get('name') ?? ''),
                      visible: form.get('visible') === 'on',
                      locked: form.get('locked') === 'on',
                    }
                  );
                  if (command) commitDocumentCommand(command);
                }}
              >
                <label>
                  Layer name {layer.name}
                  <input name="name" defaultValue={layer.name} required />
                </label>
                <label>
                  <input name="visible" type="checkbox" defaultChecked={layer.visible} />
                  Visible {layer.name}
                </label>
                <label>
                  <input name="locked" type="checkbox" defaultChecked={layer.locked} />
                  Locked {layer.name}
                </label>
                <button type="submit">Update layer {layer.name}</button>
                <button
                  type="button"
                  onClick={() => {
                    const command = buildProductionReorderLayerCommand(
                      activeScenePage!, layer.id, 'up'
                    );
                    if (command) commitDocumentCommand(command);
                  }}
                >Move layer {layer.name} up</button>
                <button
                  type="button"
                  onClick={() => {
                    const command = buildProductionReorderLayerCommand(
                      activeScenePage!, layer.id, 'down'
                    );
                    if (command) commitDocumentCommand(command);
                  }}
                >Move layer {layer.name} down</button>
                {activeScenePage!.layers.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      const fallbackLayer = activeScenePage!.layers.find(
                        (candidate) => candidate.id !== layer.id
                      );
                      if (!fallbackLayer) return;
                      commitDocumentCommand(buildProductionRemoveLayerCommand(
                        activeScenePage!, layer.id, fallbackLayer.id
                      ));
                    }}
                  >Delete layer {layer.name}</button>
                ) : null}
              </form>
            ))}
          </section>
        ) : null}
        <ol aria-label="Canvas objects">
          {activeScenePage!.nodes.filter((node) => (
            activeScenePage!.layers.find((layer) => layer.id === node.layerId)?.visible
          )).map((node) => {
            const label = typeof node.content.label === 'string' ? node.content.label : node.id;
            const editable = isNodeEditableOnLayer(activeScenePage!, node.id);
            return (
              <li key={node.id}>
                <h3>{label}</h3>
                <fieldset disabled={!editable}>
                  <legend>Editing for {label}</legend>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    commitNodeMutation({
                      kind: 'rename', nodeId: node.id, label: String(form.get('label') ?? ''),
                    });
                  }}
                >
                  <label>
                    Label for {label}
                    <input name="label" defaultValue={label} />
                  </label>
                  <button type="submit">Rename {label}</button>
                </form>
                <OpenCanvasNodePropertyForm
                  node={node}
                  page={activeScenePage!}
                  onCommit={commitDocumentCommand}
                />
                <OpenCanvasPrecisionForm node={node} page={activeScenePage!}
                  onCommit={commitDocumentCommand} />
                {ROLLOUT_FLAGS.openCanvasNodeLayoutV1 ? (
                  <OpenCanvasNodeSizingForm
                    node={node}
                    page={activeScenePage!}
                    onCommit={commitDocumentCommand}
                  />
                ) : null}
                {ROLLOUT_FLAGS.openCanvasNodeLayoutV1 ? (
                  <PixiNodeLayoutBar
                    nodeId={node.id}
                    layout={resolveNodeContentLayout(node.content, true)}
                    onChange={(layout, changeLabel) => {
                      const command = buildProductionNodeLayoutCommand(
                        activeScenePage!, node.id, layout, changeLabel
                      );
                      if (command) commitDocumentCommand(command);
                    }}
                  />
                ) : null}
                {ROLLOUT_FLAGS.openCanvasOrganizationV1 ? (
                  <fieldset>
                    <legend>Organization for {label}</legend>
                    <label>
                      Parent
                      <select
                        aria-label={`Parent for ${label}`}
                        value={node.parentId ?? ''}
                        onChange={(event) => {
                          const command = buildProductionReparentCommand(
                            activeScenePage!, node.id, event.target.value || null
                          );
                          if (command) commitDocumentCommand(command);
                        }}
                      >
                        <option value="">Canvas root</option>
                        {productionParentCandidates(activeScenePage!, node.id)
                          .map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {typeof candidate.content.label === 'string'
                                ? candidate.content.label : candidate.id}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label>
                      Layer
                      <select
                        aria-label={`Layer for ${label}`}
                        value={node.layerId}
                        onChange={(event) => {
                          const command = buildProductionNodeLayerCommand(
                            activeScenePage!, node.id, event.target.value
                          );
                          if (command) commitDocumentCommand(command);
                        }}
                      >
                        {activeScenePage!.layers.map((layer) => (
                          <option key={layer.id} value={layer.id}>{layer.name}</option>
                        ))}
                      </select>
                    </label>
                    {(['back', 'backward', 'forward', 'front'] as const).map((action) => (
                      <button
                        key={action}
                        type="button"
                        onClick={() => {
                          const command = buildProductionZOrderCommand(
                            activeScenePage!, node.id, action
                          );
                          if (command) commitDocumentCommand(command);
                        }}
                      >
                        Move {label} {action}
                      </button>
                    ))}
                  </fieldset>
                ) : null}
                <button
                  type="button"
                  onClick={() => commitNodeMutation({
                    kind: 'duplicate', nodeId: node.id,
                    newNodeId: `opencanvas-${crypto.randomUUID()}`,
                  })}
                >
                  Duplicate {label}
                </button>
                <button type="button" onClick={() => {
                  clipboardRef.current = copyProductionSelection(activeScenePage!, [node.id]);
                  setClipboard(clipboardRef.current);
                }}>Copy {label}</button>
                <button type="button" disabled={!clipboard} onClick={() => {
                  if (!clipboard) return;
                  const pasted = buildPasteProductionSelectionCommand(activeScenePage!, clipboard,
                    (kind) => `opencanvas-${kind}-${crypto.randomUUID()}`);
                  if (commitDocumentCommand(pasted.command)) applySelection({
                    nodeIds: pasted.pastedNodeIds, primaryNodeId: pasted.pastedNodeIds[0] ?? null,
                  });
                }}>Paste after {label}</button>
                <button type="button" onClick={() => {
                  setStyleClipboard(copyProductionNodeStyle(node));
                }}>Copy style from {label}</button>
                <button type="button" disabled={!styleClipboard} onClick={() => {
                  if (!styleClipboard) return;
                  const command = symbolBinding(node)?.role === 'instance'
                    ? buildSetSymbolOverridesCommand(activeScenePage!, node.id, styleClipboard)
                    : buildPasteProductionNodeStyleCommand(activeScenePage!, node.id, styleClipboard);
                  if (command) commitDocumentCommand(command);
                }}>Paste style to {label}</button>
                {!symbolBinding(node) ? (
                  <button type="button" onClick={() => commitDocumentCommand(
                    buildCreateSymbolDefinitionCommand(
                      activeScenePage!, node.id, `symbol-${crypto.randomUUID()}`
                    )
                  )}>Make {label} a symbol</button>
                ) : symbolBinding(node)?.role === 'definition' ? (
                  <button type="button" onClick={() => commitDocumentCommand(
                    buildCreateSymbolInstanceCommand(
                      activeScenePage!, symbolBinding(node)!.definitionId,
                      `opencanvas-symbol-instance-${crypto.randomUUID()}`
                    )
                  )}>Create instance of {label}</button>
                ) : (
                  <span>Instance of {symbolBinding(node)!.definitionId}</span>
                )}
                <button
                  type="button"
                  onClick={() => commitNodeMutation({ kind: 'delete', nodeId: node.id })}
                >
                  Delete {label}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const connectorId = `opencanvas-loop-${crypto.randomUUID()}`;
                    const command = buildProductionPortConnectorCommand(
                      projection.document,
                      activeScenePage!.id,
                      connectorId,
                      { nodeId: node.id, side: 'right' },
                      { nodeId: node.id, side: 'top' }
                    );
                    if (commitDocumentCommand(command)) applyConnectorSelection(connectorId);
                  }}
                >
                  Create self-loop for {label}
                </button>
                </fieldset>
              </li>
            );
          })}
          {activeScenePage!.connectors.filter((connector) => {
            const page = activeScenePage!;
            const source = page.nodes.find((node) => node.id === connector.source.nodeId);
            const target = page.nodes.find((node) => node.id === connector.target.nodeId);
            return Boolean(source && target
              && page.layers.find((layer) => layer.id === source.layerId)?.visible
              && page.layers.find((layer) => layer.id === target.layerId)?.visible);
          }).map((connector) => {
            const label = connector.labels[0]?.text ?? `${connector.source.nodeId} to ${connector.target.nodeId}`;
            const page = activeScenePage!;
            const source = page.nodes.find((node) => node.id === connector.source.nodeId);
            const target = page.nodes.find((node) => node.id === connector.target.nodeId);
            const editable = Boolean(source && target
              && isNodeEditableOnLayer(page, source.id)
              && isNodeEditableOnLayer(page, target.id));
            return (
              <li key={connector.id}>
                <h3>Connector {label}</h3>
                <fieldset disabled={!editable}>
                  <legend>Editing for connector {label}</legend>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    commitConnector(
                      connector,
                      setPrimaryConnectorLabel(connector, String(form.get('label') ?? ''))
                    );
                  }}
                >
                  <label>
                    Label for connector {label}
                    <input name="label" defaultValue={connector.labels[0]?.text ?? ''} />
                  </label>
                  <button type="submit">Update connector label {label}</button>
                </form>
                <button
                  type="button"
                  onClick={() => commitConnector(connector, resetConnectorRoute(connector))}
                >
                  Reset route for connector {label}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (projection.status !== 'ready') return;
                    const command = buildProductionRemoveConnectorCommand(
                      projection.document, activeScenePage!.id, connector.id
                    );
                    if (commitDocumentCommand(command)) applyConnectorSelection(null);
                  }}
                >
                  Delete connector {label}
                </button>
                </fieldset>
              </li>
            );
          })}
        </ol>
        </aside>
        </>
      )}
    </main>
  );
}
