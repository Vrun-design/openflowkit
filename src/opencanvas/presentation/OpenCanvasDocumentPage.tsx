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
  clearSelection,
  selectionAnnouncement,
  type CanvasSelection,
} from '../application/selection/selection';
import { arrowSpatialDirection, spatialNeighborId } from '../application/selection/spatialNavigation';
import { canvasRendererLocation } from '../application/renderer/rendererSelection';
import {
  beginCameraPan,
  moveCameraPan,
  zoomReadOnlyCamera,
  type CameraPanGesture,
} from '../application/renderer/readOnlyCameraInteraction';
import { DEFAULT_CANVAS_CAMERA, fitCameraToBounds } from '../domain/camera/camera';
import type { CanvasCamera } from '../domain/camera/types';
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
  arrowNudgeDelta,
  beginTransformOperation,
  isEditableTarget,
  selectionAfterClick,
  updateTransformOperation,
  type TransformPointerOperation,
} from './pixiPointerOperations';
import {
  beginConnectorOperation,
  updateConnectorOperation,
  type ConnectorPointerOperation,
} from './pixiConnectorOperations';
import { detectWebGlCapability } from '../infrastructure/pixi/capabilities';
import { PixiRendererHost, type PixiRendererStatus } from '../infrastructure/pixi/PixiRendererHost';
import { projectSceneDocumentToReactFlow } from '../infrastructure/reactflow/toReactFlow';
import { useOpenCanvasCanonicalCollaboration } from './useOpenCanvasCanonicalCollaboration';
import { OpenCanvasNodePropertyForm } from './OpenCanvasNodePropertyForm';
import { OpenCanvasNodeSizingForm } from './OpenCanvasNodeSizingForm';
import { OpenCanvasPageThumbnail } from './OpenCanvasPageThumbnail';
import { PixiNodeLayoutBar } from './PixiNodeLayoutBar';
import { resolveNodeContentLayout } from '../domain/node-layout/model';
import { buildProductionNodeLayoutCommand } from '../application/active-document/productionNodeLayout';
import { exportCanonicalSvg } from '../infrastructure/export/canonicalSvg';
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
import { beginFreeformOperation, finishFreeformOperation, updateFreeformOperation,
  type DrawingTool, type FreeformPointerOperation } from './pixiFreeformOperations';

export const OPEN_CANVAS_CANARY_FALLBACK_EVENT = 'openflowkit:opencanvas-canary-fallback';

type CanaryPointerOperation =
  | { readonly kind: 'camera'; readonly gesture: CameraPanGesture }
  | TransformPointerOperation
  | ConnectorPointerOperation
  | FreeformPointerOperation;

