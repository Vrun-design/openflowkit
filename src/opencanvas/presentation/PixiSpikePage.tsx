import React, { useCallback, useRef, useState } from 'react';
import { ROLLOUT_FLAGS } from '../../config/rolloutFlags';
import {
  clearSelection,
  replaceSelection,
  selectionAnnouncement,
  type CanvasSelection,
} from '../application/selection/selection';
import { DEFAULT_CANVAS_CAMERA, fitCameraToBounds, zoomCameraAt } from '../domain/camera/camera';
import { setNodeContentLayout } from '../domain/node-layout/editing';
import { resolveNodeContentLayout } from '../domain/node-layout/model';
import type { NodeContentLayoutV1 } from '../domain/node-layout/types';
import type { CanvasCamera } from '../domain/camera/types';
import { detectWebGlCapability } from '../infrastructure/pixi/capabilities';
import { PixiRendererHost, type PixiRendererStatus } from '../infrastructure/pixi/PixiRendererHost';
import { PixiSpikeToolbar, type CanvasMode } from './PixiSpikeControls';
import { PixiSpikeViewport } from './PixiSpikeViewport';
import { selectionStatus, type PixiPointerOperation } from './pixiPointerOperations';
import { usePixiDocumentHistory } from './usePixiDocumentHistory';
import { usePixiConnectorActions } from './usePixiConnectorActions';
import { usePixiConnectorSelection } from './usePixiConnectorSelection';
import { usePixiKeyboardShortcuts } from './usePixiKeyboardShortcuts';
import { usePixiPointerHandlers } from './usePixiPointerHandlers';
import { usePixiBenchmarkApi, usePixiRendererMount } from './usePixiSpikeRuntime';
import './pixiSpikePage.css';

const INITIAL_NODE_COUNT = 300;
const FIXTURE_SIZES = [100, 300, 1_000] as const;

