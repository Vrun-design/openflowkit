import { create } from 'zustand';
import {
    applyNodeChanges,
    applyEdgeChanges,
    OnNodesChange,
    OnEdgesChange,
    NodeChange,
    EdgeChange,
    Connection,
    addEdge,
} from 'reactflow';
import { FlowNode, FlowEdge, FlowTab, FlowHistoryState, GlobalEdgeOptions, DesignSystem } from './types';

import { INITIAL_NODES, INITIAL_EDGES, createDefaultEdge } from './constants';
import { NODE_DEFAULTS } from './theme';
import { assignSmartHandles } from './services/smartEdgeRouting';

// --- Default Design System ---
export const DEFAULT_DESIGN_SYSTEM: DesignSystem = {
    id: 'default',
    name: 'OpenFlowKit Default',
    description: 'The classic FlowMind look and feel.',
    colors: {
        primary: '#6366f1', // Indigo 500
        secondary: '#64748b', // Slate 500
        accent: '#f43f5e', // Rose 500
        background: '#f8fafc', // Slate 50
        surface: '#ffffff', // White
        border: '#e2e8f0', // Slate 200
        text: {
            primary: '#0f172a', // Slate 900
            secondary: '#475569', // Slate 600
        },
        nodeBackground: '#ffffff',
        nodeBorder: '#e2e8f0',
        nodeText: '#0f172a',
        edge: '#94a3b8', // Slate 400
    },
    typography: {
        fontFamily: 'Inter, sans-serif',
        fontSize: {
            sm: '12px',
            md: '14px',
            lg: '16px',
            xl: '20px',
        },
    },
    components: {
        node: {
            borderRadius: '1rem', // rounded-2xl
            borderWidth: '1px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', // shadow-md
            padding: '1rem', // p-4
        },
        edge: {
            strokeWidth: 2,
        },
    },
};

interface ViewSettings {
    showGrid: boolean;
    snapToGrid: boolean;
    showMiniMap: boolean;
    isShortcutsHelpOpen: boolean;
    defaultIconsEnabled: boolean;
    smartRoutingEnabled: boolean;
}

export interface BrandConfig {
    appName: string;
    logoUrl: string | null;
    faviconUrl: string | null; // Added favicon
    apiKey?: string; // [NEW] Gemini API Key
    logoStyle: 'icon' | 'text' | 'both' | 'wide';
    colors: {
        primary: string; // Base color for auto-generation
        secondary: string;
        background: string;
        surface: string;
        text: string;
    };
    typography: {
        fontFamily: string;
    };
    shape: {
        radius: number; // px
        borderWidth: number; // px
    };
    ui: {
        glassmorphism: boolean;
    };
}

export const DEFAULT_BRAND_CONFIG: BrandConfig = {
    appName: 'OpenFlowKit',
    logoUrl: null,
    faviconUrl: null,
    apiKey: undefined,
    logoStyle: 'both',
    colors: {
        primary: '#6366f1',
        secondary: '#64748b',
        background: '#f8fafc',
        surface: '#ffffff',
        text: '#0f172a',
    },
    typography: {
        fontFamily: 'Inter',
    },
    shape: {
        radius: 8,
        borderWidth: 1,
    },
    ui: {
        glassmorphism: true,
    },
};

export interface BrandKit extends BrandConfig {
    id: string;
    name: string;
    isDefault: boolean;
}

export const DEFAULT_BRAND_KIT: BrandKit = {
    ...DEFAULT_BRAND_CONFIG,
    id: 'default',
    name: 'Default',
    isDefault: true,
};


interface FlowState {
    // Nodes & Edges (Active Tab)
    nodes: FlowNode[];
    edges: FlowEdge[];

    // Tab State
    tabs: FlowTab[];
    activeTabId: string;

    // Design Systems
    designSystems: DesignSystem[];
    activeDesignSystemId: string;

    // View Settings
    viewSettings: ViewSettings;
    globalEdgeOptions: GlobalEdgeOptions;

    // Brand
    brandConfig: BrandConfig;
    brandKits: BrandKit[];
    activeBrandKitId: string;

    // Selection
    selectedNodeId: string | null;
    selectedEdgeId: string | null;

    // Actions
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    setNodes: (nodes: FlowNode[] | ((nodes: FlowNode[]) => FlowNode[])) => void;
    setEdges: (edges: FlowEdge[] | ((edges: FlowEdge[]) => FlowEdge[])) => void;
    onConnect: (connection: Connection) => void;

