import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAIGeneration } from '@/hooks/useAIGeneration';
import { parseInfraDslApplyInput } from './infraDslApply';
import { useFlowExport } from '@/hooks/useFlowExport';
import { useToast } from '@/components/ui/ToastContext';
import { usePlayback } from '@/hooks/usePlayback';
import { buildFlowEditorScreenControllerParams } from './buildFlowEditorScreenControllerParams';
import { useFlowEditorController } from './useFlowEditorController';
import { useFlowEditorPanelActions } from './useFlowEditorPanelActions';
import { useFlowEditorRuntime } from './useFlowEditorRuntime';
import { useFlowEditorScreenState } from './useFlowEditorScreenState';
import { useFlowEditorScreenBehavior } from './useFlowEditorScreenBehavior';

interface UseFlowEditorScreenModelParams {
  onGoHome: () => void;
}

export function useFlowEditorScreenModel({ onGoHome }: UseFlowEditorScreenModelParams) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const screenState = useFlowEditorScreenState();
  const { operations, callbacks } = useFlowEditorScreenBehavior({
    screenState,
    t,
  });

  const [pendingAIPrompt, setPendingAIPrompt] = useState<string | undefined>();
  const clearPendingAIPrompt = useCallback(() => setPendingAIPrompt(undefined), []);
  const {
    isGenerating,
    streamingText,
    retryCount,
    cancelGeneration,
    pendingDiff,
    confirmPendingDiff,
    discardPendingDiff,
    readiness,
    lastError,
    handleAIRequest,
    handleFocusedAIRequest,
    handleCodeAnalysis,
    handleSqlAnalysis,
    handleTerraformAnalysis,
    handleOpenApiAnalysis,
    handleCodebaseAnalysis,
    chatMessages,
    clearChat,
    clearLastError,
  } = useAIGeneration(screenState.recordHistory, callbacks.handleCommandBarApply);

  const handleApplyDsl = useCallback(
    (dsl: string) => {
      const result = parseInfraDslApplyInput(dsl);
      if (result.status === 'error') {
        addToast(`Import failed: ${result.message}`, 'error', 5000);
        return;
      }
      callbacks.handleCommandBarApply(result.nodes, result.edges);
      addToast('Import applied to canvas.', 'success', 3000);
    },
    [addToast, callbacks]
  );

  const {
    handleGenerateEntityFields,
    handleSuggestArchitectureNode,
    handleOpenMermaidCodeEditor,
    applyArchitectureTemplate,
  } = useFlowEditorPanelActions({
    handleFocusedAIRequest,
    setStudioTab: screenState.setStudioTab,
    setStudioCodeMode: screenState.setStudioCodeMode,
    setStudioMode: screenState.setStudioMode,
    handleApplyArchitectureTemplate: operations.handleApplyArchitectureTemplate,
  });

  const {
    isPlaying,
    currentStepIndex,
    totalSteps,
    startPlayback,
    stopPlayback,
    togglePlay,
    nextStep,
    prevStep,
    setPlaybackSpeed,
    playbackSpeed,
    jumpToStep,
  } = usePlayback();

  const {
    fileInputRef,
    handleExport,
    handleCopyImage,
    handleSvgExport,
    handleCopySvg,
    handlePdfExport,
    handleCinematicExport,
    handleExportJSON,
    handleCopyJSON,
    handleImportJSON,
    onFileImport,
  } = useFlowExport(screenState.recordHistory, screenState.reactFlowWrapper, {
    stopPlayback,
  });

  const {
    collaborationTopNavState,
    remotePresence,
    collaborationNodePositions,
    isLayouting,
    onLayout,
    handleInsertTemplate,
    handleExportMermaid,
    handleDownloadMermaid,
    handleExportPlantUML,
    handleDownloadPlantUML,
    handleExportOpenFlowDSL,
    handleDownloadOpenFlowDSL,
    handleExportFigma,
    handleDownloadFigma,
    handleShare,
    shareViewerUrl,
    clearShareViewerUrl,
  } = useFlowEditorRuntime({
    collaborationEnabled: screenState.collaborationEnabled,
    activePageId: screenState.activePageId,
    activePageName: screenState.activePageName,
    nodes: screenState.nodes,
    edges: screenState.edges,
    editorSurfaceRef: screenState.reactFlowWrapper,
    setNodes: screenState.setNodes,
    setEdges: screenState.setEdges,
    addToast,
    recordHistory: screenState.recordHistory,
    fitView: screenState.fitView,
    t,
    exportSerializationMode: screenState.viewSettings.exportSerializationMode,
    queueAutoSnapshot: screenState.queueAutoSnapshot,
  });

  const flowEditorControllerConfig = buildFlowEditorScreenControllerParams({
    shell: {
      location: screenState.location,
      navigate: screenState.navigate,
      pages: screenState.pages,
      activePageId: screenState.activePageId,
      snapshots: screenState.snapshots,
      nodes: screenState.nodes,
      edges: screenState.edges,
      selectedNodeId: screenState.selectedNodeId,
      selectedEdgeId: screenState.selectedEdgeId,
      isCommandBarOpen: screenState.isCommandBarOpen,
      isHistoryOpen: screenState.isHistoryOpen,
      editorMode: screenState.editorMode,
      handleExportJSON,
      onLayout,
      fileInputRef,
    },
    studio: {
      editorMode: screenState.editorMode,
      studioTab: screenState.studioTab,
      selectedNodeId: screenState.selectedNodeId,
      selectedEdgeId: screenState.selectedEdgeId,
      setStudioTab: screenState.setStudioTab,
      setStudioCodeMode: screenState.setStudioCodeMode,
      setStudioMode: screenState.setStudioMode,
      closeCommandBar: screenState.closeCommandBar,
      setCanvasMode: screenState.setCanvasMode,
      setSelectedNodeId: screenState.setSelectedNodeId,
      setSelectedEdgeId: screenState.setSelectedEdgeId,
    },
    panels: {
      commandBar: {
        commandBarView: screenState.commandBarView,
        undo: screenState.undo,
        redo: screenState.redo,
        handleInsertTemplate,
        showGrid: screenState.viewSettings.showGrid,
        toggleGrid: screenState.toggleGrid,
        snapToGrid: screenState.viewSettings.snapToGrid,
        toggleSnap: screenState.toggleSnap,
        handleCodeAnalysis,
        handleSqlAnalysis,
        handleTerraformAnalysis,
        handleOpenApiAnalysis,
        handleApplyDsl,
        handleCodebaseAnalysis,
      },
      snapshots: {
        closeHistory: screenState.closeHistory,
        manualSnapshots: screenState.manualSnapshots,
        autoSnapshots: screenState.autoSnapshots,
        saveSnapshot: screenState.saveSnapshot,
        handleRestoreSnapshot: callbacks.handleRestoreSnapshot,
        deleteSnapshot: screenState.deleteSnapshot,
        setDiffBaseline: screenState.setDiffBaseline,
      },
      properties: {
        updateNodeData: operations.updateNodeData,
        applyBulkNodeData: operations.applyBulkNodeData,
        updateNodeType: operations.updateNodeType,
        updateEdge: operations.updateEdge,
        deleteNode: operations.deleteNode,
        duplicateNode: operations.duplicateNode,
        deleteEdge: operations.deleteEdge,
        updateNodeZIndex: operations.updateNodeZIndex,
        fitSectionToContents: operations.fitSectionToContents,
        releaseFromSection: operations.releaseFromSection,
        handleBringContentsIntoSection: operations.handleBringContentsIntoSection,
        handleAddMindmapChild: operations.handleAddMindmapChild,
        handleAddMindmapSibling: operations.handleAddMindmapSibling,
        handleAddArchitectureService: operations.handleAddArchitectureService,
        handleCreateArchitectureBoundary: operations.handleCreateArchitectureBoundary,
        handleApplyArchitectureTemplate: applyArchitectureTemplate,
        handleGenerateEntityFields,
        handleSuggestArchitectureNode,
        handleConvertEntitySelectionToClassDiagram:
          operations.handleConvertEntitySelectionToClassDiagram,
        handleOpenMermaidCodeEditor,
      },
      studio: {
        handleCommandBarApply: callbacks.handleCommandBarApply,
        handleAIRequest,
        isGenerating,
        streamingText,
        retryCount,
        cancelGeneration,
        pendingDiff,
        confirmPendingDiff,
        discardPendingDiff,
        aiReadiness: readiness,
        lastAIError: lastError,
        onClearAIError: clearLastError,
        chatMessages,
        clearChat,
        studioCodeMode: screenState.studioCodeMode,
        playback: {
          currentStepIndex,
          totalSteps,
          isPlaying,
          startPlayback,
          togglePlay,
          stopPlayback,
          jumpToStep,
          nextStep,
          prevStep,
          playbackSpeed,
          setPlaybackSpeed,
        },
        pendingAIPrompt,
        clearPendingAIPrompt,
      },
      isHistoryOpen: screenState.isHistoryOpen,
      editorMode: screenState.editorMode,
    },
    chrome: {
      handleSwitchPage: callbacks.handleSwitchPage,
      handleAddPage: callbacks.handleAddPage,
      handleClosePage: callbacks.handleClosePage,
      handleRenamePage: callbacks.handleRenamePage,
      handleExport,
      handleCopyImage,
      handleSvgExport,
      handleCopySvg,
      handlePdfExport,
      handleCinematicExport,
      handleExportJSON,
      handleCopyJSON,
      handleExportMermaid,
      handleDownloadMermaid,
      handleExportPlantUML,
      handleDownloadPlantUML,
      handleExportOpenFlowDSL,
      handleDownloadOpenFlowDSL,
      handleExportFigma,
      handleDownloadFigma,
      handleShare,
      handleImportJSON,
      openHistory: screenState.openHistory,
      onGoHome,
      collaborationTopNavState,
      openCommandBar: screenState.openCommandBar,
      handleAddShape: operations.handleAddShape,
      undo: screenState.undo,
      redo: screenState.redo,
      canUndo: screenState.canUndo,
      canRedo: screenState.canRedo,
      isSelectMode: screenState.isSelectMode,
      enableSelectMode: screenState.enableSelectMode,
      enablePanMode: screenState.enablePanMode,
      getCenter: callbacks.getCenter,
      t,
      handleAddNode: operations.handleAddNode,
      setPendingAIPrompt,
      startPlayback,
      totalSteps,
      isPlaying,
      togglePlay,
      nextStep,
      prevStep,
      stopPlayback,
      handleAddAnnotation: operations.handleAddAnnotation,
      handleAddSection: operations.handleAddSection,
      handleAddTextNode: operations.handleAddTextNode,
      handleAddJourneyNode: operations.handleAddJourneyNode,
      handleAddMindmapNode: operations.handleAddMindmapNode,
      handleAddArchitectureNode: operations.handleAddArchitectureNode,
      handleAddSequenceParticipant: operations.handleAddSequenceParticipant,
      handleAddClassNode: operations.handleAddClassNode,
      handleAddEntityNode: operations.handleAddEntityNode,
      handleAddImage: operations.handleAddImage,
      handleAddWireframe: operations.handleAddWireframe,
      handleAddDomainLibraryItem: operations.handleAddDomainLibraryItem,
    },
  });
  const flowEditorController = useFlowEditorController(flowEditorControllerConfig);

  return {
    nodes: screenState.nodes,
    edges: screenState.edges,
    pages: screenState.pages,
    activePageId: screenState.activePageId,
    viewSettings: screenState.viewSettings,
    diffBaseline: screenState.diffBaseline,
    setDiffBaseline: screenState.setDiffBaseline,
    recordHistory: screenState.recordHistory,
    isSelectMode: screenState.isSelectMode,
    reactFlowWrapper: screenState.reactFlowWrapper,
    fileInputRef,
    onFileImport,
    shareViewerUrl,
    clearShareViewerUrl,
    collaborationEnabled: screenState.collaborationEnabled,
    remotePresence,
    collaborationNodePositions,
    isLayouting,
    flowEditorController,
    t,
  };
}
