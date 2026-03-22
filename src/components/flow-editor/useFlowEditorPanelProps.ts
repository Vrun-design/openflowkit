import { useMemo } from 'react';
import type { FlowEditorPanelsProps } from '@/components/FlowEditorPanels';
import type { FlowNode, FlowEdge, FlowSnapshot } from '@/lib/types';
import type { CommandBarView, FlowEditorMode, StudioCodeMode, StudioTab } from '@/hooks/useFlowEditorUIState';
import type { DomainLibraryItem } from '@/services/domainLibrary';
import type { SupportedLanguage } from '@/hooks/ai-generation/codeToArchitecture';
import type { TerraformInputFormat } from '@/hooks/ai-generation/terraformToCloud';
import type { ChatMessage } from '@/services/aiService';
import type { FlowTemplate } from '@/services/templates';
import type { LayoutAlgorithm } from '@/services/elkLayout';
import {
    buildCommandBarPanelProps,
    buildPropertiesRailProps,
    buildSnapshotsPanelProps,
    buildStudioRailProps,
} from './panelProps';

interface UseFlowEditorPanelPropsParams {
    isCommandBarOpen: boolean;
    closeCommandBar: () => void;
    commandBarView: CommandBarView;
    isHistoryOpen: boolean;
    closeHistory: () => void;
    editorMode: FlowEditorMode;
    nodes: FlowNode[];
    edges: FlowEdge[];
    snapshots: FlowSnapshot[];
    manualSnapshots: FlowSnapshot[];
    autoSnapshots: FlowSnapshot[];
    saveSnapshot: (name: string, nodes: FlowNode[], edges: FlowEdge[]) => void;
    handleRestoreSnapshot: (snapshot: FlowSnapshot) => void;
    deleteSnapshot: (id: string) => void;
    setDiffBaseline: (snapshot: FlowSnapshot) => void;
    undo: () => void;
    redo: () => void;
    onLayout: (
        direction?: 'TB' | 'LR' | 'RL' | 'BT',
        algorithm?: LayoutAlgorithm,
        spacing?: 'compact' | 'normal' | 'loose'
    ) => Promise<void>;
    handleInsertTemplate: (template: FlowTemplate) => void;
    openStudioAI: () => void;
    openStudioCode: (codeMode: StudioCodeMode) => void;
    openStudioPlayback: () => void;
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
    showGrid: boolean;
    toggleGrid: () => void;
    snapToGrid: boolean;
    toggleSnap: () => void;
    selectedNode: FlowNode | null;
    selectedNodes: FlowNode[];
    selectedEdge: FlowEdge | null;
    updateNodeData: (id: string, data: Record<string, unknown>) => void;
    applyBulkNodeData: FlowEditorPanelsProps['properties']['onBulkChangeNodes'];
    updateNodeType: (id: string, type: string) => void;
    updateEdge: (id: string, data: Record<string, unknown>) => void;
    deleteNode: (id: string) => void;
    duplicateNode: (id: string) => void;
    deleteEdge: (id: string) => void;
    updateNodeZIndex: (id: string, action: 'front' | 'back') => void;
    handleAddMindmapChild: FlowEditorPanelsProps['properties']['onAddMindmapChild'];
    handleAddMindmapSibling: FlowEditorPanelsProps['properties']['onAddMindmapSibling'];
    handleAddArchitectureService: FlowEditorPanelsProps['properties']['onAddArchitectureService'];
    handleCreateArchitectureBoundary: FlowEditorPanelsProps['properties']['onCreateArchitectureBoundary'];
    clearSelection: () => void;
    closeStudioPanel: () => void;
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
    setCanvasMode: () => void;
    studioTab: StudioTab;
    setStudioTab: (tab: StudioTab) => void;
    studioCodeMode: StudioCodeMode;
    setStudioCodeMode: (mode: StudioCodeMode) => void;
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
}

export function useFlowEditorPanelProps({
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
}: UseFlowEditorPanelPropsParams): FlowEditorPanelsProps {
    const commandBarPanelProps = useMemo(() => buildCommandBarPanelProps({
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
        openStudioPlayback,
        commandBarView,
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
        openStudioPlayback,
        commandBarView,
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
    ]);

    const snapshotsPanelProps = useMemo(() => buildSnapshotsPanelProps({
        isHistoryOpen,
        closeHistory,
        snapshots,
        manualSnapshots,
        autoSnapshots,
        saveSnapshot,
        handleRestoreSnapshot,
        deleteSnapshot,
        handleCompareSnapshot: setDiffBaseline,
        nodes,
        edges,
    }), [
        isHistoryOpen,
        closeHistory,
        snapshots,
        manualSnapshots,
        autoSnapshots,
        saveSnapshot,
        handleRestoreSnapshot,
        deleteSnapshot,
        setDiffBaseline,
        nodes,
        edges,
    ]);

    const propertiesRailProps = useMemo(() => buildPropertiesRailProps({
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
    }), [
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
    ]);

    const studioRailProps = useMemo(() => buildStudioRailProps({
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
        selectedNode,
        selectedNodeCount: selectedNodes.length,
        setCanvasMode,
        studioTab,
        setStudioTab,
        studioCodeMode,
        setStudioCodeMode,
        playback: {
            currentStepIndex,
            totalSteps,
            isPlaying,
            onStartPlayback: startPlayback,
            onPlayPause: togglePlay,
            onStop: stopPlayback,
            onScrubToStep: jumpToStep,
            onNext: nextStep,
            onPrev: prevStep,
            playbackSpeed,
            onPlaybackSpeedChange: setPlaybackSpeed,
        },
        initialPrompt: pendingAIPrompt,
        onInitialPromptConsumed: clearPendingAIPrompt,
    }), [
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
        selectedNode,
        selectedNodes.length,
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
    ]);

    return useMemo(() => ({
        commandBar: commandBarPanelProps,
        snapshots: snapshotsPanelProps,
        properties: propertiesRailProps,
        studio: studioRailProps,
        isHistoryOpen,
        editorMode,
    }), [
        commandBarPanelProps,
        snapshotsPanelProps,
        propertiesRailProps,
        studioRailProps,
        isHistoryOpen,
        editorMode,
    ]);
}
