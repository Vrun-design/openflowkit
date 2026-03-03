import React, { useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useReactFlow } from 'reactflow';
import { useFlowStore } from '../store';
import { Toolbar } from './Toolbar';
import { FlowCanvas } from './FlowCanvas';
import { TopNav } from './TopNav';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { ErrorBoundary } from './ErrorBoundary';
import { useSnapshots } from '../hooks/useSnapshots';
import { useFlowHistory } from '../hooks/useFlowHistory';
import { useFlowOperations } from '../hooks/useFlowOperations';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useAIGeneration } from '../hooks/useAIGeneration';
import { useFlowExport } from '../hooks/useFlowExport';
import { useToast } from './ui/ToastContext';
import { usePlayback } from '../hooks/usePlayback';
import { PlaybackControls } from './PlaybackControls';
import { useFlowEditorUIState } from '@/hooks/useFlowEditorUIState';
import { useFlowEditorActions } from '@/hooks/useFlowEditorActions';
import { useFlowEditorCallbacks } from '@/hooks/useFlowEditorCallbacks';
import { FlowEditorPanels } from './FlowEditorPanels';
import { FlowEditorLayoutOverlay } from './FlowEditorLayoutOverlay';
import { FlowEditorEmptyState } from './FlowEditorEmptyState';

interface FlowEditorProps {
    onGoHome: () => void;
}