    // Tab Actions
    setActiveTabId: (id: string) => void;
    setTabs: (tabs: FlowTab[]) => void;
    addTab: () => string;
    closeTab: (id: string) => void;
    updateTab: (id: string, updates: Partial<FlowTab>) => void;

    // Design System Actions
    setActiveDesignSystem: (id: string) => void;
    addDesignSystem: (ds: DesignSystem) => void;
    updateDesignSystem: (id: string, updates: Partial<DesignSystem>) => void;
    deleteDesignSystem: (id: string) => void; // New
    duplicateDesignSystem: (id: string) => void; // New

    // View Actions
    toggleGrid: () => void;
    toggleSnap: () => void;
    toggleMiniMap: () => void;
    setShortcutsHelpOpen: (open: boolean) => void;
    setViewSettings: (settings: Partial<ViewSettings>) => void;

    setGlobalEdgeOptions: (options: Partial<GlobalEdgeOptions>) => void;
    setDefaultIconsEnabled: (enabled: boolean) => void;
    setSmartRoutingEnabled: (enabled: boolean) => void;

    // Brand Actions
    setBrandConfig: (config: Partial<BrandConfig>) => void;
    resetBrandConfig: () => void;

    // Brand Kit Actions
    addBrandKit: (name: string, base?: BrandConfig) => void;
    updateBrandKitName: (id: string, name: string) => void;
    deleteBrandKit: (id: string) => void;
    setActiveBrandKitId: (id: string) => void;

    // Selection Actions
    setSelectedNodeId: (id: string | null) => void;
    setSelectedEdgeId: (id: string | null) => void;
}

import { persist } from 'zustand/middleware'; // Import persist