export function OpenCanvasDocumentPage(): React.JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const viewportRef = useRef<HTMLElement>(null);
  const hostRef = useRef<PixiRendererHost | null>(null);
  const cameraRef = useRef<CanvasCamera>(DEFAULT_CANVAS_CAMERA);
  const pointerOperationRef = useRef<CanaryPointerOperation | null>(null);
  const fittedDocumentRef = useRef<string | null>(null);
  const additiveSelectionRef = useRef(false);
  const pendingSelectionToggleRef = useRef<string | null>(null);
  const selectionRef = useRef<CanvasSelection>(clearSelection());
  const selectedConnectorIdRef = useRef<string | null>(null);
  const activeConnectorHandleRef = useRef<ConnectorEditHandle | null>(null);
  const semanticNodeRefs = useRef(new Map<string, HTMLButtonElement>());
  const clipboardRef = useRef<ProductionClipboardSnapshot | null>(null);
  const [clipboard, setClipboard] = useState<ProductionClipboardSnapshot | null>(null);
  const [styleClipboard, setStyleClipboard] = useState<ProductionStyleSnapshot | null>(null);
  const [status, setStatus] = useState<PixiRendererStatus>('initializing');
  const [semanticSelection, setSemanticSelection] = useState<CanvasSelection>(clearSelection());
  const [selectionMessage, setSelectionMessage] = useState('Canvas selection cleared.');
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [drawingTool, setDrawingTool] = useState<DrawingTool | null>(null);
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
  }, []);

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

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    if (isEditableTarget(event.target)) return;
    if (event.key === 'Escape') {
      applySelection(clearSelection());
      applyConnectorSelection(null);
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
    const isSemanticNode = event.target instanceof HTMLElement
      && event.target.dataset.canvasSemanticNode === 'true';
    const spatialDirection = event.altKey || (
      isSemanticNode && !event.shiftKey && !event.metaKey && !event.ctrlKey
    )
      ? arrowSpatialDirection(event.key)
      : null;
    if (spatialDirection && projection.status === 'ready') {
      const nextId = spatialNeighborId(
        activeScenePage!,
        selectionRef.current.primaryNodeId,
        spatialDirection
      );
      if (nextId) {
        applyConnectorSelection(null);
        applySelection({ nodeIds: [nextId], primaryNodeId: nextId });
        semanticNodeRefs.current.get(nextId)?.focus();
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
    activeScenePage, applyConnectorSelection, applySelection, canonicalCollaboration,
    commitDocumentCommand, commitNodeMutation, commitTransform, projection, state,
  ]);

  useEffect(() => {
    if (!capability.supported) fallback('WEBGL_UNAVAILABLE');
    else if (projection.status === 'invalid') fallback(projection.code);
  }, [capability.supported, fallback, projection]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !capability.supported) return;
    let disposed = false;
    const host = new PixiRendererHost({
      connectorModelEnabled: ROLLOUT_FLAGS.openCanvasConnectorsV1,
      nodeLayoutModelEnabled: ROLLOUT_FLAGS.openCanvasNodeLayoutV1,
      basicNodesEnabled: ROLLOUT_FLAGS.openCanvasBasicNodesV1,
      freeformNodesEnabled: ROLLOUT_FLAGS.openCanvasFreeformNodesV1,
      architectureNodesEnabled: ROLLOUT_FLAGS.openCanvasArchitectureNodesV1,
      containerNodesEnabled: ROLLOUT_FLAGS.openCanvasContainerNodesV1,
      classEntityNodesEnabled: ROLLOUT_FLAGS.openCanvasClassEntityNodesV1,
      mindmapJourneyNodesEnabled: ROLLOUT_FLAGS.openCanvasMindmapJourneyNodesV1,
      sequenceNodesEnabled: ROLLOUT_FLAGS.openCanvasSequenceNodesV1,
      wireframeNodesEnabled: ROLLOUT_FLAGS.openCanvasWireframeNodesV1,
      onStatusChange: (nextStatus) => {
        if (disposed) return;
        setStatus(nextStatus);
        if (nextStatus === 'context-lost') fallback('WEBGL_CONTEXT_LOST');
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
  }, [capability.supported, fallback]);

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
    <main id="main-content" className="pixi-spike" onKeyDown={handleKeyDown}>
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
          const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = `${projection.document.name.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase() || 'diagram'}.svg`;
          anchor.click();
          queueMicrotask(() => URL.revokeObjectURL(url));
        }}>Export SVG</button>
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
      <section
        ref={viewportRef}
        className="pixi-spike__viewport"
        aria-label="OpenCanvas document write canary. Drag to pan and use the wheel to zoom."
        data-testid="opencanvas-document-viewport"
        tabIndex={0}
        style={{ touchAction: 'none' }}
        onPointerDown={(event) => {
          if ((event.button !== 0 && event.button !== 1) || !hostRef.current) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          const point = {
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
          };
          additiveSelectionRef.current = event.shiftKey || event.metaKey || event.ctrlKey;
          const host = hostRef.current;
          if (drawingTool && event.button === 0) {
            pointerOperationRef.current = beginFreeformOperation(
              event.pointerId, drawingTool, host.screenToWorld(point)
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
              kind: 'camera',
              gesture: beginCameraPan(event.pointerId, point),
            };
          }
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
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
            const next = moveCameraPan(cameraRef.current, operation.gesture, point);
            pointerOperationRef.current = { kind: 'camera', gesture: next.gesture };
            applyCamera(next.camera);
          } else if (operation.kind === 'freeform') {
            const host = hostRef.current;
            if (!host) return;
            const samples = event.nativeEvent.getCoalescedEvents?.() ?? [event.nativeEvent];
            const worldPoints = samples.map((sample) => host.screenToWorld({
              x: sample.clientX - bounds.left, y: sample.clientY - bounds.top,
            }));
            pointerOperationRef.current = updateFreeformOperation(operation, worldPoints);
          } else if (operation.kind === 'transform') {
            const next = updateTransformOperation(
              operation,
              hostRef.current?.screenToWorld(point) ?? point,
              !event.altKey
            );
            pointerOperationRef.current = next;
            hostRef.current?.setTransformPreview(next.result);
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
          }
        }}
        onPointerUp={(event) => {
          const operation = pointerOperationRef.current;
          if (!operation || (operation.kind === 'camera'
            ? operation.gesture.pointerId
            : operation.pointerId) !== event.pointerId) return;
          if (operation.kind === 'camera') {
            if (!operation.gesture.moved && event.button === 0) {
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
          } else if (operation.kind === 'freeform') {
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
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onPointerCancel={() => {
          hostRef.current?.setTransformPreview(null);
          hostRef.current?.setConnectorPreview(null);
          pendingSelectionToggleRef.current = null;
          pointerOperationRef.current = null;
        }}
        onWheel={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          event.preventDefault();
          applyCamera(zoomReadOnlyCamera(cameraRef.current, {
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
          }, event.deltaY));
        }}
      />
      {renderDiagnostics ? (
        <output className="pixi-spike__diagnostics" aria-label="OpenCanvas render diagnostics">
          {renderDiagnostics.nodeCount} nodes · {renderDiagnostics.connectorCount} connectors ·{' '}
          {renderDiagnostics.renderCount} renders · {renderDiagnostics.coalescedRequests} coalesced ·{' '}
          {renderDiagnostics.lastRenderDurationMs.toFixed(2)} ms ·{' '}
          {renderDiagnostics.continuousTickerRunning ? 'continuous' : 'idle-on-demand'}
        </output>
      ) : null}
      <p className="sr-only" aria-live="polite">{selectionMessage}</p>
      {projection.status === 'ready' && ROLLOUT_FLAGS.openCanvasA11yV1 && (
        <aside id="opencanvas-inspector"
          className={inspectorOpen ? 'pixi-spike__inspector' : 'sr-only'}
          aria-label="OpenCanvas inspector">
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
                <button
                  data-canvas-semantic-node="true"
                  ref={(element) => {
                    if (element) semanticNodeRefs.current.set(node.id, element);
                    else semanticNodeRefs.current.delete(node.id);
                  }}
                  type="button"
                  aria-pressed={semanticSelection.nodeIds.includes(node.id)}
                  onClick={(event) => applySelection(selectionAfterClick(
                    selectionRef.current,
                    node.id,
                    event.shiftKey || event.metaKey || event.ctrlKey
                  ))}
                >
                  Select {label}
                </button>
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
                <button
                  type="button"
                  aria-pressed={selectedConnectorId === connector.id}
                  onClick={() => applyConnectorSelection(connector.id)}
                >
                  Select connector {label}
                </button>
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
      )}
    </main>
  );
}