export function FlowEditor({ onGoHome }: FlowEditorProps) {
    const { t } = useTranslation();
    const { addToast } = useToast();
    const navigate = useNavigate();

    // --- Global Store ---
    const {
        nodes, edges, setNodes, setEdges,
        tabs, activeTabId, addTab, closeTab, updateTab,
        viewSettings, toggleGrid, toggleSnap, toggleMiniMap,
        selectedNodeId, setSelectedNodeId, selectedEdgeId, setSelectedEdgeId,
        setShortcutsHelpOpen
    } = useFlowStore();

    const { showGrid, snapToGrid, showMiniMap } = viewSettings;

    const { snapshots, saveSnapshot, deleteSnapshot, restoreSnapshot } = useSnapshots();
    const {
        isHistoryOpen,
        isCommandBarOpen,
        commandBarView,
        isSelectMode,
        isDesignSystemPanelOpen,
        openHistory,
        closeHistory,
        openCommandBar,
        closeCommandBar,
        openDesignSystemPanel,
        enableSelectMode,
        enablePanMode,
    } = useFlowEditorUIState();

    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const { fitView, screenToFlowPosition } = useReactFlow();

    // --- History ---
    const { recordHistory, undo, redo, canUndo, canRedo } = useFlowHistory();

    // --- Core Operations ---
    const {
        updateNodeData, updateNodeType, updateNodeZIndex, updateEdge,
        deleteNode, deleteEdge, duplicateNode,
        handleAddNode, handleAddAnnotation, handleAddSection, handleAddTextNode, handleAddImage,
        handleClear
    } = useFlowOperations(recordHistory);

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

    // --- Keyboard Shortcuts ---
    useKeyboardShortcuts({
        selectedNodeId, selectedEdgeId,
        deleteNode, deleteEdge, undo, redo, duplicateNode, selectAll,
        onCommandBar: () => openCommandBar('root'),
        onSearch: () => openCommandBar('search'),
        onShortcutsHelp: () => setShortcutsHelpOpen(true)
    });

    // --- AI ---
    const { isGenerating, handleAIRequest, chatMessages, clearChat } = useAIGeneration(
        recordHistory
    );

    // --- Export ---
    const { fileInputRef, handleExport, handleExportJSON, handleImportJSON, onFileImport } = useFlowExport(
        recordHistory, reactFlowWrapper
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
    });

    // --- Derived State ---
    const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);
    const selectedEdge = useMemo(() => edges.find((e) => e.id === selectedEdgeId) || null, [edges, selectedEdgeId]);

    return (
        <div className="w-full h-screen bg-[var(--brand-background)] flex flex-col relative" ref={reactFlowWrapper}>
            {/* Header */}
            <TopNav
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
            />

            <ErrorBoundary className="h-full">
                <FlowCanvas
                    recordHistory={recordHistory}
                    isSelectMode={isSelectMode}
                />
            </ErrorBoundary>

            {/* Layout loading overlay */}
            {isLayouting && <FlowEditorLayoutOverlay message={t('flowEditor.applyingLayout')} />}

            {/* Toolbar (Hidden during playback) */}
            {currentStepIndex === -1 && (
                <Toolbar
                    onCommandBar={() => openCommandBar('root')}
                    onDesignSystemPanel={() => {
                        openDesignSystemPanel();
                    }}
                    isDesignSystemPanelOpen={isDesignSystemPanelOpen}
                    onClear={handleClear}

                    onAddNode={handleAddNode}
                    onAddAnnotation={handleAddAnnotation}
                    onAddSection={handleAddSection}
                    onAddText={handleAddTextNode}
                    onAddImage={handleAddImage}
                    onAddWireframes={() => openCommandBar('wireframes')}
                    onUndo={undo}
                    onRedo={redo}
                    onLayout={() => openCommandBar('layout')}
                    onTemplates={() => openCommandBar('templates')}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    isSelectMode={isSelectMode}
                    onToggleSelectMode={enableSelectMode}
                    isCommandBarOpen={isCommandBarOpen}
                    onTogglePanMode={enablePanMode}
                    getCenter={getCenter}
                />
            )}

            {/* Playback Controls Overlay - Force Rebuild */}
            {currentStepIndex >= 0 && (
                <PlaybackControls
                    isPlaying={isPlaying}
                    currentStepIndex={currentStepIndex}
                    totalSteps={totalSteps}
                    onPlayPause={togglePlay}
                    onNext={nextStep}
                    onPrev={prevStep}
                    onStop={stopPlayback}
                />
            )}

            <FlowEditorPanels
                isCommandBarOpen={isCommandBarOpen}
                onCloseCommandBar={closeCommandBar}
                nodes={nodes}
                edges={edges}
                onCommandBarApply={handleCommandBarApply}
                onAIGenerate={handleAIRequest}
                isGenerating={isGenerating}
                chatMessages={chatMessages}
                onClearChat={clearChat}
                onUndo={undo}
                onRedo={redo}
                onFitView={() => fitView({ duration: 800 })}
                onLayout={onLayout}
                onSelectTemplate={handleInsertTemplate}
                commandBarView={commandBarView}
                showGrid={showGrid}
                onToggleGrid={toggleGrid}
                snapToGrid={snapToGrid}
                onToggleSnap={toggleSnap}
                showMiniMap={showMiniMap}
                onToggleMiniMap={toggleMiniMap}
                isHistoryOpen={isHistoryOpen}
                onCloseHistory={closeHistory}
                snapshots={snapshots}
                onSaveSnapshot={(name) => saveSnapshot(name, nodes, edges)}
                onRestoreSnapshot={handleRestoreSnapshot}
                onDeleteSnapshot={deleteSnapshot}
                selectedNode={selectedNode}
                selectedEdge={selectedEdge}
                onChangeNode={updateNodeData}
                onChangeNodeType={updateNodeType}
                onChangeEdge={updateEdge}
                onDeleteNode={deleteNode}
                onDuplicateNode={duplicateNode}
                onDeleteEdge={deleteEdge}
                onUpdateZIndex={updateNodeZIndex}
                onCloseProperties={() => {
                    setSelectedNodeId(null);
                    setSelectedEdgeId(null);
                }}
            />

            {/* Empty State */}
            {nodes.length === 0 && (
                <FlowEditorEmptyState
                    title={t('flowEditor.emptyState.title')}
                    description={t('flowEditor.emptyState.description')}
                    generateLabel={t('flowEditor.emptyState.generateWithFlowpilot')}
                    templatesLabel={t('flowEditor.emptyState.browseTemplates')}
                    addNodeLabel={t('flowEditor.emptyState.addBlankNode')}
                    onGenerate={() => openCommandBar('ai')}
                    onTemplates={() => openCommandBar('templates')}
                    onAddNode={() => handleAddNode()}
                />
            )}

            {/* Hidden file input for JSON import */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={onFileImport}
                className="hidden"
                id="json-import-input"
            />

            <KeyboardShortcutsModal />
        </div>
    );
};