export function PixiSpikePage(): React.JSX.Element {
  const viewportRef = useRef<HTMLElement>(null);
  const hostRef = useRef<PixiRendererHost | null>(null);
  const operationRef = useRef<PixiPointerOperation | null>(null);
  const cameraRef = useRef<CanvasCamera>(DEFAULT_CANVAS_CAMERA);
  const editingNodeRef = useRef<string | null>(null);
  const selectionRef = useRef<CanvasSelection>(clearSelection());
  const [capability] = useState(detectWebGlCapability);
  const [status, setStatus] = useState<PixiRendererStatus>(
    capability.supported ? 'initializing' : 'unavailable'
  );
  const [nodeCount, setNodeCount] = useState(INITIAL_NODE_COUNT);
  const [zoom, setZoom] = useState(1);
  const [mode, setMode] = useState<CanvasMode>('select');
  const [selection, setSelectionState] = useState<CanvasSelection>(clearSelection);
  const [editorBounds, setEditorBounds] = useState<DOMRect | null>(null);
  const [error, setError] = useState<string | null>(null);

  const closeEditor = useCallback(() => {
    editingNodeRef.current = null;
    setEditorBounds(null);
  }, []);

  const applySelection = useCallback(
    (nextSelection: CanvasSelection) => {
      selectionRef.current = nextSelection;
      setSelectionState(nextSelection);
      hostRef.current?.setSelection(nextSelection.nodeIds, nextSelection.primaryNodeId);
      if (!nextSelection.primaryNodeId) closeEditor();
    },
    [closeEditor]
  );
  const connectorSelection = usePixiConnectorSelection({
    hostRef,
    applyNodeSelection: applySelection,
  });
  const {
    selectedConnectorId,
    activeConnectorHandle,
    selectedConnectorIdRef,
    activeConnectorHandleRef,
    applyConnectorSelection,
  } = connectorSelection;
  const {
    historyRef,
    present,
    canUndo,
    canRedo,
    announcement: actionAnnouncement,
    commitTransform,
    commitConnector,
    commitNode,
    undo,
    redo,
    reset,
  } = usePixiDocumentHistory({
    initialNodeCount: INITIAL_NODE_COUNT,
    hostRef,
    selectionRef,
    selectedConnectorIdRef,
    applySelection,
    applyConnectorSelection,
  });
  const { currentConnector, addBend, removeActiveBend, resetRoute, nudgeActiveHandle } =
    usePixiConnectorActions({
      historyRef,
      hostRef,
      selectedConnectorIdRef,
      activeConnectorHandleRef,
      applyConnectorSelection,
      commitConnector,
    });

  const updateCamera = useCallback((camera: CanvasCamera) => {
    cameraRef.current = camera;
    hostRef.current?.setCamera(camera);
    if (editingNodeRef.current) {
      setEditorBounds(hostRef.current?.getNodeScreenBounds(editingNodeRef.current) ?? null);
    }
    setZoom(camera.zoom);
  }, []);

  const resetCamera = useCallback(() => updateCamera(DEFAULT_CANVAS_CAMERA), [updateCamera]);

  const fitView = useCallback(() => {
    const host = hostRef.current;
    const contentBounds = host?.getContentBounds();
    if (!host || !contentBounds) return;
    updateCamera(fitCameraToBounds(contentBounds, host.getViewportSize()));
  }, [updateCamera]);

  const loadFixture = useCallback(
    async (count: number): Promise<number> => {
      const startedAt = performance.now();
      reset(count);
      setNodeCount(count);
      applySelection(clearSelection());
      applyConnectorSelection(null);
      closeEditor();
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      return Number((performance.now() - startedAt).toFixed(3));
    },
    [applyConnectorSelection, applySelection, closeEditor, reset]
  );

  usePixiRendererMount({
    supported: capability.supported,
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
    viewportRef,
    hostRef,
    cameraRef,
    historyRef,
    fitView,
    setStatus,
    setError,
  });
  usePixiBenchmarkApi({
    loadFixture,
    resetCamera,
    status,
    nodeCount,
    mode,
    hostRef,
    historyRef,
    cameraRef,
    selectionRef,
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
  });

  function openEditor(nodeId: string): void {
    applyConnectorSelection(null);
    applySelection(replaceSelection([nodeId]));
    editingNodeRef.current = nodeId;
    setEditorBounds(hostRef.current?.getNodeScreenBounds(nodeId) ?? null);
  }

  function handleWheel(event: React.WheelEvent<HTMLElement>): void {
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const anchor = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    updateCamera(
      zoomCameraAt(
        cameraRef.current,
        anchor,
        cameraRef.current.zoom * Math.exp(-event.deltaY * 0.001)
      )
    );
  }

  function zoomFromCenter(factor: number): void {
    const viewport = hostRef.current?.getViewportSize();
    if (!viewport) return;
    updateCamera(
      zoomCameraAt(
        cameraRef.current,
        { x: viewport.width / 2, y: viewport.height / 2 },
        cameraRef.current.zoom * factor
      )
    );
  }

  const { handlePointerDown, handlePointerMove, handlePointerUp, handleDoubleClick } =
    usePixiPointerHandlers({
      mode,
      hostRef,
      operationRef,
      cameraRef,
      historyRef,
      selectionRef,
      currentConnector,
      applyConnectorSelection,
      applySelection,
      updateCamera,
      commitTransform,
      commitConnector,
      addBend,
      openEditor,
    });

  const handleKeyDown = usePixiKeyboardShortcuts({
    historyRef,
    selectionRef,
    selectedConnectorIdRef,
    activeConnectorHandleRef,
    primaryNodeId: selection.primaryNodeId,
    undo,
    redo,
    addBend: () => addBend(),
    removeActiveBend,
    resetRoute,
    nudgeActiveHandle,
    applyConnectorSelection,
    applySelection,
    commitTransform,
    fitView,
    zoomFromCenter,
    setMode,
    openEditor,
  });

  const unavailableReason = error ?? capability.reason;
  const selectedNode = selection.primaryNodeId
    ? (present.pages[0].nodes.find((node) => node.id === selection.primaryNodeId) ?? null)
    : null;
  const nodeLayout = selectedNode
    ? resolveNodeContentLayout(selectedNode.content, ROLLOUT_FLAGS.openCanvasNodeLayoutV1)
    : null;
  function changeNodeLayout(layout: NodeContentLayoutV1, label: string): void {
    const page = historyRef.current.present.pages[0];
    const currentNode = page.nodes.find((node) => node.id === selectionRef.current.primaryNodeId);
    if (!currentNode) return;
    commitNode(page, currentNode, setNodeContentLayout(currentNode, layout), label);
  }
  const announcement = selectedConnectorId
    ? `Connector ${selectedConnectorId} selected.`
    : selectionAnnouncement(selection);

  return (
    <main id="main-content" className="pixi-spike">
      <PixiSpikeToolbar
        webGlVersion={capability.version}
        nodeCount={nodeCount}
        fixtureSizes={FIXTURE_SIZES}
        status={status}
        zoom={zoom}
        onLoadFixture={(count) => void loadFixture(count)}
        onFitView={fitView}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        connectorModelEnabled={ROLLOUT_FLAGS.openCanvasConnectorsV1}
      />

      <PixiSpikeViewport
        ref={viewportRef}
        mode={mode}
        unavailableReason={unavailableReason}
        editorBounds={editorBounds}
        primaryNodeId={selection.primaryNodeId}
        announcement={actionAnnouncement || announcement}
        selectionStatus={
          selectedConnectorId ? `Editing ${selectedConnectorId}` : selectionStatus(selection, mode)
        }
        selectedConnectorId={selectedConnectorId}
        activeConnectorHandle={activeConnectorHandle}
        nodeLayout={nodeLayout}
        nodeLayoutEnabled={ROLLOUT_FLAGS.openCanvasNodeLayoutV1}
        onChangeNodeLayout={changeNodeLayout}
        onAddConnectorWaypoint={() => addBend()}
        onRemoveConnectorWaypoint={removeActiveBend}
        onResetConnectorRoute={resetRoute}
        onModeChange={setMode}
        onZoomOut={() => zoomFromCenter(1 / 1.2)}
        onZoomIn={() => zoomFromCenter(1.2)}
        onFitView={fitView}
        onCloseEditor={closeEditor}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          operationRef.current = null;
          hostRef.current?.setMarquee(null);
          hostRef.current?.setTransformPreview(null);
          hostRef.current?.setConnectorPreview(null);
        }}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
      />
    </main>
  );
}