export const useFlowStore = create<FlowState>()(
    persist(
        (set, get) => ({
            // Initial State
            nodes: INITIAL_NODES,
            edges: INITIAL_EDGES,

            tabs: [
                {
                    id: 'tab-1',
                    name: 'Untitled Flow',
                    nodes: INITIAL_NODES,
                    edges: INITIAL_EDGES,
                    history: { past: [], future: [] },
                },
            ],
            activeTabId: 'tab-1',

            designSystems: [DEFAULT_DESIGN_SYSTEM],
            activeDesignSystemId: 'default',

            viewSettings: {
                showGrid: true,
                snapToGrid: true,
                showMiniMap: true,
                isShortcutsHelpOpen: false,
                defaultIconsEnabled: true,
                smartRoutingEnabled: true,
            },

            globalEdgeOptions: {
                type: 'smoothstep',
                animated: true,
                strokeWidth: 2,
            },

            brandConfig: DEFAULT_BRAND_CONFIG,
            brandKits: [DEFAULT_BRAND_KIT],
            activeBrandKitId: 'default',

            selectedNodeId: null,
            selectedEdgeId: null,

            // React Flow Actions
            onNodesChange: (changes: NodeChange[]) => {
                set({
                    nodes: applyNodeChanges(changes, get().nodes),
                });
            },
            onEdgesChange: (changes: EdgeChange[]) => {
                set({
                    edges: applyEdgeChanges(changes, get().edges),
                });
            },
            setNodes: (nodesInput: FlowNode[] | ((nodes: FlowNode[]) => FlowNode[])) => {
                set((state) => ({
                    nodes: typeof nodesInput === 'function' ? nodesInput(state.nodes) : nodesInput
                }));
            },
            setEdges: (edgesInput: FlowEdge[] | ((edges: FlowEdge[]) => FlowEdge[])) => {
                set((state) => ({
                    edges: typeof edgesInput === 'function' ? edgesInput(state.edges) : edgesInput
                }));
            },

            onConnect: (connection: Connection) => {
                const { globalEdgeOptions } = get();
                const newEdge = createDefaultEdge(connection.source!, connection.target!);

                // Apply global options
                newEdge.type = globalEdgeOptions.type === 'default' ? undefined : globalEdgeOptions.type;
                newEdge.animated = globalEdgeOptions.animated;
                newEdge.style = {
                    ...newEdge.style,
                    strokeWidth: globalEdgeOptions.strokeWidth,
                    ...(globalEdgeOptions.color ? { stroke: globalEdgeOptions.color } : {})
                };

                set({
                    edges: addEdge(newEdge, get().edges),
                });
            },

            // Tab Actions
            setActiveTabId: (id) => {
                const { tabs, nodes, edges } = get();
                const currentTabId = get().activeTabId;

                const updatedTabs = tabs.map(t =>
                    t.id === currentTabId
                        ? { ...t, nodes, edges } // Update current tab
                        : t
                );

                const newTab = updatedTabs.find(t => t.id === id);
                if (!newTab) return;

                set({
                    tabs: updatedTabs,
                    activeTabId: id,
                    nodes: newTab.nodes,
                    edges: newTab.edges,
                });
            },

            setTabs: (tabs) => set({ tabs }),

            addTab: () => {
                const { tabs, activeTabId } = get();

                // Save current
                const updatedTabs = tabs.map(t =>
                    t.id === activeTabId ? { ...t, nodes: get().nodes, edges: get().edges } : t
                );

                const newTabId = `tab-${Date.now()}`;
                const newTab: FlowTab = {
                    id: newTabId,
                    name: 'New Flow',
                    nodes: [],
                    edges: [],
                    history: { past: [], future: [] },
                };

                set({
                    tabs: [...updatedTabs, newTab],
                    activeTabId: newTabId,
                    nodes: newTab.nodes,
                    edges: newTab.edges,
                });
                return newTabId;
            },

            closeTab: (id) => {
                const { tabs, activeTabId } = get();
                if (tabs.length === 1) return;

                let newActiveTabId = activeTabId;

                if (id === activeTabId) {
                    const index = tabs.findIndex(t => t.id === id);
                    const nextTab = tabs[index + 1] || tabs[index - 1];
                    if (nextTab) {
                        newActiveTabId = nextTab.id;
                        set({
                            nodes: nextTab.nodes,
                            edges: nextTab.edges,
                            activeTabId: newActiveTabId
                        });
                    }
                }

                set((state) => ({
                    tabs: state.tabs.filter(t => t.id !== id),
                    activeTabId: newActiveTabId === activeTabId ? activeTabId : newActiveTabId
                }));
            },

            updateTab: (id, updates) => {
                set((state) => ({
                    tabs: state.tabs.map(t => t.id === id ? { ...t, ...updates } : t)
                }));
            },

            // Design System Actions
            setActiveDesignSystem: (id) => set({ activeDesignSystemId: id }),
            addDesignSystem: (ds) => set((state) => ({ designSystems: [...state.designSystems, ds] })),
            updateDesignSystem: (id, updates) => set((state) => ({
                designSystems: state.designSystems.map(ds => ds.id === id ? { ...ds, ...updates } : ds)
            })),
            deleteDesignSystem: (id) => {
                if (id === 'default') return; // Cannot delete default
                set((state) => {
                    const newSystems = state.designSystems.filter(ds => ds.id !== id);
                    // If active was deleted, switch to default
                    const newActive = state.activeDesignSystemId === id ? 'default' : state.activeDesignSystemId;
                    return { designSystems: newSystems, activeDesignSystemId: newActive };
                });
            },
            duplicateDesignSystem: (id) => {
                set((state) => {
                    const original = state.designSystems.find(ds => ds.id === id);
                    if (!original) return {};
                    const newId = `ds-${Date.now()}`;
                    const newSystem: DesignSystem = {
                        ...original,
                        id: newId,
                        name: `${original.name} (Copy)`,
                        isDefault: false
                    };
                    return { designSystems: [...state.designSystems, newSystem], activeDesignSystemId: newId };
                });
            },


            // View Actions
            toggleGrid: () => set((state) => ({
                viewSettings: { ...state.viewSettings, showGrid: !state.viewSettings.showGrid }
            })),
            toggleSnap: () => set((state) => ({
                viewSettings: { ...state.viewSettings, snapToGrid: !state.viewSettings.snapToGrid }
            })),
            toggleMiniMap: () => set((state) => ({
                viewSettings: { ...state.viewSettings, showMiniMap: !state.viewSettings.showMiniMap }
            })),
            setShortcutsHelpOpen: (open) => set((state) => ({
                viewSettings: { ...state.viewSettings, isShortcutsHelpOpen: open }
            })),
            setViewSettings: (settings) => set((state) => ({
                viewSettings: { ...state.viewSettings, ...settings }
            })),
            setGlobalEdgeOptions: (options) => set((state) => {
                const newOptions = { ...state.globalEdgeOptions, ...options };

                // Update all existing edges
                const updatedEdges = state.edges.map(e => ({
                    ...e,
                    type: newOptions.type === 'default' ? undefined : newOptions.type, // undefined falls back to default
                    animated: newOptions.animated,
                    style: {
                        ...e.style,
                        strokeWidth: newOptions.strokeWidth,
                        ...(newOptions.color ? { stroke: newOptions.color } : {})
                    }
                }));

                return {
                    globalEdgeOptions: newOptions,
                    edges: updatedEdges,
                };
            }),
            setDefaultIconsEnabled: (enabled) => set((state) => {
                // Update preference
                const newViewSettings = { ...state.viewSettings, defaultIconsEnabled: enabled };

                // Update nodes
                const updatedNodes = state.nodes.map(node => {
                    const defaultIcon = NODE_DEFAULTS[node.type || 'process']?.icon;

                    if (enabled) {
                        // Turning ON: If no icon and no custom icon, restore default
                        if (!node.data.icon && !node.data.customIconUrl) {
                            return { ...node, data: { ...node.data, icon: defaultIcon } };
                        }
                    } else {
                        // Turning OFF: If icon matches default, remove it
                        if (node.data.icon === defaultIcon) {
                            return { ...node, data: { ...node.data, icon: undefined } };
                        }
                    }
                    return node;
                });

                return {
                    viewSettings: newViewSettings,
                    nodes: updatedNodes
                };
            }),

            setSmartRoutingEnabled: (enabled) => set((state) => {
                let newEdges = state.edges;
                if (enabled) {
                    // Apply smart routing immediately when enabled
                    newEdges = assignSmartHandles(state.nodes, state.edges);
                }
                return {
                    viewSettings: { ...state.viewSettings, smartRoutingEnabled: enabled },
                    edges: newEdges
                };
            }),

            // Brand Actions
            // Brand Actions
            setBrandConfig: (config) => set((state) => {
                const newConfig = { ...state.brandConfig, ...config };
                const updatedKits = state.brandKits.map(k =>
                    k.id === state.activeBrandKitId ? { ...k, ...config } : k
                );
                return { brandConfig: newConfig, brandKits: updatedKits };
            }),
            resetBrandConfig: () => set((state) => {
                const defaultKit = state.brandKits.find(k => k.id === 'default') || DEFAULT_BRAND_KIT;
                // Reset active to default values but keep ID? Or reset completely to default kit?
                // "Reset" usually means reset to default values.
                // If we are editing a custom kit, reset might mean "reset to default colors".
                // But generally "reset brand config" implies going back to default brand.

                // Let's make reset just switch to default kit?
                return {
                    brandConfig: defaultKit,
                    activeBrandKitId: 'default'
                };
            }),

            addBrandKit: (name: string, base?: BrandConfig) => set((state) => {
                const newId = `brand-${Date.now()}`;
                const baseConfig = base || state.brandConfig;
                const newKit: BrandKit = {
                    ...baseConfig,
                    id: newId,
                    name,
                    isDefault: false
                };
                return {
                    brandKits: [...state.brandKits, newKit],
                    activeBrandKitId: newId,
                    brandConfig: newKit
                };
            }),

            updateBrandKitName: (id: string, name: string) => set((state) => ({
                brandKits: state.brandKits.map(k => k.id === id ? { ...k, name } : k)
            })),

            deleteBrandKit: (id: string) => set((state) => {
                const kitToDelete = state.brandKits.find(k => k.id === id);
                if (!kitToDelete || kitToDelete.isDefault) return {};
                const newKits = state.brandKits.filter(k => k.id !== id);
                let newActiveId = state.activeBrandKitId;
                let newConfig = state.brandConfig;

                if (state.activeBrandKitId === id) {
                    // Switch to default if active was deleted
                    newActiveId = 'default';
                    const defaultKit = newKits.find(k => k.id === 'default') || DEFAULT_BRAND_KIT;
                    newConfig = defaultKit;
                }
                return {
                    brandKits: newKits,
                    activeBrandKitId: newActiveId,
                    brandConfig: newConfig
                };
            }),

            setActiveBrandKitId: (id: string) => set((state) => {
                const kit = state.brandKits.find(k => k.id === id);
                if (!kit) return {};
                return {
                    activeBrandKitId: id,
                    brandConfig: kit
                };
            }),

            // Selection Actions
            setSelectedNodeId: (id) => set({ selectedNodeId: id }),
            setSelectedEdgeId: (id) => set({ selectedEdgeId: id }),
        }),
        {
            name: 'openflowkit-storage', // unique name
            partialize: (state) => ({
                // Only persist these fields
                tabs: state.tabs,
                activeTabId: state.activeTabId,
                designSystems: state.designSystems,
                activeDesignSystemId: state.activeDesignSystemId,
                viewSettings: state.viewSettings,
                globalEdgeOptions: state.globalEdgeOptions,
                brandConfig: state.brandConfig,
                brandKits: state.brandKits,
                activeBrandKitId: state.activeBrandKitId,
            }),
        }
    )
);
