import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { useReactFlow } from '@/lib/reactflowCompat';
import '@xyflow/react/dist/style.css';
import { ROLLOUT_FLAGS } from '@/config/rolloutFlags';
import { useFlowStore } from '../store';
import { FlowCanvas } from './FlowCanvas';
import { ErrorBoundary } from './ErrorBoundary';
import { useSnapshots } from '../hooks/useSnapshots';
import { useFlowHistory } from '../hooks/useFlowHistory';
import { useFlowOperations } from '../hooks/useFlowOperations';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useAIGeneration } from '../hooks/useAIGeneration';
import { useFlowExport } from '../hooks/useFlowExport';
import { useToast } from './ui/ToastContext';
import { usePlayback } from '../hooks/usePlayback';
import { useFlowEditorUIState } from '@/hooks/useFlowEditorUIState';
import { useFlowEditorActions } from '@/hooks/useFlowEditorActions';
import { useFlowEditorCallbacks } from '@/hooks/useFlowEditorCallbacks';
import { buildFlowEditorPanelsProps } from './flow-editor/panelProps';
import { useFlowEditorShellController } from './flow-editor/useFlowEditorShellController';
import { useFlowEditorStudioController } from './flow-editor/useFlowEditorStudioController';
import { useFlowEditorCollaboration } from '@/hooks/useFlowEditorCollaboration';
import { useMindmapTopicActionRequest } from '@/hooks/mindmapTopicActionRequest';
import { useShortcutHelpActions, useViewSettings } from '@/store/viewHooks';
import { useSelectionActions, useSelectionState } from '@/store/selectionHooks';

const LazyFlowEditorPanels = lazy(async () => {
    const module = await import('./FlowEditorPanels');
    return { default: module.FlowEditorPanels };
});

const LazyTopNav = lazy(async () => {
    const module = await import('./TopNav');
    return { default: module.TopNav };
});

const LazyToolbar = lazy(async () => {
    const module = await import('./Toolbar');
    return { default: module.Toolbar };
});

const LazyPlaybackControls = lazy(async () => {
    const module = await import('./PlaybackControls');
    return { default: module.PlaybackControls };
});

const LazyFlowEditorLayoutOverlay = lazy(async () => {
    const module = await import('./FlowEditorLayoutOverlay');
    return { default: module.FlowEditorLayoutOverlay };
});

const LazyFlowEditorEmptyState = lazy(async () => {
    const module = await import('./FlowEditorEmptyState');
    return { default: module.FlowEditorEmptyState };
});

const LazyCollaborationPresenceOverlay = lazy(async () => {
    const module = await import('./flow-editor/CollaborationPresenceOverlay');
    return { default: module.CollaborationPresenceOverlay };
});

interface FlowEditorProps {
    onGoHome: () => void;
}

function TopNavFallback(): React.ReactElement {
    return (
        <div className="absolute top-0 left-0 right-0 z-50 h-16 border-b border-white/20 bg-white/70 shadow-sm backdrop-blur-md" />
    );
}

