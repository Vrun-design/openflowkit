import type { FlowEditorPanelsProps } from '@/components/FlowEditorPanels';
import type { FlowEdge, FlowNode, FlowSnapshot } from '@/lib/types';
import type { CommandBarView, FlowEditorMode, StudioCodeMode, StudioTab } from '@/hooks/useFlowEditorUIState';
import type { LayoutAlgorithm } from '@/services/elkLayout';
import type { FlowTemplate } from '@/services/templates';
import type { DomainLibraryItem } from '@/services/domainLibrary';
import type { ChatMessage } from '@/services/aiService';

interface BuildFlowEditorPanelsPropsParams {
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
    commandBarView: CommandBarView;
    handleAddAnnotation: () => void;
    handleAddSection: () => void;
    handleAddTextNode: () => void;
    handleAddJourneyNode: () => void;
    handleAddMindmapNode: () => void;
    handleAddArchitectureNode: () => void;
    handleAddImage: (imageUrl: string) => void;
    handleAddWireframe: (surface: 'browser' | 'mobile') => void;
    handleAddDomainLibraryItem: (item: DomainLibraryItem) => void;
    showGrid: boolean;
    toggleGrid: () => void;
    snapToGrid: boolean;
    toggleSnap: () => void;
    isHistoryOpen: boolean;
    closeHistory: () => void;
    snapshots: FlowSnapshot[];
    manualSnapshots: FlowSnapshot[];
    autoSnapshots: FlowSnapshot[];
    saveSnapshot: (name: string, nodes: FlowNode[], edges: FlowEdge[]) => void;
    handleRestoreSnapshot: (snapshot: FlowSnapshot) => void;
    deleteSnapshot: (id: string) => void;
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
    isGenerating: boolean;
    chatMessages: ChatMessage[];
    clearChat: () => void;
    studioTab: StudioTab;
    setStudioTab: (tab: StudioTab) => void;
    studioCodeMode: StudioCodeMode;
    setStudioCodeMode: (mode: StudioCodeMode) => void;
    editorMode: FlowEditorMode;
}

export function buildFlowEditorPanelsProps({
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
}: BuildFlowEditorPanelsPropsParams): FlowEditorPanelsProps {
    return {
        commandBar: {
            isOpen: isCommandBarOpen,
            onClose: closeCommandBar,
            nodes,
            edges,
            onUndo: undo,
            onRedo: redo,
            onLayout,
            onSelectTemplate: handleInsertTemplate,
            onOpenStudioAI: openStudioAI,
            onOpenStudioFlowMind: () => openStudioCode('flowmind'),
            onOpenStudioMermaid: () => openStudioCode('mermaid'),
            initialView: commandBarView,
            onAddAnnotation: handleAddAnnotation,
            onAddSection: handleAddSection,
            onAddText: handleAddTextNode,
            onAddJourney: handleAddJourneyNode,
            onAddMindmap: handleAddMindmapNode,
            onAddArchitecture: handleAddArchitectureNode,
            onAddImage: handleAddImage,
            onAddBrowserWireframe: () => handleAddWireframe('browser'),
            onAddMobileWireframe: () => handleAddWireframe('mobile'),
            onAddDomainLibraryItem: handleAddDomainLibraryItem,
            showGrid,
            onToggleGrid: toggleGrid,
            snapToGrid,
            onToggleSnap: toggleSnap,
        },
        snapshots: {
            isOpen: isHistoryOpen,
            onClose: closeHistory,
            snapshots,
            manualSnapshots,
            autoSnapshots,
            onSaveSnapshot: (name) => saveSnapshot(name, nodes, edges),
            onRestoreSnapshot: handleRestoreSnapshot,
            onDeleteSnapshot: deleteSnapshot,
        },
        properties: {
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
        },
        studio: {
            onClose: closeStudioPanel,
            onApply: handleCommandBarApply,
            onAIGenerate: handleAIRequest,
            isGenerating,
            chatMessages,
            onClearChat: clearChat,
            activeTab: studioTab,
            onTabChange: setStudioTab,
            codeMode: studioCodeMode,
            onCodeModeChange: setStudioCodeMode,
        },
        isHistoryOpen,
        editorMode,
    };
}
