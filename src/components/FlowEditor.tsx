import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { useReactFlow } from '@/lib/reactflowCompat';
import '@xyflow/react/dist/style.css';
import { useFlowStore } from '../store';
import { FlowCanvas } from './FlowCanvas';
import { useSnapshots } from '../hooks/useSnapshots';
import { useFlowHistory } from '../hooks/useFlowHistory';
import { useFlowOperations } from '../hooks/useFlowOperations';
import { useAIGeneration } from '../hooks/useAIGeneration';
import { useFlowExport } from '../hooks/useFlowExport';
import { useToast } from './ui/ToastContext';
import { usePlayback } from '../hooks/usePlayback';
import { useFlowEditorUIState } from '@/hooks/useFlowEditorUIState';
import { useFlowEditorActions } from '@/hooks/useFlowEditorActions';
import { useFlowEditorCallbacks } from '@/hooks/useFlowEditorCallbacks';
import { FlowEditorChrome } from './flow-editor/FlowEditorChrome';
import { useCollaborationNodePositions } from './flow-editor/useCollaborationNodePositions';
import { useFlowEditorController } from './flow-editor/useFlowEditorController';
import { useFlowEditorInteractionBindings } from './flow-editor/useFlowEditorInteractionBindings';
import { useInfraDslApply } from './flow-editor/useInfraDslApply';
import { useFlowEditorCollaboration } from '@/hooks/useFlowEditorCollaboration';
import { useShortcutHelpActions, useViewSettings } from '@/store/viewHooks';
import { useSelectionActions, useSelectionState } from '@/store/selectionHooks';
import { ArchitectureLintProvider } from '@/context/ArchitectureLintContext';
import { DiagramDiffProvider } from '@/context/DiagramDiffContext';
import { ShareEmbedModal } from '@/components/ShareEmbedModal';

interface FlowEditorProps {
    onGoHome: () => void;
}

