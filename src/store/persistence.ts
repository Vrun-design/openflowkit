import { INITIAL_EDGES, INITIAL_NODES } from '@/constants';
import { DEFAULT_DIAGRAM_TYPE } from '@/services/diagramDocument';
import type { FlowTab } from '@/lib/types';
import { isDiagramType } from '@/lib/types';
import {
    DEFAULT_AI_SETTINGS,
    DEFAULT_BRAND_CONFIG,
    DEFAULT_BRAND_KIT,
    DEFAULT_DESIGN_SYSTEM,
    INITIAL_GLOBAL_EDGE_OPTIONS,
    INITIAL_LAYERS,
    INITIAL_VIEW_SETTINGS,
} from './defaults';
import type { FlowState } from './types';

export type PersistedFlowStateSlice = Pick<
    FlowState,
    | 'tabs'
    | 'activeTabId'
    | 'designSystems'
    | 'activeDesignSystemId'
    | 'viewSettings'
    | 'globalEdgeOptions'
    | 'aiSettings'
    | 'brandConfig'
    | 'brandKits'
    | 'activeBrandKitId'
    | 'layers'
    | 'activeLayerId'
>;

function createFallbackTab(): FlowTab {
    return {
        id: 'tab-1',
        name: 'Untitled Flow',
        diagramType: DEFAULT_DIAGRAM_TYPE,
        updatedAt: new Date().toISOString(),
        nodes: INITIAL_NODES,
        edges: INITIAL_EDGES,
        history: { past: [], future: [] },
    };
}

export function sanitizePersistedNode(node: FlowTab['nodes'][number]): FlowTab['nodes'][number] {
    const {
        selected: _selected,
        dragging: _dragging,
        measured: _measured,
        positionAbsolute: _positionAbsolute,
        ...persistedNode
    } = node as FlowTab['nodes'][number] & {
        measured?: unknown;
        positionAbsolute?: unknown;
    };

    return persistedNode;
}

export function sanitizePersistedEdge(edge: FlowTab['edges'][number]): FlowTab['edges'][number] {
    const { selected: _selected, ...persistedEdge } = edge;
    return persistedEdge;
}

export function sanitizePersistedTab(tab: FlowTab): FlowTab {
    return {
        ...tab,
        nodes: tab.nodes.map(sanitizePersistedNode),
        edges: tab.edges.map(sanitizePersistedEdge),
        history: {
            past: tab.history.past.map((entry) => ({
                nodes: entry.nodes.map(sanitizePersistedNode),
                edges: entry.edges.map(sanitizePersistedEdge),
            })),
            future: tab.history.future.map((entry) => ({
                nodes: entry.nodes.map(sanitizePersistedNode),
                edges: entry.edges.map(sanitizePersistedEdge),
            })),
        },
    };
}

export function normalizePersistedTab(rawTab: unknown): FlowTab | null {
    if (!rawTab || typeof rawTab !== 'object') {
        return null;
    }

    const tab = rawTab as Partial<FlowTab> & {
        history?: {
            past?: unknown;
            future?: unknown;
        };
    };

    if (typeof tab.id !== 'string' || tab.id.length === 0) {
        return null;
    }
    if (typeof tab.name !== 'string' || tab.name.length === 0) {
        return null;
    }

    return sanitizePersistedTab({
        id: tab.id,
        name: tab.name,
        diagramType: isDiagramType((tab as { diagramType?: unknown }).diagramType)
            ? (tab as { diagramType: FlowTab['diagramType'] }).diagramType
            : DEFAULT_DIAGRAM_TYPE,
        updatedAt: typeof tab.updatedAt === 'string' ? tab.updatedAt : new Date().toISOString(),
        nodes: Array.isArray(tab.nodes) ? tab.nodes : [],
        edges: Array.isArray(tab.edges) ? tab.edges : [],
        history: {
            past: Array.isArray(tab.history?.past) ? tab.history.past : [],
            future: Array.isArray(tab.history?.future) ? tab.history.future : [],
        },
    });
}

