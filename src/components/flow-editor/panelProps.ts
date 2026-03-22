import type { FlowEditorPanelsProps } from '@/components/FlowEditorPanels';
import type { FlowEdge, FlowNode, FlowSnapshot } from '@/lib/types';
import type { CommandBarView, FlowEditorMode, StudioCodeMode, StudioTab } from '@/hooks/useFlowEditorUIState';
import type { LayoutAlgorithm } from '@/services/elkLayout';
import type { FlowTemplate } from '@/services/templates';
import type { DomainLibraryItem } from '@/services/domainLibrary';
import type { ChatMessage } from '@/services/aiService';
import type { SupportedLanguage } from '@/hooks/ai-generation/codeToArchitecture';
import type { TerraformInputFormat } from '@/hooks/ai-generation/terraformToCloud';

export interface CommandBarPanelBuilderParams {
    isCommandBarOpen: boolean;
    closeCommandBar: () => void;
    nodes: FlowNode[];
    edges: FlowEdge[];
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
    commandBarView: CommandBarView;
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
}

export interface SnapshotsPanelBuilderParams {
    isHistoryOpen: boolean;
    closeHistory: () => void;
    snapshots: FlowSnapshot[];
    manualSnapshots: FlowSnapshot[];
    autoSnapshots: FlowSnapshot[];
    saveSnapshot: (name: string, nodes: FlowNode[], edges: FlowEdge[]) => void;
    handleRestoreSnapshot: (snapshot: FlowSnapshot) => void;
    deleteSnapshot: (id: string) => void;
    handleCompareSnapshot?: (snapshot: FlowSnapshot) => void;
    nodes: FlowNode[];
    edges: FlowEdge[];
}

export interface PropertiesRailBuilderParams {
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
}

export interface StudioRailBuilderParams {
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
    selectedNode: FlowNode | null;
    selectedNodeCount: number;
    setCanvasMode: () => void;
    studioTab: StudioTab;
    setStudioTab: (tab: StudioTab) => void;
    studioCodeMode: StudioCodeMode;
    setStudioCodeMode: (mode: StudioCodeMode) => void;
    playback: FlowEditorPanelsProps['studio']['playback'];
    initialPrompt?: string;
    onInitialPromptConsumed?: () => void;
}

export interface BuildFlowEditorPanelsPropsParams {
    commandBar: CommandBarPanelBuilderParams;
    snapshots: SnapshotsPanelBuilderParams;
    properties: PropertiesRailBuilderParams;
    studio: StudioRailBuilderParams;
    isHistoryOpen: boolean;
    editorMode: FlowEditorMode;
}

export function buildCommandBarPanelProps({
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
}: CommandBarPanelBuilderParams): FlowEditorPanelsProps['commandBar'] {
    return {
        isOpen: isCommandBarOpen,
        onClose: closeCommandBar,
        nodes,
        edges,
        onUndo: undo,
        onRedo: redo,
        onLayout,
        onSelectTemplate: handleInsertTemplate,
        onOpenStudioAI: openStudioAI,
        onOpenStudioOpenFlow: () => openStudioCode('openflow'),
        onOpenStudioMermaid: () => openStudioCode('mermaid'),
        onOpenStudioPlayback: openStudioPlayback,
        initialView: commandBarView,
        onAddAnnotation: handleAddAnnotation,
        onAddSection: handleAddSection,
        onAddText: handleAddTextNode,
        onAddJourney: handleAddJourneyNode,
        onAddMindmap: handleAddMindmapNode,
        onAddArchitecture: handleAddArchitectureNode,
        onAddClassNode: handleAddClassNode,
        onAddEntityNode: handleAddEntityNode,
        onAddImage: handleAddImage,
        onAddBrowserWireframe: () => handleAddWireframe('browser'),
        onAddMobileWireframe: () => handleAddWireframe('mobile'),
        onAddDomainLibraryItem: handleAddDomainLibraryItem,
        showGrid,
        onToggleGrid: toggleGrid,
        snapToGrid,
        onToggleSnap: toggleSnap,
    };
}

export function buildSnapshotsPanelProps({
    isHistoryOpen,
    closeHistory,
    snapshots,
    manualSnapshots,
    autoSnapshots,
    saveSnapshot,
    handleRestoreSnapshot,
    deleteSnapshot,
    handleCompareSnapshot,
    nodes,
    edges,
}: SnapshotsPanelBuilderParams): FlowEditorPanelsProps['snapshots'] {
    return {
        isOpen: isHistoryOpen,
        onClose: closeHistory,
        snapshots,
        manualSnapshots,
        autoSnapshots,
        onSaveSnapshot: (name) => saveSnapshot(name, nodes, edges),
        onRestoreSnapshot: handleRestoreSnapshot,
        onDeleteSnapshot: deleteSnapshot,
        onCompareSnapshot: handleCompareSnapshot,
    };
}

export function buildPropertiesRailProps({
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
}: PropertiesRailBuilderParams): FlowEditorPanelsProps['properties'] {
    return {
        selectedNode,
        selectedNodes,
        selectedEdge,
        onChangeNode: updateNodeData,
        onBulkChangeNodes: applyBulkNodeData,
        onChangeNodeType: updateNodeType,
        onChangeEdge: updateEdge,
        onDeleteNode: deleteNode,
        onDuplicateNode: duplicateNode,
        onDeleteEdge: deleteEdge,
        onUpdateZIndex: updateNodeZIndex,
        onAddMindmapChild: handleAddMindmapChild,
        onAddMindmapSibling: handleAddMindmapSibling,
        onAddArchitectureService: handleAddArchitectureService,
        onCreateArchitectureBoundary: handleCreateArchitectureBoundary,
        onClose: clearSelection,
    };
}

export function buildStudioRailProps({
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
    selectedNodeCount,
    setCanvasMode,
    studioTab,
    setStudioTab,
    studioCodeMode,
    setStudioCodeMode,
    playback,
    initialPrompt,
    onInitialPromptConsumed,
}: StudioRailBuilderParams): FlowEditorPanelsProps['studio'] {
    return {
        onClose: closeStudioPanel,
        onApply: handleCommandBarApply,
        onAIGenerate: handleAIRequest,
        onCodeAnalysis: handleCodeAnalysis,
        onSqlAnalysis: handleSqlAnalysis,
        onTerraformAnalysis: handleTerraformAnalysis,
        onOpenApiAnalysis: handleOpenApiAnalysis,
        onApplyInfraDsl: handleApplyInfraDsl,
        isGenerating,
        chatMessages,
        onClearChat: clearChat,
        selectedNode,
        selectedNodeCount,
        onViewProperties: setCanvasMode,
        activeTab: studioTab,
        onTabChange: setStudioTab,
        codeMode: studioCodeMode,
        onCodeModeChange: setStudioCodeMode,
        playback,
        initialPrompt,
        onInitialPromptConsumed,
    };
}

export function buildFlowEditorPanelsProps({
    commandBar,
    snapshots,
    properties,
    studio,
    isHistoryOpen,
    editorMode,
}: BuildFlowEditorPanelsPropsParams): FlowEditorPanelsProps {
    return {
        commandBar: buildCommandBarPanelProps(commandBar),
        snapshots: buildSnapshotsPanelProps(snapshots),
        properties: buildPropertiesRailProps(properties),
        studio: buildStudioRailProps(studio),
        isHistoryOpen,
        editorMode,
    };
}
