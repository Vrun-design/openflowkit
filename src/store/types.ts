import type {
    Connection,
    EdgeChange,
    NodeChange,
    OnEdgesChange,
    OnNodesChange,
} from '@/lib/reactflowCompat';
import type { ParseDiagnostic } from '@/lib/openFlowDSLParser';
import type { DesignSystem, DiagramType, FlowEdge, FlowNode, FlowTab, GlobalEdgeOptions } from '@/lib/types';
import type { ExportSerializationMode } from '@/services/canonicalSerialization';

export interface ViewSettings {
    showGrid: boolean;
    snapToGrid: boolean;
    alignmentGuidesEnabled: boolean;
    isShortcutsHelpOpen: boolean;
    defaultIconsEnabled: boolean;
    smartRoutingEnabled: boolean;
    smartRoutingProfile: 'standard' | 'infrastructure';
    smartRoutingBundlingEnabled: boolean;
    architectureStrictMode: boolean;
    largeGraphSafetyMode: 'auto' | 'on' | 'off';
    largeGraphSafetyProfile: 'performance' | 'balanced' | 'quality';
    exportSerializationMode: ExportSerializationMode;
    historyModelV2Enabled: boolean;
    analyticsEnabled: boolean;
    language: string;
}

export type AIProvider =
    | 'gemini'
    | 'openai'
    | 'claude'
    | 'groq'
    | 'nvidia'
    | 'cerebras'
    | 'mistral'
    | 'openrouter'
    | 'custom';

export interface CustomHeaderConfig {
    key: string;
    value: string;
    enabled?: boolean;
}

export interface AISettings {
    provider: AIProvider;
    apiKey?: string;
    model?: string;
    customBaseUrl?: string;
    customHeaders?: CustomHeaderConfig[];
}

export interface BrandConfig {
    appName: string;
    logoUrl: string | null;
    faviconUrl: string | null;
    logoStyle: 'icon' | 'text' | 'both' | 'wide';
    colors: {
        primary: string;
        secondary: string;
        background: string;
        surface: string;
        text: string;
    };
    typography: {
        fontFamily: string;
    };
    shape: {
        radius: number;
        borderWidth: number;
    };
    ui: {
        glassmorphism: boolean;
        buttonStyle: 'beveled' | 'flat';
        showBeta: boolean;
    };
}

export interface BrandKit extends BrandConfig {
    id: string;
    name: string;
    isDefault: boolean;
}

export interface Layer {
    id: string;
    name: string;
    visible: boolean;
    locked: boolean;
}

export interface MermaidDiagnosticsSnapshot {
    source: 'paste' | 'import' | 'code';
    diagramType?: DiagramType;
    diagnostics: ParseDiagnostic[];
    error?: string;
    updatedAt: number;
}

export interface PendingNodeLabelEditRequest {
    nodeId: string;
    seedText?: string;
    replaceExisting?: boolean;
}

export interface FlowState {
    nodes: FlowNode[];
    edges: FlowEdge[];
    tabs: FlowTab[];
    activeTabId: string;
    designSystems: DesignSystem[];
    activeDesignSystemId: string;
    viewSettings: ViewSettings;
    globalEdgeOptions: GlobalEdgeOptions;
    aiSettings: AISettings;
    brandConfig: BrandConfig;
    brandKits: BrandKit[];
    activeBrandKitId: string;
    layers: Layer[];
    activeLayerId: string;
    selectedNodeId: string | null;
    selectedEdgeId: string | null;
    pendingNodeLabelEditRequest: PendingNodeLabelEditRequest | null;
    mermaidDiagnostics: MermaidDiagnosticsSnapshot | null;
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    setNodes: (nodes: FlowNode[] | ((nodes: FlowNode[]) => FlowNode[])) => void;
    setEdges: (edges: FlowEdge[] | ((edges: FlowEdge[]) => FlowEdge[])) => void;
    onConnect: (connection: Connection) => void;
    setActiveTabId: (id: string) => void;
    setTabs: (tabs: FlowTab[]) => void;
    addTab: () => string;
    duplicateActiveTab: () => string | null;
    duplicateTab: (id: string) => string | null;
    closeTab: (id: string) => void;
    updateTab: (id: string, updates: Partial<FlowTab>) => void;
    copySelectedToTab: (targetTabId: string) => number;
    moveSelectedToTab: (targetTabId: string) => number;
    setActiveDesignSystem: (id: string) => void;
    addDesignSystem: (ds: DesignSystem) => void;
    updateDesignSystem: (id: string, updates: Partial<DesignSystem>) => void;
    deleteDesignSystem: (id: string) => void;
    duplicateDesignSystem: (id: string) => void;
    toggleGrid: () => void;
    toggleSnap: () => void;
    setShortcutsHelpOpen: (open: boolean) => void;
    setViewSettings: (settings: Partial<ViewSettings>) => void;
    setGlobalEdgeOptions: (options: Partial<GlobalEdgeOptions>) => void;
    setDefaultIconsEnabled: (enabled: boolean) => void;
    setSmartRoutingEnabled: (enabled: boolean) => void;
    setSmartRoutingProfile: (profile: ViewSettings['smartRoutingProfile']) => void;
    setSmartRoutingBundlingEnabled: (enabled: boolean) => void;
    setLargeGraphSafetyMode: (mode: ViewSettings['largeGraphSafetyMode']) => void;
    setLargeGraphSafetyProfile: (profile: ViewSettings['largeGraphSafetyProfile']) => void;
    toggleAnalytics: (enabled: boolean) => void;
    setAISettings: (settings: Partial<AISettings>) => void;
    setBrandConfig: (config: Partial<BrandConfig>) => void;
    resetBrandConfig: () => void;
    addBrandKit: (name: string, base?: BrandConfig) => void;
    updateBrandKitName: (id: string, name: string) => void;
    deleteBrandKit: (id: string) => void;
    setActiveBrandKitId: (id: string) => void;
    addLayer: (name?: string) => string;
    renameLayer: (id: string, name: string) => void;
    deleteLayer: (id: string) => void;
    setActiveLayerId: (id: string) => void;
    toggleLayerVisibility: (id: string) => void;
    toggleLayerLock: (id: string) => void;
    moveLayer: (id: string, direction: 'up' | 'down') => void;
    moveSelectedNodesToLayer: (layerId: string) => void;
    selectNodesInLayer: (layerId: string) => void;
    setSelectedNodeId: (id: string | null) => void;
    setSelectedEdgeId: (id: string | null) => void;
    queuePendingNodeLabelEditRequest: (request: PendingNodeLabelEditRequest) => void;
    clearPendingNodeLabelEditRequest: () => void;
    setMermaidDiagnostics: (snapshot: MermaidDiagnosticsSnapshot | null) => void;
    clearMermaidDiagnostics: () => void;
    recordHistoryV2: () => void;
    undoV2: () => void;
    redoV2: () => void;
    canUndoV2: () => boolean;
    canRedoV2: () => boolean;
}

export type { EdgeChange, NodeChange };