export function FlowEditor({ onGoHome }: FlowEditorProps) {
    const { t } = useTranslation();
    const { addToast } = useToast();
    const location = useLocation();
    const navigate = useNavigate();
    const collaborationV1Enabled = ROLLOUT_FLAGS.collaborationV1;

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
        handleAddNode, handleAddShape, handleAddJourneyNode, handleAddMindmapNode, handleAddArchitectureNode, handleAddAnnotation, handleAddSection, handleAddTextNode, handleAddImage, handleAddWireframe, handleAddDomainLibraryItem, handleAddMindmapChild, handleAddMindmapSibling, handleAddArchitectureService, handleCreateArchitectureBoundary
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

    useKeyboardShortcuts({
        selectedNodeId, selectedEdgeId,
        deleteNode, deleteEdge, undo, redo, duplicateNode, selectAll,
        selectedNodeType,
        onAddMindmapChildShortcut: () => {
            if (selectedNodeId) {
                handleAddMindmapChild(selectedNodeId);
            }
        },
        onAddMindmapSiblingShortcut: () => {
            if (selectedNodeId) {
                handleAddMindmapSibling(selectedNodeId);
            }
        },
        onCommandBar: () => openCommandBar('root'),
        onSearch: () => openCommandBar('search'),
        onShortcutsHelp: () => setShortcutsHelpOpen(true),
        onSelectMode: enableSelectMode,
        onPanMode: enablePanMode,
        onFitView: () => fitView({ duration: 600, padding: 0.2 }),
        onZoomIn: () => zoomIn({ duration: 300 }),
        onZoomOut: () => zoomOut({ duration: 300 }),
    });

    // --- AI ---
    const { isGenerating, handleAIRequest, chatMessages, clearChat } = useAIGeneration(
        recordHistory,
        handleCommandBarApply
    );

    // --- Export ---
    const { fileInputRef, handleExport, handleExportJSON, handleImportJSON, onFileImport } = useFlowExport(
        recordHistory, reactFlowWrapper
    );

    useEffect(() => {
        queueAutoSnapshot(nodes, edges);
    }, [edges, nodes, queueAutoSnapshot]);

    const {
        collaborationTopNavState,
        remotePresence,
    } = useFlowEditorCollaboration({
        collaborationEnabled: collaborationV1Enabled,
        activeTabId,
        nodes,
        edges,
        editorSurfaceRef: reactFlowWrapper,
        setNodes,
        setEdges,
        addToast,
    });

    useMindmapTopicActionRequest(
        useCallback(({ nodeId, action, side }) => {
            if (action === 'child') {
                handleAddMindmapChild(nodeId, side ?? null);
                return;
            }
            if (action === 'sibling') {
                handleAddMindmapSibling(nodeId);
            }
        }, [handleAddMindmapChild, handleAddMindmapSibling])
    );

    // --- Playback ---
    const {
        isPlaying,
        currentStepIndex,
        totalSteps,
        startPlayback,
        stopPlayback,
        togglePlay,
        nextStep,
        prevStep
    } = usePlayback();

    const {
        isLayouting,
        onLayout,
        handleInsertTemplate,
        handleExportMermaid,
        handleExportPlantUML,
        handleExportOpenFlowDSL,
        handleExportFigma,
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
    const {
        handleLayoutWithContext,
        selectedNode,
        selectedNodes,
        selectedEdge,
        shouldRenderPanels,
    } = useFlowEditorShellController({
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
    });
    const {
        openStudioPanel,
        openStudioAI,
        openStudioCode,
        toggleStudioPanel,
        closeStudioPanel,
        handleCanvasEntityIntent,
    } = useFlowEditorStudioController({
        editorMode,
        selectedNodeId,
        selectedEdgeId,
        setStudioTab,
        setStudioCodeMode,
        setStudioMode,
        closeCommandBar,
        setCanvasMode,
        setSelectedNodeId,
        setSelectedEdgeId,
    });
    const clearSelection = useCallback(() => {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
    }, [setSelectedEdgeId, setSelectedNodeId]);
    const flowEditorPanelsProps = useMemo(() => buildFlowEditorPanelsProps({
        isCommandBarOpen,
        closeCommandBar,
        nodes,
        edges,
        undo,
        redo,
        onLayout,
        handleInsertTemplate,
        openStudioAI,
        openStudioCode,
        commandBarView,
        handleAddAnnotation,
        handleAddSection,
        handleAddTextNode,
        handleAddJourneyNode,
        handleAddMindmapNode,
        handleAddArchitectureNode,
        handleAddImage,
        handleAddWireframe,
        handleAddDomainLibraryItem,
        showGrid,
        toggleGrid,
        snapToGrid,
        toggleSnap,
        isHistoryOpen,
        closeHistory,
        snapshots,
        manualSnapshots,
        autoSnapshots,
        saveSnapshot,
        handleRestoreSnapshot,
        deleteSnapshot,
        selectedNode,
        selectedNodes,
        selectedEdge,
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
        clearSelection,
        closeStudioPanel,
        handleCommandBarApply,
        handleAIRequest,
        isGenerating,
        chatMessages,
        clearChat,
        studioTab,
        setStudioTab,
        studioCodeMode,
        setStudioCodeMode,
        editorMode,
    }), [
        isCommandBarOpen,
        closeCommandBar,
        nodes,
        edges,
        undo,
        redo,
        onLayout,
        handleInsertTemplate,
        openStudioAI,
        openStudioCode,
        commandBarView,
        handleAddAnnotation,
        handleAddSection,
        handleAddTextNode,
        handleAddJourneyNode,
        handleAddMindmapNode,
        handleAddArchitectureNode,
        handleAddImage,
        handleAddWireframe,
        handleAddDomainLibraryItem,
        showGrid,
        toggleGrid,
        snapToGrid,
        toggleSnap,
        isHistoryOpen,
        closeHistory,
        snapshots,
        manualSnapshots,
        autoSnapshots,
        saveSnapshot,
        handleRestoreSnapshot,
        deleteSnapshot,
        selectedNode,
        selectedNodes,
        selectedEdge,
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
        clearSelection,
        closeStudioPanel,
        handleCommandBarApply,
        handleAIRequest,
        isGenerating,
        chatMessages,
        clearChat,
        studioTab,
        setStudioTab,
        studioCodeMode,
        setStudioCodeMode,
        editorMode,
    ]);

    return (
        <div className="w-full h-screen bg-[var(--brand-background)] flex flex-col relative" ref={reactFlowWrapper}>
            {/* Header */}
            <Suspense fallback={<TopNavFallback />}>
                <LazyTopNav
                    tabs={tabs}
                    activeTabId={activeTabId}
                    onSwitchTab={handleSwitchTab}
                    onAddTab={handleAddTab}
                    onCloseTab={handleCloseTab}
                    onRenameTab={handleRenameTab}
                    onExportPNG={handleExport}
                    onExportJSON={handleExportJSON}
                    onExportMermaid={handleExportMermaid}
                    onExportPlantUML={handleExportPlantUML}
                    onExportOpenFlowDSL={handleExportOpenFlowDSL}
                    onExportFigma={handleExportFigma}
                    onImportJSON={handleImportJSON}
                    onHistory={openHistory}
                    onGoHome={onGoHome}
                    onPlay={startPlayback}
                    collaboration={collaborationTopNavState}
                />
            </Suspense>

            <div className="flex min-h-0 flex-1 min-w-0 pt-16">
                <div className="relative min-w-0 flex-1">
                    <ErrorBoundary className="h-full">
                        <FlowCanvas
                            recordHistory={recordHistory}
                            isSelectMode={isSelectMode}
                            onCanvasEntityIntent={handleCanvasEntityIntent}
                        />
                    </ErrorBoundary>
                </div>
                {shouldRenderPanels ? (
                    <Suspense fallback={null}>
                        <LazyFlowEditorPanels {...flowEditorPanelsProps} />
                    </Suspense>
                ) : null}
            </div>
            {collaborationV1Enabled ? (
                <Suspense fallback={null}>
                    <LazyCollaborationPresenceOverlay remotePresence={remotePresence} />
                </Suspense>
            ) : null}

            {/* Layout loading overlay */}
            {isLayouting ? (
                <Suspense fallback={null}>
                    <LazyFlowEditorLayoutOverlay message={t('flowEditor.applyingLayout')} />
                </Suspense>
            ) : null}

            {/* Toolbar (Hidden during playback) */}
            {currentStepIndex === -1 && (
                <Suspense fallback={null}>
                    <LazyToolbar
                        onCommandBar={() => openCommandBar('root')}
                        onToggleStudio={toggleStudioPanel}
                        isStudioOpen={editorMode === 'studio'}
                        onOpenAssets={() => openCommandBar('assets')}
                        onAddShape={handleAddShape}
                        onUndo={undo}
                        onRedo={redo}
                        onLayout={handleLayoutWithContext}
                        canUndo={canUndo}
                        canRedo={canRedo}
                        isSelectMode={isSelectMode}
                        onToggleSelectMode={enableSelectMode}
                        isCommandBarOpen={isCommandBarOpen}
                        onTogglePanMode={enablePanMode}
                        getCenter={getCenter}
                    />
                </Suspense>
            )}

            {/* Playback Controls Overlay - Force Rebuild */}
            {currentStepIndex >= 0 && (
                <Suspense fallback={null}>
                    <LazyPlaybackControls
                        isPlaying={isPlaying}
                        currentStepIndex={currentStepIndex}
                        totalSteps={totalSteps}
                        onPlayPause={togglePlay}
                        onNext={nextStep}
                        onPrev={prevStep}
                        onStop={stopPlayback}
                    />
                </Suspense>
            )}

            {/* Empty State */}
            {nodes.length === 0 ? (
                <Suspense fallback={null}>
                    <LazyFlowEditorEmptyState
                        title={t('flowEditor.emptyState.title')}
                        description={t('flowEditor.emptyState.description')}
                        generateLabel={t('flowEditor.emptyState.generateWithFlowpilot')}
                        templatesLabel={t('flowEditor.emptyState.browseTemplates')}
                        addNodeLabel={t('flowEditor.emptyState.addBlankNode')}
                        onGenerate={() => openStudioPanel('ai')}
                        onTemplates={() => openCommandBar('templates')}
                        onAddNode={() => handleAddNode()}
                    />
                </Suspense>
            ) : null}

            {/* Hidden file input for JSON import */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={onFileImport}
                className="hidden"
                id="json-import-input"
            />
        </div>
    );
};
