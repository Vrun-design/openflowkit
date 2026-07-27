import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { useReactFlow, toFlowNode } from '@/lib/reactflowCompat';
import { useFlowStore } from '../store';
import type { FlowNode, NodeData } from '../lib/types';
import { useFlowOperations } from '../hooks/useFlowOperations';
import { useModifierKeys } from '../hooks/useModifierKeys';
import { useEdgeInteractions } from '../hooks/useEdgeInteractions';
import { FlowCanvasSurface } from './flow-canvas/FlowCanvasSurface';
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
import {
  clearImportLayoutMetadata,
  isImportPendingLayoutNode,
  readImportLayoutMetadata,
} from '@/services/importLayoutMetadata';
import { composeDiagramForDisplay } from '@/services/composeDiagramForDisplay';

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
    mermaidImportMode,
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
  const lastInteractionScreenPositionRef = useRef<{ x: number; y: number } | null>(null);
  const connectMenuSetterRef = useRef<((value: ConnectMenuState | null) => void) | null>(null);
  const importStabilizationSignatureRef = useRef<string | null>(null);

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
    onImageDropError: (message) => addToast(message, 'error'),
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
  const getLastInteractionFlowPosition = (): { x: number; y: number } | null => {
    const position = lastInteractionScreenPositionRef.current;
    if (!position) {
      return null;
    }

    return screenToFlowPosition(position);
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
    mermaidImportMode,
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
    getLastInteractionFlowPosition,
    getCanvasCenterFlowPosition,
  });

  React.useEffect(() => {
    setEdgeInteractionLowDetailMode(interactionLowDetailModeActive);
    return () => {
      setEdgeInteractionLowDetailMode(false);
    };
  }, [interactionLowDetailModeActive]);

  // Stable signal: changes only when import-pending node IDs or their measured
  // state change — not on every node array reference update.
  const importStabilizationKey = useMemo(() => {
    const pending = nodes.filter(isImportPendingLayoutNode);
    if (pending.length === 0) return null;
    return pending
      .map((n) => {
        const m = (n as FlowNode & { measured?: { width?: number; height?: number } }).measured;
        return `${n.id}:${m?.width ?? '?'}x${m?.height ?? '?'}`;
      })
      .join('|');
  }, [nodes]);

  useEffect(() => {
    if (!importStabilizationKey) {
      importStabilizationSignatureRef.current = null;
      return;
    }

    const pendingImportNodes = nodes.filter(isImportPendingLayoutNode);
    const metadata = readImportLayoutMetadata(pendingImportNodes);
    if (!metadata || importStabilizationSignatureRef.current === metadata.signature) {
      return;
    }

    const measurableNodes = pendingImportNodes.filter((node) => node.type !== 'section');
    const allMeasured =
      measurableNodes.length > 0
      && measurableNodes.every((node) => {
        const m = (node as FlowNode & { measured?: { width?: number; height?: number } }).measured;
        return typeof m?.width === 'number' && typeof m?.height === 'number';
      });

    if (!allMeasured) {
      return;
    }

    importStabilizationSignatureRef.current = metadata.signature;

    const runConvergenceLoop = async (signature: string): Promise<void> => {
      const { clearLayoutCache } = await import('@/services/elkLayout');
      const { assignSmartHandles } = await import('@/services/smartEdgeRouting');

      // Up to 3 layout passes until node positions converge within 1px.
      // Mermaid.js does the same — first pass uses estimated sizes, subsequent
      // passes use React Flow's measured dimensions for precision.
      const MAX_PASSES = 3;
      const CONVERGENCE_THRESHOLD_PX = 1;

      let prevPositions: Map<string, { x: number; y: number }> | null = null;

      for (let pass = 0; pass < MAX_PASSES; pass++) {
        const state = useFlowStore.getState();
        const currentMetadata = readImportLayoutMetadata(state.nodes);
        if (!currentMetadata || currentMetadata.signature !== signature) return;

        clearLayoutCache();
        const { nodes: layoutedNodes, edges: layoutedEdges } = await composeDiagramForDisplay(
          state.nodes,
          state.edges,
          {
            direction: currentMetadata.direction,
            spacing: currentMetadata.spacing,
            contentDensity: currentMetadata.contentDensity,
            diagramType: currentMetadata.diagramType,
            source: 'import',
          }
        );

        const nextPositions = new Map(layoutedNodes.map((n) => [n.id, n.position]));

        const converged =
          prevPositions !== null &&
          layoutedNodes.every((n) => {
            const prev = prevPositions!.get(n.id);
            return (
              prev !== undefined &&
              Math.abs(n.position.x - prev.x) <= CONVERGENCE_THRESHOLD_PX &&
              Math.abs(n.position.y - prev.y) <= CONVERGENCE_THRESHOLD_PX
            );
          });

        prevPositions = nextPositions;

        const latestMetadata = readImportLayoutMetadata(useFlowStore.getState().nodes);
        if (!latestMetadata || latestMetadata.signature !== signature) return;

        const smartEdges = assignSmartHandles(layoutedNodes, layoutedEdges);
        const finalNodes = converged || pass === MAX_PASSES - 1
          ? clearImportLayoutMetadata(layoutedNodes)
          : layoutedNodes;

        setNodes(finalNodes);
        setEdges(smartEdges);

        if (converged) break;

        // Yield to React to render and measure the updated nodes before next pass.
        await new Promise<void>((resolve) => { window.setTimeout(resolve, 60); });
      }

      fitView({ duration: 500, padding: 0.2 });
    };

    const timer = window.setTimeout(() => {
      void runConvergenceLoop(metadata.signature).finally(() => {
        if (importStabilizationSignatureRef.current === metadata.signature) {
          importStabilizationSignatureRef.current = null;
        }
      });
    // Wait for React to render and measure nodes before first pass.
    }, 60);

    return () => window.clearTimeout(timer);
  }, [fitView, importStabilizationKey, nodes, setEdges, setNodes]);

  const selectedNodeCount = nodes.filter((node) => node.selected).length;
  const selectedEdgeCount = edges.filter((edge) => edge.selected).length;
  const selectionAnnouncement =
    selectedNodeCount === 0 && selectedEdgeCount === 0
      ? 'Canvas selection cleared.'
      : `${selectedNodeCount} node${selectedNodeCount === 1 ? '' : 's'} and ${selectedEdgeCount} edge${selectedEdgeCount === 1 ? '' : 's'} selected.`;

  return (
    <FlowCanvasSurface
      containerClassName={`w-full h-full relative ${isConnecting ? 'is-connecting' : ''} ${lowDetailModeActive ? 'flow-lod-low' : ''} ${interactionLowDetailModeActive ? 'flow-lod-interaction' : ''} ${farZoomReductionActive ? 'flow-lod-far' : ''}`}
      wrapperRef={reactFlowWrapper}
      onPointerDownCapture={(event) => {
        lastInteractionScreenPositionRef.current = {
          x: event.clientX,
          y: event.clientY,
        };
      }}
      onPasteCapture={handleCanvasPaste}
      onDoubleClickCapture={onCanvasDoubleClickCapture}
      selectionAnnouncement={selectionAnnouncement}
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
      fitView={true}
      reactFlowConfig={reactFlowConfig}
      snapToGrid={snapToGrid}
      effectiveShowGrid={effectiveShowGrid}
      alignmentGuidesEnabled={alignmentGuidesEnabled}
      alignmentGuides={alignmentGuides}
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
  );
};
