import { useCallback } from 'react';
import type { FlowEdge, FlowNode, FlowSnapshot } from '@/lib/types';
import type { FlowEditorMode, StudioCodeMode, StudioTab } from '@/hooks/useFlowEditorUIState';
import type { DomainLibraryItem } from '@/services/domainLibrary';
import type { SupportedLanguage } from '@/hooks/ai-generation/codeToArchitecture';
import type { TerraformInputFormat } from '@/hooks/ai-generation/terraformToCloud';
import type { ChatMessage } from '@/services/aiService';
import type { FlowTemplate } from '@/services/templates';
import type { LayoutAlgorithm } from '@/services/elkLayout';
import type { Location, NavigateFunction } from 'react-router-dom';
import type { TFunction } from 'i18next';
import type { FlowEditorChromeProps } from './FlowEditorChrome';
import type { FlowEditorPanelsProps } from '@/components/FlowEditorPanels';
import { useFlowEditorShellController } from './useFlowEditorShellController';
import { useFlowEditorStudioController } from './useFlowEditorStudioController';
import { useFlowEditorPanelProps } from './useFlowEditorPanelProps';
import { useFlowEditorChromeProps } from './flowEditorChromeProps';

interface UseFlowEditorControllerParams {
    location: Location;
    navigate: NavigateFunction;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    tabs: Array<{ id: string; name: string }>;
    activeTabId: string | null;
    snapshots: FlowSnapshot[];
    nodes: FlowNode[];
    edges: FlowEdge[];
    selectedNodeId: string | null;
    selectedEdgeId: string | null;
    isCommandBarOpen: boolean;
    isHistoryOpen: boolean;
    editorMode: FlowEditorMode;
    handleExportJSON: () => void;
    onLayout: (
        direction?: 'TB' | 'LR' | 'RL' | 'BT',
        algorithm?: LayoutAlgorithm,
        spacing?: 'compact' | 'normal' | 'loose'
    ) => Promise<void>;
    studioTab: StudioTab;
    setStudioTab: (tab: StudioTab) => void;
    setStudioCodeMode: (mode: StudioCodeMode) => void;
    setStudioMode: () => void;
    closeCommandBar: () => void;
    setCanvasMode: () => void;
    setSelectedNodeId: (id: string | null) => void;
    setSelectedEdgeId: (id: string | null) => void;
    closeHistory: () => void;
    commandBarView: 'root' | 'search' | 'assets' | 'templates' | 'layout' | 'design-system';
    manualSnapshots: FlowSnapshot[];
    autoSnapshots: FlowSnapshot[];
    saveSnapshot: (name: string, nodes: FlowNode[], edges: FlowEdge[]) => void;
    handleRestoreSnapshot: (snapshot: FlowSnapshot) => void;
    deleteSnapshot: (id: string) => void;
    setDiffBaseline: (snapshot: FlowSnapshot) => void;
    undo: () => void;
    redo: () => void;
    handleInsertTemplate: (template: FlowTemplate) => void;
    showGrid: boolean;
    toggleGrid: () => void;
    snapToGrid: boolean;
    toggleSnap: () => void;
    updateNodeData: (id: string, data: Record<string, unknown>) => void;
    applyBulkNodeData: FlowEditorPanelsProps['properties']['onBulkChangeNodes'];
    updateNodeType: (id: string, type: string) => void;
    updateEdge: (id: string, data: Record<string, unknown>) => void;
    deleteNode: (id: string) => void;
    duplicateNode: (id: string) => void;
    deleteEdge: (id: string) => void;
    updateNodeZIndex: (id: string, action: 'front' | 'back') => void;
    handleAddMindmapChild: (nodeId: string, side?: 'left' | 'right' | null) => void;
    handleAddMindmapSibling: (nodeId: string) => void;
    handleAddArchitectureService: (parentId: string) => void;
    handleCreateArchitectureBoundary: FlowEditorPanelsProps['properties']['onCreateArchitectureBoundary'];
    handleCommandBarApply: (nodes: FlowNode[], edges: FlowEdge[]) => void;
    handleAIRequest: (prompt: string, imageBase64?: string) => Promise<void>;
    handleCodeAnalysis: (code: string, language: SupportedLanguage) => Promise<void>;
    handleSqlAnalysis: (sql: string) => Promise<void>;
    handleTerraformAnalysis: (input: string, format: TerraformInputFormat) => Promise<void>;
    handleOpenApiAnalysis: (spec: string) => Promise<void>;
    handleApplyInfraDsl: (dsl: string) => void;
    isGenerating: boolean;
    chatMessages: ChatMessage[];
    clearChat: () => void;
    studioCodeMode: StudioCodeMode;
    currentStepIndex: number;
    totalSteps: number;
    isPlaying: boolean;
    startPlayback: () => void;
    togglePlay: () => void;
    stopPlayback: () => void;
    jumpToStep: (stepIndex: number) => void;
    nextStep: () => void;
    prevStep: () => void;
    playbackSpeed: number;
    setPlaybackSpeed: (speed: number) => void;
    pendingAIPrompt?: string;
    clearPendingAIPrompt: () => void;
    handleSwitchTab: (tabId: string) => void;
    handleAddTab: () => void;
    handleCloseTab: (tabId: string) => void;
    handleRenameTab: (tabId: string, newName: string) => void;
    handleExport: (format?: 'png' | 'jpeg') => void;
    handleSvgExport: () => void;
    handleAnimatedExport: (format: 'video' | 'gif') => void;
    handleExportMermaid: () => void;
    handleExportPlantUML: () => void;
    handleExportOpenFlowDSL: () => void;
    handleExportFigma: () => void;
    handleShare: () => void;
    handleImportJSON: () => void;
    openHistory: () => void;
    onGoHome: () => void;
    collaborationTopNavState?: FlowEditorChromeProps['topNav']['collaboration'];
    openCommandBar: (view: 'root' | 'search' | 'assets' | 'templates' | 'layout' | 'design-system') => void;
    handleAddShape: (shapeType: string, position?: { x: number; y: number }) => void;
    canUndo: boolean;
    canRedo: boolean;
    isSelectMode: boolean;
    enableSelectMode: () => void;
    enablePanMode: () => void;
    getCenter: () => { x: number; y: number };
    t: TFunction;
    handleAddNode: (position?: { x: number; y: number }) => void;
    setPendingAIPrompt: (prompt: string | undefined) => void;
    handleAddAnnotation: () => void;
    handleAddSection: () => void;
    handleAddTextNode: () => void;
    handleAddJourneyNode: () => void;
    handleAddMindmapNode: () => void;
    handleAddArchitectureNode: () => void;
    handleAddClassNode: () => void;
    handleAddEntityNode: () => void;
    handleAddImage: (imageUrl: string) => void;
    handleAddWireframe: (surface: 'browser' | 'mobile') => void;
    handleAddDomainLibraryItem: (item: DomainLibraryItem) => void;
}