export function FlowEditor({ onGoHome }: FlowEditorProps) {
    const { t } = useTranslation();
    const { addToast } = useToast();
    const location = useLocation();
    const navigate = useNavigate();
    const collaborationEnabled = true;

    // --- Global Store ---
    const {
        nodes,
        edges,
        setNodes,
        setEdges,
        tabs,
        activeTabId,
        addTab,
        closeTab,
        updateTab,
        toggleGrid,
        toggleSnap,
    } = useFlowStore(useShallow((state) => ({
        nodes: state.nodes,
        edges: state.edges,
        setNodes: state.setNodes,
        setEdges: state.setEdges,
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        addTab: state.addTab,
        closeTab: state.closeTab,
        updateTab: state.updateTab,
        toggleGrid: state.toggleGrid,
        toggleSnap: state.toggleSnap,
    })));
    const viewSettings = useViewSettings();
    const { setShortcutsHelpOpen } = useShortcutHelpActions();
    const [diffBaseline, setDiffBaseline] = useState<import('@/lib/types').FlowSnapshot | null>(null);
    const { selectedNodeId, selectedEdgeId } = useSelectionState();
    const { setSelectedNodeId, setSelectedEdgeId } = useSelectionActions();
    const { showGrid, snapToGrid } = viewSettings;

    const {
        snapshots,
        manualSnapshots,
        autoSnapshots,
        saveSnapshot,
        deleteSnapshot,
        queueAutoSnapshot,
        restoreSnapshot,
    } = useSnapshots();
    const {
        isHistoryOpen,
        isCommandBarOpen,
        commandBarView,
        editorMode,
        studioTab,
        studioCodeMode,
        isSelectMode,
        openHistory,
        closeHistory,
        openCommandBar,
        closeCommandBar,
        setCanvasMode,
        setStudioMode,
        setStudioTab,
        setStudioCodeMode,
        enableSelectMode,
        enablePanMode,
    } = useFlowEditorUIState();

    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const { fitView, screenToFlowPosition, zoomIn, zoomOut } = useReactFlow();

    // --- History ---
    const { recordHistory, undo, redo, canUndo, canRedo } = useFlowHistory();

    // --- Core Operations ---
    const {
        updateNodeData, applyBulkNodeData, updateNodeType, updateNodeZIndex, updateEdge,
        deleteNode, deleteEdge, duplicateNode,
        handleAddNode, handleAddShape, handleAddJourneyNode, handleAddMindmapNode, handleAddArchitectureNode, handleAddClassNode, handleAddEntityNode, handleAddAnnotation, handleAddSection, handleAddTextNode, handleAddImage, handleAddWireframe, handleAddDomainLibraryItem, handleAddMindmapChild, handleAddMindmapSibling, handleAddArchitectureService, handleCreateArchitectureBoundary,
        copySelection, pasteSelection,
    } = useFlowOperations(recordHistory);

    const selectedNodeType = useMemo(
        () => nodes.find((node) => node.id === selectedNodeId)?.type ?? null,
        [nodes, selectedNodeId]
    );

    const {
        getCenter,
        handleSwitchTab,
        handleAddTab,
        handleCloseTab,
        handleRenameTab,
        selectAll,
        handleRestoreSnapshot,
        handleCommandBarApply,
    } = useFlowEditorCallbacks({
        addTab,
        closeTab,
        updateTab,
        navigate,
        tabsLength: tabs.length,
        cannotCloseLastTabMessage: t('flowEditor.cannotCloseLastTab'),
        setNodes,
        setEdges,
        restoreSnapshot,
        recordHistory,
        fitView,
        screenToFlowPosition,
    });

    useFlowEditorInteractionBindings({
        selectedNodeId,
        selectedEdgeId,
        selectedNodeType,
        deleteNode,
        deleteEdge,
        undo,
        redo,
        duplicateNode,
        selectAll,
        handleAddMindmapChild,
        handleAddMindmapSibling,
        openCommandBar,
        setShortcutsHelpOpen,
        enableSelectMode,
        enablePanMode,
        fitView,
        zoomIn,
        zoomOut,
        copySelection,
        pasteSelection,
        setSelectedNodeId,
        setSelectedEdgeId,
        setNodes,
        setEdges,
    });

    // --- AI ---
    const [pendingAIPrompt, setPendingAIPrompt] = useState<string | undefined>();
    const clearPendingAIPrompt = useCallback(() => setPendingAIPrompt(undefined), []);
    const { isGenerating, handleAIRequest, handleCodeAnalysis, handleSqlAnalysis, handleTerraformAnalysis, handleOpenApiAnalysis, chatMessages, clearChat } = useAIGeneration(
        recordHistory,
        handleCommandBarApply
    );

    const handleApplyInfraDsl = useInfraDslApply({
        addToast,
        handleCommandBarApply,
    });

    // --- Playback ---
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

    // --- Export ---
    const { fileInputRef, handleExport, handleSvgExport, handleAnimatedExport, handleExportJSON, handleImportJSON, onFileImport } = useFlowExport(
        recordHistory,
        reactFlowWrapper,
        {
            jumpToStep,
            stopPlayback,
            playbackSpeed,
        }
    );

    useEffect(() => {
        queueAutoSnapshot(nodes, edges);
    }, [edges, nodes, queueAutoSnapshot]);

    const {
        collaborationTopNavState,
        remotePresence,
    } = useFlowEditorCollaboration({
        collaborationEnabled,
        activeTabId,
        nodes,
        edges,
        editorSurfaceRef: reactFlowWrapper,
        setNodes,
        setEdges,
        addToast,
    });

    const collaborationNodePositions = useCollaborationNodePositions(
        collaborationEnabled,
        nodes,
        remotePresence.length
    );

    const {
        isLayouting,
        onLayout,
        handleInsertTemplate,
        handleExportMermaid,
        handleExportPlantUML,
        handleExportOpenFlowDSL,
        handleExportFigma,
        handleShare,
        shareViewerUrl,
        clearShareViewerUrl,
    } = useFlowEditorActions({
        nodes,
        edges,
        recordHistory,
        setNodes,
        setEdges,
        fitView,
        t,
        addToast,
        exportSerializationMode: viewSettings.exportSerializationMode,
    });
    const flowEditorController = useFlowEditorController({
        location,
        navigate,
        fileInputRef,
        tabs,
        activeTabId,
        snapshots,
        nodes,
        edges,
        selectedNodeId,
        selectedEdgeId,
        isCommandBarOpen,
        isHistoryOpen,
        editorMode,
        handleExportJSON,
        onLayout,
        studioTab,
        setStudioTab,
        setStudioCodeMode,
        setStudioMode,
        closeCommandBar,
        setCanvasMode,
        setSelectedNodeId,
        setSelectedEdgeId,
        closeHistory,
        commandBarView,
        manualSnapshots,
        autoSnapshots,
        saveSnapshot,
        handleRestoreSnapshot,
        deleteSnapshot,
        setDiffBaseline,
        undo,
        redo,
        handleInsertTemplate,
        showGrid,
        toggleGrid,
        snapToGrid,
        toggleSnap,
        updateNodeData,
        applyBulkNodeData,
        updateNodeType,
        updateEdge,
        deleteNode,
        duplicateNode,
        deleteEdge,
        updateNodeZIndex,
        handleAddMindmapChild,
        handleAddMindmapSibling,
        handleAddArchitectureService,
        handleCreateArchitectureBoundary,
        handleCommandBarApply,
        handleAIRequest,
        handleCodeAnalysis,
        handleSqlAnalysis,
        handleTerraformAnalysis,
        handleOpenApiAnalysis,
        handleApplyInfraDsl,
        isGenerating,
        chatMessages,
        clearChat,
        studioCodeMode,
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
        pendingAIPrompt,
        clearPendingAIPrompt,
        handleSwitchTab,
        handleAddTab,
        handleCloseTab,
        handleRenameTab,
        handleExport,
        handleSvgExport,
        handleAnimatedExport,
        handleExportMermaid,
        handleExportPlantUML,
        handleExportOpenFlowDSL,
        handleExportFigma,
        handleShare,
        handleImportJSON,
        openHistory,
        onGoHome,
        collaborationTopNavState,
        openCommandBar,
        handleAddShape,
        canUndo,
        canRedo,
        isSelectMode,
        enableSelectMode,
        enablePanMode,
        getCenter,
        t,
        handleAddNode,
        setPendingAIPrompt,
        handleAddAnnotation,
        handleAddSection,
        handleAddTextNode,
        handleAddJourneyNode,
        handleAddMindmapNode,
        handleAddArchitectureNode,
        handleAddClassNode,
        handleAddEntityNode,
        handleAddImage,
        handleAddWireframe,
        handleAddDomainLibraryItem,
    });

    return (
        <DiagramDiffProvider nodes={nodes} edges={edges} baselineSnapshot={diffBaseline} onStopCompare={() => setDiffBaseline(null)}>
        <ArchitectureLintProvider nodes={nodes} edges={edges} rulesJson={viewSettings.lintRules}>
        <div className="w-full h-screen bg-[var(--brand-background)] flex flex-col relative" ref={reactFlowWrapper}>
            <FlowEditorChrome
                tabs={tabs}
                activeTabId={activeTabId}
                topNav={flowEditorController.chrome.topNav}
                canvas={(
                    <FlowCanvas
                        recordHistory={recordHistory}
                        isSelectMode={isSelectMode}
                        onCanvasEntityIntent={flowEditorController.handleCanvasEntityIntent}
                    />
                )}
                shouldRenderPanels={flowEditorController.shouldRenderPanels}
                panels={flowEditorController.panels}
                collaborationEnabled={collaborationEnabled}
                remotePresence={remotePresence}
                collaborationNodePositions={collaborationNodePositions}
                layoutMessage={t('flowEditor.applyingLayout')}
                isLayouting={isLayouting}
                playback={flowEditorController.chrome.playback}
                toolbar={flowEditorController.chrome.toolbar}
                emptyState={flowEditorController.chrome.emptyState}
            />

            {/* Hidden file input for JSON import */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={onFileImport}
                className="hidden"
                id="json-import-input"
            />
            {shareViewerUrl && (
                <ShareEmbedModal viewerUrl={shareViewerUrl} onClose={clearShareViewerUrl} />
            )}
        </div>
        </ArchitectureLintProvider>
        </DiagramDiffProvider>
    );
}
