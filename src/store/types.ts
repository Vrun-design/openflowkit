import type {
    Connection,
    EdgeChange,
    NodeChange,
    OnEdgesChange,
    OnNodesChange,
} from 'reactflow';
import type { DesignSystem, FlowEdge, FlowNode, FlowTab, GlobalEdgeOptions } from '@/lib/types';

export interface ViewSettings {
    showGrid: boolean;
    snapToGrid: boolean;
    showMiniMap: boolean;
    isShortcutsHelpOpen: boolean;
    defaultIconsEnabled: boolean;
    smartRoutingEnabled: boolean;
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
    selectedNodeId: string | null;
    selectedEdgeId: string | null;
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    setNodes: (nodes: FlowNode[] | ((nodes: FlowNode[]) => FlowNode[])) => void;
    setEdges: (edges: FlowEdge[] | ((edges: FlowEdge[]) => FlowEdge[])) => void;
    onConnect: (connection: Connection) => void;
    setActiveTabId: (id: string) => void;
    setTabs: (tabs: FlowTab[]) => void;
    addTab: () => string;
    closeTab: (id: string) => void;
    updateTab: (id: string, updates: Partial<FlowTab>) => void;
    setActiveDesignSystem: (id: string) => void;
    addDesignSystem: (ds: DesignSystem) => void;
    updateDesignSystem: (id: string, updates: Partial<DesignSystem>) => void;
    deleteDesignSystem: (id: string) => void;
    duplicateDesignSystem: (id: string) => void;
    toggleGrid: () => void;
    toggleSnap: () => void;
    toggleMiniMap: () => void;
    setShortcutsHelpOpen: (open: boolean) => void;
    setViewSettings: (settings: Partial<ViewSettings>) => void;
    setGlobalEdgeOptions: (options: Partial<GlobalEdgeOptions>) => void;
    setDefaultIconsEnabled: (enabled: boolean) => void;
    setSmartRoutingEnabled: (enabled: boolean) => void;
    toggleAnalytics: (enabled: boolean) => void;
    setAISettings: (settings: Partial<AISettings>) => void;
    setBrandConfig: (config: Partial<BrandConfig>) => void;
    resetBrandConfig: () => void;
    addBrandKit: (name: string, base?: BrandConfig) => void;
    updateBrandKitName: (id: string, name: string) => void;
    deleteBrandKit: (id: string) => void;
    setActiveBrandKitId: (id: string) => void;
    setSelectedNodeId: (id: string | null) => void;
    setSelectedEdgeId: (id: string | null) => void;
}

export type { EdgeChange, NodeChange };