export function useFlowEditorController({
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
}: UseFlowEditorControllerParams) {
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
        openStudioPlayback,
        toggleStudioPanel,
        closeStudioPanel,
        handleCanvasEntityIntent,
    } = useFlowEditorStudioController({
        editorMode,
        studioTab,
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

    const panels = useFlowEditorPanelProps({
        isCommandBarOpen,
        closeCommandBar,
        commandBarView,
        isHistoryOpen,
        closeHistory,
        editorMode,
        nodes,
        edges,
        snapshots,
        manualSnapshots,
        autoSnapshots,
        saveSnapshot,
        handleRestoreSnapshot,
        deleteSnapshot,
        setDiffBaseline,
        undo,
        redo,
        onLayout,
        handleInsertTemplate,
        openStudioAI,
        openStudioCode,
        openStudioPlayback,
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
        showGrid,
        toggleGrid,
        snapToGrid,
        toggleSnap,
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
        handleCodeAnalysis,
        handleSqlAnalysis,
        handleTerraformAnalysis,
        handleOpenApiAnalysis,
        handleApplyInfraDsl,
        isGenerating,
        chatMessages,
        clearChat,
        setCanvasMode,
        studioTab,
        setStudioTab,
        studioCodeMode,
        setStudioCodeMode,
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
    });

    const chrome = useFlowEditorChromeProps({
        handleSwitchTab,
        handleAddTab,
        handleCloseTab,
        handleRenameTab,
        handleExport,
        handleSvgExport,
        handleAnimatedExport,
        handleExportJSON,
        handleExportMermaid,
        handleExportPlantUML,
        handleExportOpenFlowDSL,
        handleExportFigma,
        handleShare,
        handleImportJSON,
        openHistory,
        onGoHome,
        startPlayback,
        collaborationTopNavState,
        currentStepIndex,
        openCommandBar,
        toggleStudioPanel,
        editorMode,
        handleAddShape,
        undo,
        redo,
        handleLayoutWithContext,
        canUndo,
        canRedo,
        isSelectMode,
        enableSelectMode,
        isCommandBarOpen,
        enablePanMode,
        getCenter,
        nodes,
        t,
        openStudioPanel,
        handleAddNode,
        setPendingAIPrompt,
        totalSteps,
        isPlaying,
        togglePlay,
        nextStep,
        prevStep,
        stopPlayback,
    });

    return {
        shouldRenderPanels,
        handleCanvasEntityIntent,
        panels,
        chrome,
    };
}
