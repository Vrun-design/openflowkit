import React, { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import ReactFlow, {
  Background,
  useReactFlow,
  toFlowNode,
} from '@/lib/reactflowCompat';
import { useFlowStore } from '../store';
import type { FlowNode, NodeData } from '../lib/types';
import { useFlowOperations } from '../hooks/useFlowOperations';
import { useModifierKeys } from '../hooks/useModifierKeys';
import { useEdgeInteractions } from '../hooks/useEdgeInteractions';
import CustomConnectionLine from './CustomConnectionLine';
import { NavigationControls } from './NavigationControls';
import { FlowCanvasOverlays } from './flow-canvas/FlowCanvasOverlays';
import { flowCanvasEdgeTypes, flowCanvasNodeTypes } from './flow-canvas/flowCanvasTypes';
import { useFlowCanvasMenusAndActions } from './flow-canvas/useFlowCanvasMenusAndActions';
import { useFlowCanvasDragDrop } from './flow-canvas/useFlowCanvasDragDrop';
import { useFlowCanvasConnectionState } from './flow-canvas/useFlowCanvasConnectionState';
import { useFlowCanvasPaste } from './flow-canvas/useFlowCanvasPaste';
import { useFlowCanvasInteractionLod } from './flow-canvas/useFlowCanvasInteractionLod';
import { useFlowCanvasZoomLod } from './flow-canvas/useFlowCanvasZoomLod';
import { useFlowCanvasViewState } from './flow-canvas/useFlowCanvasViewState';
import { useFlowCanvasReactFlowConfig } from './flow-canvas/useFlowCanvasReactFlowConfig';
import { useFlowCanvasSelectionTools } from './flow-canvas/useFlowCanvasSelectionTools';
import type { ConnectMenuState } from './flow-canvas/useFlowCanvasMenus';
import { useToast } from './ui/ToastContext';
import { isCanvasBackgroundTarget } from '@/hooks/edgeConnectInteractions';
import { setEdgeInteractionLowDetailMode } from './custom-edge/edgeRenderMode';
import { useCanvasActions, useCanvasState } from '@/store/canvasHooks';
import { useSelectionActions } from '@/store/selectionHooks';
import { useTabActions, useActiveTabId } from '@/store/tabHooks';
import { useCanvasViewSettings } from '@/store/viewHooks';
import { useMermaidDiagnosticsActions } from '@/store/selectionHooks';

interface FlowCanvasProps {
  recordHistory: () => void;
  isSelectMode: boolean;
  onCanvasEntityIntent?: () => void;
}

export const FlowCanvas: React.FC<FlowCanvasProps> = ({
  recordHistory,
  isSelectMode,
  onCanvasEntityIntent,
}) => {
  const { t } = useTranslation();
  const { nodes, edges } = useCanvasState();
  const { onNodesChange, onEdgesChange, setNodes, setEdges } = useCanvasActions();
  const activeTabId = useActiveTabId();
  const { updateTab } = useTabActions();
  const { setSelectedNodeId, setSelectedEdgeId } = useSelectionActions();
  const { setMermaidDiagnostics, clearMermaidDiagnostics } = useMermaidDiagnosticsActions();
  const {
    showGrid,
    snapToGrid,
    alignmentGuidesEnabled,
    largeGraphSafetyMode,
    largeGraphSafetyProfile,
    architectureStrictMode,
  } = useCanvasViewSettings();
  const { layers } = useFlowStore(
    useShallow((state) => ({
      layers: state.layers,
    }))
  );
  const { addToast } = useToast();
  const {
    safetyModeActive,
    viewportCullingEnabled,
    effectiveShowGrid,
    layerAdjustedNodes,
    effectiveEdges,
  } = useFlowCanvasViewState({
    nodes,
    edges,
    layers,
    showGrid,
    largeGraphSafetyMode,
    largeGraphSafetyProfile,
  });
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const connectMenuSetterRef = useRef<((value: ConnectMenuState | null) => void) | null>(null);

  const { screenToFlowPosition, fitView } = useReactFlow();
  const clearPaneSelection = useCallback((): void => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, [setSelectedEdgeId, setSelectedNodeId]);
  // --- Operations ---
  const {
    onConnect,
    onSelectionChange,
    onNodeDoubleClick,
    onNodeDragStart,
    onNodeDragStop,
    onConnectStart,
    onConnectEnd,
    handleAddAndConnect,
    handleAddDomainLibraryItemAndConnect,
    handleAddNode,
    deleteNode,
    deleteEdge,
    duplicateNode,
    updateNodeType,
    updateNodeData,
    updateNodeZIndex,
    fitSectionToContents,
    releaseFromSection,
    handleBringContentsIntoSection,
    pasteSelection,
    copySelection,
    handleAlignNodes,
    handleDistributeNodes,
    handleGroupNodes,
    handleWrapInSection,
    onReconnect,
    onNodeDrag,
    handleAddImage,
  } = useFlowOperations(recordHistory, (position, sourceId, sourceHandle, sourceType) => {
    connectMenuSetterRef.current?.({ position, sourceId, sourceHandle, sourceType });
  });
  const {
    connectMenu,
    setConnectMenu,
    contextMenu,
    onNodeContextMenu,
    onSelectionContextMenu,
    onPaneContextMenu,
    onEdgeContextMenu,
    onPaneClick,
    onCloseContextMenu,
    contextActions,
  } = useFlowCanvasMenusAndActions({
    onPaneSelectionClear: clearPaneSelection,
    screenToFlowPosition,
    copySelection,
    pasteSelection,
    duplicateNode,
    deleteNode,
    deleteEdge,
    updateNodeZIndex,
    updateNodeType,
    updateNodeData,
    fitSectionToContents,
    releaseFromSection,
    bringContentsIntoSection: handleBringContentsIntoSection,
    handleAlignNodes,
    handleDistributeNodes,
    handleGroupNodes,
    handleWrapInSection,
    nodes,
  });
  useEffect(() => {
    connectMenuSetterRef.current = setConnectMenu;
  }, [setConnectMenu]);

  const { onDragOver, onDrop } = useFlowCanvasDragDrop({
    screenToFlowPosition,
    handleAddImage,
  });

  // --- Keyboard Shortcuts ---
  const { isSelectionModifierPressed } = useModifierKeys();
  useEdgeInteractions();

  const isEffectiveSelectMode = isSelectMode || isSelectionModifierPressed;
  const { lowDetailModeActive, farZoomReductionActive } = useFlowCanvasZoomLod({
    safetyModeActive,
    largeGraphSafetyProfile,
  });
  const { interactionLowDetailModeActive, startInteractionLowDetail, endInteractionLowDetail } =
    useFlowCanvasInteractionLod({
      safetyModeActive,
      largeGraphSafetyProfile,
    });
  const reactFlowConfig = useFlowCanvasReactFlowConfig({
    visualQualityV2Enabled: true,
    isEffectiveSelectMode,
    viewportCullingEnabled,
    effectiveEdges,
  });
  const { isConnecting, onConnectStartWrapper, onConnectEndWrapper } = useFlowCanvasConnectionState(
    {
      onConnectStart: (event, params) => {
        onConnectStart(
          event as Parameters<typeof onConnectStart>[0],
          params as Parameters<typeof onConnectStart>[1]
        );
      },
      onConnectEnd: (event) => {
        onConnectEnd(event as Parameters<typeof onConnectEnd>[0]);
      },
    }
  );
  const getCanvasCenterFlowPosition = (): { x: number; y: number } => {
    if (!reactFlowWrapper.current) {
      return screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    }
    const rect = reactFlowWrapper.current.getBoundingClientRect();
    return screenToFlowPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  };

  const {
    alignmentGuides,
    selectionDragPreview,
    handleNodeDragStart,
    handleNodeDrag,
    handleNodeDragStop,
  } = useFlowCanvasSelectionTools({
    layerAdjustedNodes,
    edges: effectiveEdges,
    alignmentGuidesEnabled,
    toTypedFlowNode: (node) => toTypedFlowNode(node as Parameters<typeof toFlowNode>[0]),
    onNodeDragStart: (event, node) =>
      onNodeDragStart(event as Parameters<typeof onNodeDragStart>[0], node),
    onNodeDrag: (event, node, draggedNodes) =>
      onNodeDrag(event as Parameters<typeof onNodeDrag>[0], node, draggedNodes),
    onNodeDragStop: (event, node) =>
      onNodeDragStop(event as Parameters<typeof onNodeDragStop>[0], node),
    startInteractionLowDetail,
    endInteractionLowDetail,
  });

  const onCanvasDoubleClickCapture = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (!isCanvasBackgroundTarget(event.target)) return;
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    handleAddNode(position);
  };

  function toTypedFlowNode(node: Parameters<typeof toFlowNode>[0]): FlowNode {
    return toFlowNode<NodeData>(node);
  }

  const { handleCanvasPaste } = useFlowCanvasPaste({
    architectureStrictMode,
    activeTabId,
    fitView,
    updateTab,
    recordHistory,
    setNodes,
    setEdges,
    setSelectedNodeId,
    setMermaidDiagnostics,
    clearMermaidDiagnostics,
    addToast,
    strictModePasteBlockedMessage: t(
      'flowCanvas.strictModePasteBlocked',
      'Architecture strict mode blocked Mermaid paste. Open Code view, fix diagnostics, then retry.'
    ),
    pasteSelection,
    getCanvasCenterFlowPosition,
  });

  React.useEffect(() => {
    setEdgeInteractionLowDetailMode(interactionLowDetailModeActive);
    return () => {
      setEdgeInteractionLowDetailMode(false);
    };
  }, [interactionLowDetailModeActive]);

  return (
    <div
      className={`w-full h-full relative ${isConnecting ? 'is-connecting' : ''} ${lowDetailModeActive ? 'flow-lod-low' : ''} ${interactionLowDetailModeActive ? 'flow-lod-interaction' : ''} ${farZoomReductionActive ? 'flow-lod-far' : ''}`}
      ref={reactFlowWrapper}
      onPasteCapture={handleCanvasPaste}
      onDoubleClickCapture={onCanvasDoubleClickCapture}
    >
      <ReactFlow
        nodes={layerAdjustedNodes}
        edges={effectiveEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        onSelectionChange={onSelectionChange}
        onNodeDragStart={handleNodeDragStart}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onMoveStart={startInteractionLowDetail}
        onMoveEnd={endInteractionLowDetail}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeClick={onCanvasEntityIntent}
        onEdgeClick={onCanvasEntityIntent}
        onNodeContextMenu={onNodeContextMenu}
        onSelectionContextMenu={onSelectionContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneClick={onPaneClick}
        onConnectStart={onConnectStartWrapper}
        onConnectEnd={onConnectEndWrapper}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={flowCanvasNodeTypes}
        edgeTypes={flowCanvasEdgeTypes}
        fitView
        className={reactFlowConfig.className}
        minZoom={0.1}
        onlyRenderVisibleElements={reactFlowConfig.onlyRenderVisibleElements}
        connectionMode={reactFlowConfig.connectionMode}
        isValidConnection={reactFlowConfig.isValidConnection}
        selectionOnDrag={reactFlowConfig.selectionOnDrag}
        selectNodesOnDrag={reactFlowConfig.selectNodesOnDrag}
        selectionKeyCode={reactFlowConfig.selectionKeyCode}
        panOnDrag={reactFlowConfig.panOnDrag}
        panActivationKeyCode={reactFlowConfig.panActivationKeyCode}
        selectionMode={reactFlowConfig.selectionMode}
        multiSelectionKeyCode={reactFlowConfig.multiSelectionKeyCode}
        zoomActivationKeyCode={reactFlowConfig.zoomActivationKeyCode}
        zoomOnScroll={reactFlowConfig.zoomOnScroll}
        zoomOnPinch={reactFlowConfig.zoomOnPinch}
        panOnScroll={reactFlowConfig.panOnScroll}
        panOnScrollMode={reactFlowConfig.panOnScrollMode}
        preventScrolling={reactFlowConfig.preventScrolling}
        zoomOnDoubleClick={reactFlowConfig.zoomOnDoubleClick}
        defaultEdgeOptions={reactFlowConfig.defaultEdgeOptions}
        connectionLineComponent={CustomConnectionLine}
        snapToGrid={snapToGrid}
      >
        {effectiveShowGrid && (
          <Background
            variant={reactFlowConfig.background.variant}
            gap={reactFlowConfig.background.gap}
            size={reactFlowConfig.background.size}
            color={reactFlowConfig.background.color}
          />
        )}
        <NavigationControls />
      </ReactFlow>
      <FlowCanvasOverlays
        alignmentGuidesEnabled={alignmentGuidesEnabled}
        alignmentGuides={alignmentGuides}
        overlayNodes={layerAdjustedNodes}
        selectionDragPreview={selectionDragPreview}
        connectMenu={connectMenu}
        setConnectMenu={setConnectMenu}
        screenToFlowPosition={screenToFlowPosition}
        handleAddAndConnect={handleAddAndConnect}
        handleAddDomainLibraryItemAndConnect={handleAddDomainLibraryItemAndConnect}
        contextMenu={contextMenu}
        onCloseContextMenu={onCloseContextMenu}
        copySelection={copySelection}
        contextActions={contextActions}
      />
    </div>
  );
};
