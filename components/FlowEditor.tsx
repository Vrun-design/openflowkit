import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useReactFlow, getRectOfNodes } from 'reactflow';
import { useFlowStore } from '../store';
import { getElkLayout, LayoutAlgorithm } from '../services/elkLayout';
import { CommandBar } from './CommandBar';
import { Toolbar } from './Toolbar';
import { FlowCanvas } from './FlowCanvas';
import { PropertiesPanel } from './PropertiesPanel';
import { SnapshotsPanel } from './SnapshotsPanel';
import { TopNav } from './TopNav';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import ErrorBoundary from './ErrorBoundary';
import { FlowTemplate } from '../services/templates';
import { toMermaid, toPlantUML } from '../services/exportService';
import { toFigmaSVG } from '../services/figmaExportService';
import { toOpenFlowDSL } from '../services/openFlowDSLExporter';
import { useSnapshots } from '../hooks/useSnapshots';
import { useAutoSave } from '../hooks/useAutoSave';
import { useFlowHistory } from '../hooks/useFlowHistory';
import { useFlowOperations } from '../hooks/useFlowOperations';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useAIGeneration } from '../hooks/useAIGeneration';
import { useFlowExport } from '../hooks/useFlowExport';
import { useToast } from './ui/ToastContext';
import { usePlayback } from '../hooks/usePlayback';
import { PlaybackControls } from './PlaybackControls';

interface FlowEditorProps {
    onGoHome: () => void;
}

