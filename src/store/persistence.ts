import { DEFAULT_DIAGRAM_TYPE } from '@/services/diagramDocument';
import { clonePlaybackState, sanitizePlaybackState } from '@/services/playback/model';
import type { FlowTab } from '@/lib/types';
import { isDiagramType } from '@/lib/types';
import { sanitizeAISettings } from './aiSettings';
import { loadPersistedAISettings, persistAISettings } from './aiSettingsPersistence';
import { withSectionDefaults, ensureParentsBeforeChildren } from '@/hooks/node-operations/utils';
import {
  DEFAULT_DESIGN_SYSTEM,
  INITIAL_GLOBAL_EDGE_OPTIONS,
  INITIAL_LAYERS,
  INITIAL_VIEW_SETTINGS,
} from './defaults';
import type { FlowState } from './types';

export type PersistedFlowStateSlice = Pick<
  FlowState,
  | 'designSystems'
  | 'activeDesignSystemId'
  | 'viewSettings'
  | 'globalEdgeOptions'
  | 'layers'
  | 'activeLayerId'
>;

const DEFAULT_DESIGN_SYSTEM_ID = 'default';
const DEFAULT_LAYER_ID = 'default';
const EMPTY_WORKSPACE_ID = '';

function nowIso(): string {
  return new Date().toISOString();
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

  return withSectionDefaults(persistedNode);
}

export function sanitizePersistedEdge(edge: FlowTab['edges'][number]): FlowTab['edges'][number] {
  const { selected: _selected, ...persistedEdge } = edge;
  return persistedEdge;
}

export function sanitizePersistedTab(tab: FlowTab): FlowTab {
  return {
    ...tab,
    nodes: ensureParentsBeforeChildren(tab.nodes.map(sanitizePersistedNode)),
    edges: tab.edges.map(sanitizePersistedEdge),
    playback: clonePlaybackState(tab.playback),
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
    updatedAt: typeof tab.updatedAt === 'string' ? tab.updatedAt : nowIso(),
    nodes: Array.isArray(tab.nodes) ? tab.nodes : [],
    edges: Array.isArray(tab.edges) ? tab.edges : [],
    playback: sanitizePlaybackState(tab.playback),
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
  const tabs = (Array.isArray(state.tabs) ? state.tabs : [])
    .map((tab) => normalizePersistedTab(tab))
    .filter((tab): tab is FlowTab => tab !== null);
  const persistedViewSettings =
    state.viewSettings && typeof state.viewSettings === 'object'
      ? (state.viewSettings as Record<string, unknown>)
      : {};
  const persistedLayers = Array.isArray(state.layers)
    ? state.layers
        .filter((layer) => layer && typeof layer === 'object')
        .map((layer) => layer as Record<string, unknown>)
        .filter(
          (layer) =>
            typeof layer.id === 'string' &&
            typeof layer.name === 'string' &&
            typeof layer.visible === 'boolean' &&
            typeof layer.locked === 'boolean'
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
  const persistedAiSettings =
    state.aiSettings && typeof state.aiSettings === 'object'
      ? (state.aiSettings as Partial<FlowState['aiSettings']>)
      : undefined;
  const migratedAISettings = sanitizeAISettings(persistedAiSettings, loadPersistedAISettings());
  if (persistedAiSettings) {
    persistAISettings(migratedAISettings);
  }

  return {
    ...state,
    documents: Array.isArray(state.documents) ? state.documents : [],
    activeDocumentId:
      typeof state.activeDocumentId === 'string' ? state.activeDocumentId : EMPTY_WORKSPACE_ID,
    tabs,
    activeTabId:
      typeof state.activeTabId === 'string' && tabs.some((tab) => tab.id === state.activeTabId)
        ? state.activeTabId
        : EMPTY_WORKSPACE_ID,
    layers,
    activeLayerId:
      typeof state.activeLayerId === 'string' &&
      layers.some((layer) => layer.id === state.activeLayerId)
        ? state.activeLayerId
        : DEFAULT_LAYER_ID,
    viewSettings: {
      ...INITIAL_VIEW_SETTINGS,
      ...persistedViewSettings,
    },
    aiSettings: migratedAISettings,
  };
}

export function partializePersistedFlowState(state: FlowState): PersistedFlowStateSlice {
  return {
    designSystems: state.designSystems,
    activeDesignSystemId: state.activeDesignSystemId,
    viewSettings: state.viewSettings,
    globalEdgeOptions: state.globalEdgeOptions,
    layers: state.layers,
    activeLayerId: state.activeLayerId,
  };
}

export function createInitialFlowState(): Pick<
  FlowState,
  | 'nodes'
  | 'edges'
  | 'documents'
  | 'activeDocumentId'
  | 'tabs'
  | 'activeTabId'
  | 'designSystems'
  | 'activeDesignSystemId'
  | 'viewSettings'
  | 'globalEdgeOptions'
  | 'aiSettings'
  | 'layers'
  | 'activeLayerId'
  | 'selectedNodeId'
  | 'selectedEdgeId'
  | 'hoveredSectionId'
  | 'pendingNodeLabelEditRequest'
  | 'mermaidDiagnostics'
  | 'lastUpdateTime'
> {
  return {
    nodes: [],
    edges: [],
    documents: [],
    activeDocumentId: EMPTY_WORKSPACE_ID,
    tabs: [],
    activeTabId: EMPTY_WORKSPACE_ID,
    designSystems: [DEFAULT_DESIGN_SYSTEM],
    activeDesignSystemId: DEFAULT_DESIGN_SYSTEM_ID,
    viewSettings: INITIAL_VIEW_SETTINGS,
    globalEdgeOptions: INITIAL_GLOBAL_EDGE_OPTIONS,
    aiSettings: loadPersistedAISettings(),
    layers: INITIAL_LAYERS,
    activeLayerId: DEFAULT_LAYER_ID,
    selectedNodeId: null,
    selectedEdgeId: null,
    hoveredSectionId: null,
    pendingNodeLabelEditRequest: null,
    mermaidDiagnostics: null,
    lastUpdateTime: Date.now(),
  };
}
