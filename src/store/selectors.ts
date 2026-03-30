import type { DesignSystem, FlowTab } from '@/lib/types';
import type {
  CanvasActionsSlice,
  CanvasStateSlice,
  CanvasViewSettingsSlice,
  DesignSystemActionsSlice,
  DesignSystemCatalogSlice,
  FlowState,
  HistoryActionsSlice,
  MermaidDiagnosticsActionsSlice,
  NodeLabelEditActionsSlice,
  SelectionActionsSlice,
  SelectionStateSlice,
  ShortcutHelpActionsSlice,
  TabActionsSlice,
  TabStateSlice,
  VisualSettingsActionsSlice,
  WorkspaceDocumentActionsSlice,
  WorkspaceDocumentsStateSlice,
} from './types';

export function selectCanvasState(state: FlowState): CanvasStateSlice {
  return {
    nodes: state.nodes,
    edges: state.edges,
  };
}

export function selectCanvasActions(state: FlowState): CanvasActionsSlice {
  return {
    onNodesChange: state.onNodesChange,
    onEdgesChange: state.onEdgesChange,
    setNodes: state.setNodes,
    setEdges: state.setEdges,
    onConnect: state.onConnect,
  };
}

export function selectWorkspaceDocumentsState(
  state: FlowState
): WorkspaceDocumentsStateSlice {
  return {
    documents: state.documents,
    activeDocumentId: state.activeDocumentId,
    tabs: state.tabs,
    activeTabId: state.activeTabId,
    nodes: state.nodes,
    edges: state.edges,
  };
}

export function selectWorkspaceDocumentActions(
  state: FlowState
): WorkspaceDocumentActionsSlice {
  return {
    setActiveDocumentId: state.setActiveDocumentId,
    setDocuments: state.setDocuments,
    createDocument: state.createDocument,
    renameDocument: state.renameDocument,
    duplicateDocument: state.duplicateDocument,
    deleteDocumentRecord: state.deleteDocumentRecord,
  };
}

export function selectTabsState(state: FlowState): TabStateSlice {
  return {
    tabs: state.tabs,
    activeTabId: state.activeTabId,
  };
}

export function selectTabActions(state: FlowState): TabActionsSlice {
  return {
    setActiveTabId: state.setActiveTabId,
    setTabs: state.setTabs,
    addTab: state.addTab,
    duplicateActiveTab: state.duplicateActiveTab,
    duplicateTab: state.duplicateTab,
    reorderTab: state.reorderTab,
    deleteTab: state.deleteTab,
    closeTab: state.closeTab,
    updateTab: state.updateTab,
    copySelectedToTab: state.copySelectedToTab,
    moveSelectedToTab: state.moveSelectedToTab,
  };
}

export function createTabByIdSelector(
  tabId: string
): (state: FlowState) => FlowTab | undefined {
  return (state) => state.tabs.find((tab) => tab.id === tabId);
}

export function selectHistoryActions(state: FlowState): HistoryActionsSlice {
  return {
    recordHistoryV2: state.recordHistoryV2,
    undoV2: state.undoV2,
    redoV2: state.redoV2,
    canUndoV2: state.canUndoV2,
    canRedoV2: state.canRedoV2,
  };
}

export function selectDesignSystemsCatalog(
  state: FlowState
): DesignSystemCatalogSlice {
  return {
    designSystems: state.designSystems,
    activeDesignSystemId: state.activeDesignSystemId,
  };
}

export function selectActiveDesignSystem(state: FlowState): DesignSystem {
  return (
    state.designSystems.find(
      (designSystem) => designSystem.id === state.activeDesignSystemId
    ) ?? state.designSystems[0]
  );
}

export function createDesignSystemByIdSelector(
  systemId: string
): (state: FlowState) => DesignSystem | undefined {
  return (state) =>
    state.designSystems.find((designSystem) => designSystem.id === systemId);
}

export function selectDesignSystemActions(
  state: FlowState
): DesignSystemActionsSlice {
  return {
    setActiveDesignSystem: state.setActiveDesignSystem,
    addDesignSystem: state.addDesignSystem,
    updateDesignSystem: state.updateDesignSystem,
    deleteDesignSystem: state.deleteDesignSystem,
    duplicateDesignSystem: state.duplicateDesignSystem,
  };
}

export function selectViewSettings(state: FlowState): FlowState['viewSettings'] {
  return state.viewSettings;
}

export function selectShortcutHelpOpen(state: FlowState): boolean {
  return state.viewSettings.isShortcutsHelpOpen;
}

export function selectShortcutHelpActions(
  state: FlowState
): ShortcutHelpActionsSlice {
  return {
    setShortcutsHelpOpen: state.setShortcutsHelpOpen,
  };
}

export function selectCanvasViewSettings(
  state: FlowState
): CanvasViewSettingsSlice {
  return {
    showGrid: state.viewSettings.showGrid,
    snapToGrid: state.viewSettings.snapToGrid,
    alignmentGuidesEnabled: state.viewSettings.alignmentGuidesEnabled,
    largeGraphSafetyMode: state.viewSettings.largeGraphSafetyMode,
    largeGraphSafetyProfile: state.viewSettings.largeGraphSafetyProfile,
    architectureStrictMode: state.viewSettings.architectureStrictMode,
  };
}

export function selectVisualSettingsActions(
  state: FlowState
): VisualSettingsActionsSlice {
  return {
    toggleGrid: state.toggleGrid,
    toggleSnap: state.toggleSnap,
    setViewSettings: state.setViewSettings,
    setGlobalEdgeOptions: state.setGlobalEdgeOptions,
    setDefaultIconsEnabled: state.setDefaultIconsEnabled,
    setSmartRoutingEnabled: state.setSmartRoutingEnabled,
    setSmartRoutingProfile: state.setSmartRoutingProfile,
    setSmartRoutingBundlingEnabled: state.setSmartRoutingBundlingEnabled,
    setLargeGraphSafetyMode: state.setLargeGraphSafetyMode,
    setLargeGraphSafetyProfile: state.setLargeGraphSafetyProfile,
  };
}

export function selectSelectionState(state: FlowState): SelectionStateSlice {
  return {
    selectedNodeId: state.selectedNodeId,
    selectedEdgeId: state.selectedEdgeId,
    hoveredSectionId: state.hoveredSectionId,
  };
}

export function selectSelectionActions(
  state: FlowState
): SelectionActionsSlice {
  return {
    setSelectedNodeId: state.setSelectedNodeId,
    setSelectedEdgeId: state.setSelectedEdgeId,
    setHoveredSectionId: state.setHoveredSectionId,
  };
}

export function selectNodeLabelEditActions(
  state: FlowState
): NodeLabelEditActionsSlice {
  return {
    queuePendingNodeLabelEditRequest: state.queuePendingNodeLabelEditRequest,
    clearPendingNodeLabelEditRequest: state.clearPendingNodeLabelEditRequest,
  };
}

export function selectMermaidDiagnosticsActions(
  state: FlowState
): MermaidDiagnosticsActionsSlice {
  return {
    setMermaidDiagnostics: state.setMermaidDiagnostics,
    clearMermaidDiagnostics: state.clearMermaidDiagnostics,
  };
}