export function migratePersistedFlowState(persistedState: unknown): unknown {
    if (!persistedState || typeof persistedState !== 'object') {
        return persistedState;
    }

    const state = persistedState as Record<string, unknown>;
    const normalizedTabs = (Array.isArray(state.tabs) ? state.tabs : [])
        .map((tab) => normalizePersistedTab(tab))
        .filter((tab): tab is FlowTab => tab !== null);
    const tabs = normalizedTabs.length > 0 ? normalizedTabs : [createFallbackTab()];
    const persistedViewSettings =
        state.viewSettings && typeof state.viewSettings === 'object'
            ? (state.viewSettings as Record<string, unknown>)
            : {};
    const persistedLayers = Array.isArray(state.layers)
        ? state.layers
            .filter((layer) => layer && typeof layer === 'object')
            .map((layer) => layer as Record<string, unknown>)
            .filter((layer) =>
                typeof layer.id === 'string'
                && typeof layer.name === 'string'
                && typeof layer.visible === 'boolean'
                && typeof layer.locked === 'boolean'
            )
            .map((layer) => ({
                id: layer.id as string,
                name: layer.name as string,
                visible: layer.visible as boolean,
                locked: layer.locked as boolean,
            }))
        : [];
    const layers = persistedLayers.some((layer) => layer.id === 'default')
        ? persistedLayers
        : [...INITIAL_LAYERS, ...persistedLayers];

    return {
        ...state,
        tabs,
        activeTabId:
            typeof state.activeTabId === 'string' && tabs.some((tab) => tab.id === state.activeTabId)
                ? state.activeTabId
                : tabs[0].id,
        layers,
        activeLayerId:
            typeof state.activeLayerId === 'string' && layers.some((layer) => layer.id === state.activeLayerId)
                ? state.activeLayerId
                : 'default',
        viewSettings: {
            ...INITIAL_VIEW_SETTINGS,
            ...persistedViewSettings,
        },
    };
}

export function partializePersistedFlowState(state: FlowState): PersistedFlowStateSlice {
    return {
        tabs: state.tabs.map(sanitizePersistedTab),
        activeTabId: state.activeTabId,
        designSystems: state.designSystems,
        activeDesignSystemId: state.activeDesignSystemId,
        viewSettings: state.viewSettings,
        globalEdgeOptions: state.globalEdgeOptions,
        aiSettings: state.aiSettings,
        brandConfig: state.brandConfig,
        brandKits: state.brandKits,
        activeBrandKitId: state.activeBrandKitId,
        layers: state.layers,
        activeLayerId: state.activeLayerId,
    };
}

export function createInitialFlowState(): Pick<
    FlowState,
    | 'nodes'
    | 'edges'
    | 'tabs'
    | 'activeTabId'
    | 'designSystems'
    | 'activeDesignSystemId'
    | 'viewSettings'
    | 'globalEdgeOptions'
    | 'aiSettings'
    | 'brandConfig'
    | 'brandKits'
    | 'activeBrandKitId'
    | 'layers'
    | 'activeLayerId'
    | 'selectedNodeId'
    | 'selectedEdgeId'
    | 'pendingNodeLabelEditRequest'
    | 'mermaidDiagnostics'
> {
    return {
        nodes: INITIAL_NODES,
        edges: INITIAL_EDGES,
        tabs: [createFallbackTab()],
        activeTabId: 'tab-1',
        designSystems: [DEFAULT_DESIGN_SYSTEM],
        activeDesignSystemId: 'default',
        viewSettings: INITIAL_VIEW_SETTINGS,
        globalEdgeOptions: INITIAL_GLOBAL_EDGE_OPTIONS,
        aiSettings: DEFAULT_AI_SETTINGS,
        brandConfig: DEFAULT_BRAND_CONFIG,
        brandKits: [DEFAULT_BRAND_KIT],
        activeBrandKitId: 'default',
        layers: INITIAL_LAYERS,
        activeLayerId: 'default',
        selectedNodeId: null,
        selectedEdgeId: null,
        pendingNodeLabelEditRequest: null,
        mermaidDiagnostics: null,
    };
}