export function FlowEditor({ onGoHome }: FlowEditorProps) {
    const { addToast } = useToast();
    const navigate = useNavigate();

    // --- Global Store ---
    const {
        nodes, edges, setNodes, setEdges,
        tabs, setTabs, activeTabId, setActiveTabId, addTab, closeTab, updateTab,
        viewSettings, toggleGrid, toggleSnap, toggleMiniMap,
        selectedNodeId, setSelectedNodeId, selectedEdgeId, setSelectedEdgeId,
        setShortcutsHelpOpen
    } = useFlowStore();

    const { showGrid, snapToGrid, showMiniMap } = viewSettings;

    // Snapshots
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const { snapshots, saveSnapshot, deleteSnapshot, restoreSnapshot } = useSnapshots();

    // Command Bar State
    const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);

    const [commandBarView, setCommandBarView] = useState<'root' | 'ai' | 'mermaid' | 'flowmind' | 'templates' | 'search' | 'layout' | 'design-system'>('root');

    const openCommandBar = (view: 'root' | 'ai' | 'mermaid' | 'flowmind' | 'templates' | 'search' | 'layout' | 'design-system' = 'root') => {
        setCommandBarView(view);
        setIsCommandBarOpen(true);
    };

    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const { fitView, screenToFlowPosition } = useReactFlow();

    const getCenter = useCallback(() => {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        return screenToFlowPosition({ x: centerX, y: centerY });
    }, [screenToFlowPosition]);

    // --- History ---
    const { recordHistory, undo, redo, canUndo, canRedo, setPast, setFuture } = useFlowHistory();

    // --- Auto Save ---
    useAutoSave(
        tabs, activeTabId, nodes, edges,
        setTabs, setActiveTabId,
        setNodes, setEdges,
        setPast, setFuture
    );

    // --- Tab Management ---
    const handleSwitchTab = useCallback((newTabId: string) => {
        navigate(`/flow/${newTabId}`);
        // Fit view will happen after route update triggers store update
    }, [navigate]);

    const handleAddTab = useCallback(() => {
        const newId = addTab();
        navigate(`/flow/${newId}`);
    }, [addTab, navigate]);

    const handleCloseTab = useCallback((tabId: string) => {
        if (tabs.length === 1) {
            alert("Cannot close the last tab.");
            return;
        }
        closeTab(tabId);
    }, [tabs.length, closeTab]);

    const handleRenameTab = useCallback((tabId: string, newName: string) => {
        updateTab(tabId, { name: newName });
    }, [updateTab]);


    // --- Core Operations ---
    const {
        updateNodeData, updateNodeType, updateNodeZIndex, updateEdge,
        deleteNode, deleteEdge, duplicateNode,
        handleAddNode, handleAddAnnotation, handleAddSection, handleAddTextNode, handleAddImage,
        handleClear
    } = useFlowOperations(recordHistory);

    const selectAll = useCallback(() => {
        setNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
        setEdges((eds) => eds.map((e) => ({ ...e, selected: true })));
    }, [setNodes, setEdges]);

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

    // --- Auto Layout (ELK) ---
    const [isLayouting, setIsLayouting] = useState(false);
    const onLayout = useCallback(async (
        direction: 'TB' | 'LR' | 'RL' | 'BT' = 'TB',
        algorithm: LayoutAlgorithm = 'layered',
        spacing: 'compact' | 'normal' | 'loose' = 'normal'
    ) => {
        if (nodes.length === 0) return;
        setIsLayouting(true);
        recordHistory();

        try {
            const layoutedNodes = await getElkLayout(nodes, edges, {
                direction,
                algorithm,
                spacing,
            });
            setNodes(layoutedNodes);
            setTimeout(() => fitView({ duration: 800 }), 50);
        } catch (err) {
            console.error('ELK layout failed:', err);
        } finally {
            setIsLayouting(false);
        }
    }, [nodes, edges, recordHistory, setNodes, fitView]);

    const handleInsertTemplate = useCallback((template: FlowTemplate) => {
        recordHistory();
        const bounds = getRectOfNodes(nodes);
        // Position to the right of current content
        const startX = (bounds.width || 0) + (bounds.x || 0) + 100;
        const startY = (bounds.y || 0);

        const newNodes = template.nodes.map((n) => ({
            ...n,
            id: `${n.id}-${Date.now()}`,
            position: { x: n.position.x + startX, y: n.position.y + startY },
            selected: false,
        }));

        const idMap = new Map<string, string>();
        template.nodes.forEach((n, i) => idMap.set(n.id, newNodes[i].id));

        const newEdges = template.edges.map((e) => ({
            ...e,
            id: `${e.id}-${Date.now()}`,
            source: idMap.get(e.source)!,
            target: idMap.get(e.target)!,
        }));

        setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), ...newNodes]);
        setEdges((eds) => [...eds, ...newEdges]);
        setTimeout(() => fitView({ duration: 800 }), 100);
    }, [nodes, recordHistory, setNodes, setEdges, fitView]);

    const handleExportMermaid = useCallback(async () => {
        const text = toMermaid(nodes, edges);
        try {
            await navigator.clipboard.writeText(text);
            alert('Mermaid diagram copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy', err);
        }
    }, [nodes, edges]);

    const handleExportPlantUML = useCallback(async () => {
        const text = toPlantUML(nodes, edges);
        try {
            await navigator.clipboard.writeText(text);
            alert('PlantUML diagram copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy', err);
        }
    }, [nodes, edges]);

    const handleExportOpenFlowDSL = useCallback(async () => {
        const text = toOpenFlowDSL(nodes, edges);
        try {
            await navigator.clipboard.writeText(text);
            addToast('OpenFlow DSL copied to clipboard!', 'success');
        } catch (err) {
            console.error('Failed to copy', err);
            addToast('Failed to copy DSL', 'error');
        }
    }, [nodes, edges, addToast]);

    const handleExportFigma = useCallback(async () => {
        try {
            const svg = toFigmaSVG(nodes, edges);
            await navigator.clipboard.writeText(svg);
            addToast('Diagram copied for Figma! You can now paste (Cmd+V) in Figma.', 'success');
        } catch (err: any) {
            console.error('Failed to copy Figma SVG:', err);
            addToast(`Figma Export Failed: ${err?.message || err}`, 'error');
        }
    }, [nodes, edges, addToast]);

    const handleRestoreSnapshot = useCallback((snapshot: any) => {
        restoreSnapshot(snapshot, setNodes, setEdges);
        recordHistory(); // Record the restoration as a new history step
    }, [restoreSnapshot, setNodes, setEdges, recordHistory]);

    // --- Derived State ---
    const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);
    const selectedEdge = useMemo(() => edges.find((e) => e.id === selectedEdgeId) || null, [edges, selectedEdgeId]);

    // Selection Mode
    const [isSelectMode, setIsSelectMode] = useState(false);

    return (
        <div className="w-full h-screen bg-[var(--brand-background)] flex flex-col relative" ref={reactFlowWrapper}>
            {/* Header */}
            <TopNav
                showMiniMap={showMiniMap}
                toggleMiniMap={toggleMiniMap}
                showGrid={showGrid}
                toggleGrid={toggleGrid}
                snapToGrid={snapToGrid}
                toggleSnapToGrid={toggleSnap}
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
                onHistory={() => setIsHistoryOpen(true)}
                onGoHome={onGoHome}
                onPlay={startPlayback}
            />

            <ErrorBoundary fallbackMessage="The canvas encountered an error. Click 'Try Again' to recover.">
                <FlowCanvas
                    undo={undo}
                    redo={redo}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    recordHistory={recordHistory}
                    isSelectMode={isSelectMode}
                />
            </ErrorBoundary>

            {/* Layout loading overlay */}
            {isLayouting && (
                <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/60 backdrop-blur-sm pointer-events-none" aria-live="polite">
                    <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-2xl shadow-xl border border-slate-200">
                        <svg className="w-5 h-5 animate-spin text-[var(--brand-primary)]" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="text-sm font-medium text-slate-600">Applying layout…</span>
                    </div>
                </div>
            )}

            {/* Toolbar (Hidden during playback) */}
            {currentStepIndex === -1 && (
                <Toolbar
                    onCommandBar={() => openCommandBar('root')}
                    onDesignSystemPanel={() => {
                        setCommandBarView('design-system');
                        setIsCommandBarOpen(true);
                    }}
                    isDesignSystemPanelOpen={isCommandBarOpen && commandBarView === 'design-system'}
                    onClear={handleClear}

                    onAddNode={handleAddNode}
                    onAddAnnotation={handleAddAnnotation}
                    onAddSection={handleAddSection}
                    onAddText={handleAddTextNode}
                    onAddImage={handleAddImage}
                    onUndo={undo}
                    onRedo={redo}
                    onLayout={() => openCommandBar('layout')}
                    onTemplates={() => openCommandBar('templates')}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    isSelectMode={isSelectMode}
                    onToggleSelectMode={() => setIsSelectMode(true)}
                    isCommandBarOpen={isCommandBarOpen}
                    onTogglePanMode={() => setIsSelectMode(false)}
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

            <ErrorBoundary fallbackMessage="The command bar encountered an error.">
                <CommandBar
                    isOpen={isCommandBarOpen}
                    onClose={() => setIsCommandBarOpen(false)}
                    nodes={nodes}
                    edges={edges}
                    onApply={(newNodes, newEdges) => {
                        recordHistory();
                        setNodes(newNodes);
                        setEdges(newEdges);
                        setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 100);
                    }}
                    onAIGenerate={handleAIRequest}
                    isGenerating={isGenerating}
                    chatMessages={chatMessages}
                    onClearChat={clearChat}
                    onUndo={undo}
                    onRedo={redo}
                    onFitView={() => fitView({ duration: 800 })}
                    onLayout={onLayout}
                    onSelectTemplate={handleInsertTemplate}
                    initialView={commandBarView}
                    settings={{
                        showGrid,
                        onToggleGrid: toggleGrid,
                        snapToGrid,
                        onToggleSnap: toggleSnap,
                        showMiniMap,
                        onToggleMiniMap: toggleMiniMap,
                    }}
                />
            </ErrorBoundary>

            <SnapshotsPanel
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                snapshots={snapshots}
                onSaveSnapshot={(name) => saveSnapshot(name, nodes, edges)}
                onRestoreSnapshot={handleRestoreSnapshot}
                onDeleteSnapshot={deleteSnapshot}
            />

            <ErrorBoundary fallbackMessage="The properties panel encountered an error.">
                <PropertiesPanel
                    selectedNode={selectedNode}
                    selectedEdge={selectedEdge}
                    onChangeNode={updateNodeData}
                    onChangeNodeType={updateNodeType}
                    onChangeEdge={updateEdge}
                    onDeleteNode={deleteNode}
                    onDuplicateNode={duplicateNode}
                    onDeleteEdge={deleteEdge}
                    onUpdateZIndex={updateNodeZIndex}
                    onClose={() => {
                        setSelectedNodeId(null);
                        setSelectedEdgeId(null);
                    }}
                />
            </ErrorBoundary>

            {/* Empty State */}
            {nodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
                    <div className="text-center space-y-6 pointer-events-auto bg-[var(--brand-surface)]/80 backdrop-blur-md p-8 rounded-[var(--radius-xl)] ring-1 ring-black/5 shadow-2xl">
                        <div className="w-20 h-20 bg-[var(--brand-primary-50)] rounded-[var(--radius-lg)] mx-auto flex items-center justify-center mb-4 ring-1 ring-black/5">
                            <div className="w-12 h-12 bg-[var(--brand-primary-100)] rounded-[var(--radius-md)] flex items-center justify-center">
                                <svg className="w-6 h-6 text-[var(--brand-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 4.5v15m7.5-7.5h-15" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-[var(--brand-text)]">Start Building</h3>
                            <p className="text-[var(--brand-text-secondary)] text-sm max-w-xs mx-auto">
                                Your canvas is empty. Generate a flow with AI, use a template, or start from scratch.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
                            <button
                                onClick={() => openCommandBar('ai')}
                                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-[var(--brand-primary)] hover:brightness-110 text-white rounded-[var(--radius-md)] font-medium transition-all shadow-md hover:shadow-lg active:scale-95 ring-1 ring-black/10 inset-ring"
                            >
                                <Sparkles className="w-4 h-4" />
                                Generate with AI
                            </button>

                            <button
                                onClick={() => openCommandBar('templates')}
                                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-[var(--brand-surface)] hover:bg-[var(--brand-surface-hover)] text-[var(--brand-text)] ring-1 ring-black/5 rounded-[var(--radius-md)] font-medium transition-all shadow-sm hover:shadow active:scale-95"
                            >
                                <span className="w-4 h-4"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg></span>
                                Browse Templates
                            </button>

                            <button
                                onClick={() => handleAddNode()}
                                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-[var(--brand-surface)] hover:bg-[var(--brand-surface-hover)] text-[var(--brand-text)] ring-1 ring-black/5 rounded-[var(--radius-md)] font-medium transition-all shadow-sm hover:shadow active:scale-95"
                            >
                                <span className="w-4 h-4"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg></span>
                                Add Blank Node
                            </button>
                        </div>
                    </div>
                </div>
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
