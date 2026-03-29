import type { FlowEditorPanelsProps } from '@/components/FlowEditorPanels';
import type { FlowEdge, FlowNode, FlowSnapshot } from '@/lib/types';
import type {
  CommandBarView,
  FlowEditorMode,
  StudioCodeMode,
  StudioTab,
} from '@/hooks/useFlowEditorUIState';
import type { LayoutAlgorithm } from '@/services/elkLayout';
import type { FlowTemplate } from '@/services/templates';
import type { DomainLibraryItem } from '@/services/domainLibrary';
import type { ChatMessage } from '@/services/aiService';
import type { SupportedLanguage } from '@/hooks/ai-generation/codeToArchitecture';
import type { TerraformInputFormat } from '@/hooks/ai-generation/terraformToCloud';
import type { AIReadinessState } from '@/hooks/ai-generation/readiness';

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
  handleAddSequenceParticipant: () => void;
  handleAddClassNode: () => void;
  handleAddEntityNode: () => void;
  handleAddImage: (imageUrl: string) => void;
  handleAddWireframe: (surface: 'browser' | 'mobile') => void;
  handleAddDomainLibraryItem: (item: DomainLibraryItem) => void;
  handleCodeAnalysis?: (code: string, language: SupportedLanguage) => Promise<boolean>;
  handleSqlAnalysis?: (sql: string) => Promise<boolean>;
  handleTerraformAnalysis?: (input: string, format: TerraformInputFormat) => Promise<boolean>;
  handleOpenApiAnalysis?: (spec: string) => Promise<boolean>;
  handleApplyDsl?: (dsl: string) => void;
  handleCodebaseAnalysis?: (summary: string) => Promise<boolean>;
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
  fitSectionToContents: (id: string) => void;
  releaseFromSection: (id: string) => void;
  handleBringContentsIntoSection: (id: string) => void;
  handleAddMindmapChild: FlowEditorPanelsProps['properties']['onAddMindmapChild'];
  handleAddMindmapSibling: FlowEditorPanelsProps['properties']['onAddMindmapSibling'];
  handleAddArchitectureService: FlowEditorPanelsProps['properties']['onAddArchitectureService'];
  handleCreateArchitectureBoundary: FlowEditorPanelsProps['properties']['onCreateArchitectureBoundary'];
  handleApplyArchitectureTemplate: FlowEditorPanelsProps['properties']['onApplyArchitectureTemplate'];
  handleGenerateEntityFields: FlowEditorPanelsProps['properties']['onGenerateEntityFields'];
  handleSuggestArchitectureNode: FlowEditorPanelsProps['properties']['onSuggestArchitectureNode'];
  handleConvertEntitySelectionToClassDiagram: FlowEditorPanelsProps['properties']['onConvertEntitySelectionToClassDiagram'];
  handleOpenMermaidCodeEditor: FlowEditorPanelsProps['properties']['onOpenMermaidCodeEditor'];
  clearSelection: () => void;
}

export interface StudioRailBuilderParams {
  closeStudioPanel: () => void;
  handleCommandBarApply: (nodes: FlowNode[], edges: FlowEdge[]) => void;
  handleAIRequest: (prompt: string, imageBase64?: string) => Promise<boolean>;
  isGenerating: boolean;
  streamingText: string | null;
  retryCount: number;
  cancelGeneration: () => void;
  pendingDiff: import('@/hooks/useAIGeneration').ImportDiff | null;
  confirmPendingDiff: () => void;
  discardPendingDiff: () => void;
  aiReadiness: AIReadinessState;
  lastAIError: string | null;
  onClearAIError: () => void;
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

function wrapAsyncCommand<TArgs extends unknown[]>(
  handler?: (...args: TArgs) => Promise<boolean>
): ((...args: TArgs) => Promise<void>) | undefined {
  if (!handler) {
    return undefined;
  }

  return async (...args: TArgs): Promise<void> => {
    await handler(...args);
  };
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
  handleAddSequenceParticipant,
  handleAddClassNode,
  handleAddEntityNode,
  handleAddImage,
  handleAddWireframe,
  handleAddDomainLibraryItem,
  handleCodeAnalysis,
  handleSqlAnalysis,
  handleTerraformAnalysis,
  handleOpenApiAnalysis,
  handleApplyDsl,
  handleCodebaseAnalysis,
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
    onAddSequence: handleAddSequenceParticipant,
    onAddClassNode: handleAddClassNode,
    onAddEntityNode: handleAddEntityNode,
    onAddImage: handleAddImage,
    onAddBrowserWireframe: () => handleAddWireframe('browser'),
    onAddMobileWireframe: () => handleAddWireframe('mobile'),
    onAddDomainLibraryItem: handleAddDomainLibraryItem,
    onCodeAnalysis: wrapAsyncCommand(handleCodeAnalysis),
    onSqlAnalysis: wrapAsyncCommand(handleSqlAnalysis),
    onTerraformAnalysis: wrapAsyncCommand(handleTerraformAnalysis),
    onOpenApiAnalysis: wrapAsyncCommand(handleOpenApiAnalysis),
    onApplyDsl: handleApplyDsl,
    onCodebaseAnalysis: wrapAsyncCommand(handleCodebaseAnalysis),
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
  fitSectionToContents,
  releaseFromSection,
  handleBringContentsIntoSection,
  handleAddMindmapChild,
  handleAddMindmapSibling,
  handleAddArchitectureService,
  handleCreateArchitectureBoundary,
  handleApplyArchitectureTemplate,
  handleGenerateEntityFields,
  handleSuggestArchitectureNode,
  handleConvertEntitySelectionToClassDiagram,
  handleOpenMermaidCodeEditor,
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
    onFitSectionToContents: fitSectionToContents,
    onReleaseFromSection: releaseFromSection,
    onBringContentsIntoSection: handleBringContentsIntoSection,
    onAddMindmapChild: handleAddMindmapChild,
    onAddMindmapSibling: handleAddMindmapSibling,
    onAddArchitectureService: handleAddArchitectureService,
    onCreateArchitectureBoundary: handleCreateArchitectureBoundary,
    onApplyArchitectureTemplate: handleApplyArchitectureTemplate,
    onGenerateEntityFields: handleGenerateEntityFields,
    onSuggestArchitectureNode: handleSuggestArchitectureNode,
    onConvertEntitySelectionToClassDiagram: handleConvertEntitySelectionToClassDiagram,
    onOpenMermaidCodeEditor: handleOpenMermaidCodeEditor,
    onClose: clearSelection,
  };
}

export function buildStudioRailProps({
  closeStudioPanel,
  handleCommandBarApply,
  handleAIRequest,
  isGenerating,
  streamingText,
  retryCount,
  cancelGeneration,
  pendingDiff,
  confirmPendingDiff,
  discardPendingDiff,
  aiReadiness,
  lastAIError,
  onClearAIError,
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
    isGenerating,
    streamingText,
    retryCount,
    cancelGeneration,
    pendingDiff,
    onConfirmDiff: confirmPendingDiff,
    onDiscardDiff: discardPendingDiff,
    aiReadiness,
    lastAIError,
    onClearAIError,
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
