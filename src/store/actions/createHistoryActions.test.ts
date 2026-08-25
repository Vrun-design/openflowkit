import { describe, expect, it } from 'vitest';
import { createHistoryActions } from './createHistoryActions';
import type { FlowState } from '../types';
import type { FlowNode, FlowEdge } from '@/lib/types';

function createNode(id: string): FlowNode {
  return {
    id,
    type: 'process',
    position: { x: 0, y: 0 },
    data: { label: id },
  };
}

function createEdge(id: string, source: string, target: string): FlowEdge {
  return { id, source, target };
}

function createState(snapshotCount = 0): FlowState {
  const nodes = [createNode('node-1')];
  const edges = [createEdge('edge-1', 'node-1', 'node-1')];
  const historyPast = Array.from({ length: snapshotCount }, (_, index) => ({
    nodes: [createNode(`node-${index + 2}`)],
    edges: [createEdge(`edge-${index + 2}`, `node-${index + 2}`, `node-${index + 2}`)],
  }));

  return {
    nodes,
    edges,
    documents: [],
    activeDocumentId: '',
    setDocuments: () => undefined,
    setActiveDocumentId: () => undefined,
    createDocument: () => '',
    renameDocument: () => undefined,
    duplicateDocument: () => null,
    deleteDocumentRecord: () => undefined,
    deleteDocumentRecords: () => undefined,
    tabs: [
      {
        id: 'tab-1',
        name: 'Tab 1',
        nodes,
        edges,
        playback: undefined,
        history: {
          past: historyPast,
          future: [],
        },
      },
    ],
    activeTabId: 'tab-1',
    setActiveTabId: () => undefined,
    setTabs: () => undefined,
    addTab: () => '',
    duplicateActiveTab: () => null,
    duplicateTab: () => null,
    reorderTab: () => undefined,
    deleteTab: () => undefined,
    closeTab: () => undefined,
    updateTab: () => undefined,
    replacePageWorkspace: () => undefined,
    copySelectedToTab: () => 0,
    moveSelectedToTab: () => 0,
    onNodesChange: () => undefined,
    onEdgesChange: () => undefined,
    setNodes: () => undefined,
    setEdges: () => undefined,
    setGraph: () => undefined,
    setGraphAndLayers: () => undefined,
    onConnect: () => undefined,
    recordHistoryV2: () => undefined,
    undoV2: () => undefined,
    redoV2: () => undefined,
    scrubHistoryV2: () => undefined,
    canUndoV2: () => false,
    canRedoV2: () => false,
    runContextualEditorCommand: () => false,
    designSystems: [],
    activeDesignSystemId: '',
    globalEdgeOptions: { type: 'smoothstep', animated: false, strokeWidth: 2 },
    setActiveDesignSystem: () => undefined,
    addDesignSystem: () => undefined,
    updateDesignSystem: () => undefined,
    deleteDesignSystem: () => undefined,
    duplicateDesignSystem: () => undefined,
    setGlobalEdgeOptions: () => undefined,
    viewSettings: {
      showGrid: true,
      snapToGrid: false,
      alignmentGuidesEnabled: true,
      isShortcutsHelpOpen: false,
      defaultIconsEnabled: true,
      smartRoutingEnabled: true,
      smartRoutingProfile: 'standard',
      smartRoutingBundlingEnabled: false,
      architectureStrictMode: false,
      mermaidImportMode: 'renderer_first',
      largeGraphSafetyMode: 'auto',
      largeGraphSafetyProfile: 'balanced',
      exportSerializationMode: 'deterministic',
      language: 'en',
      lintRules: '',
    },
    toggleGrid: () => undefined,
    toggleSnap: () => undefined,
    setShortcutsHelpOpen: () => undefined,
    setViewSettings: () => undefined,
    setDefaultIconsEnabled: () => undefined,
    setSmartRoutingEnabled: () => undefined,
    setSmartRoutingProfile: () => undefined,
    setSmartRoutingBundlingEnabled: () => undefined,
    setLargeGraphSafetyMode: () => undefined,
    setLargeGraphSafetyProfile: () => undefined,
    aiSettings: { provider: 'gemini', storageMode: 'local', customHeaders: [] },
    setAISettings: () => undefined,
    layers: [],
    activeLayerId: '',
    addLayer: () => '',
    renameLayer: () => undefined,
    deleteLayer: () => undefined,
    setActiveLayerId: () => undefined,
    toggleLayerVisibility: () => undefined,
    toggleLayerLock: () => undefined,
    moveLayer: () => undefined,
    moveSelectedNodesToLayer: () => undefined,
    selectNodesInLayer: () => undefined,
    selectedNodeId: null,
    selectedEdgeId: null,
    hoveredSectionId: null,
    pendingNodeLabelEditRequest: null,
    mermaidDiagnostics: null,
    setSelectedNodeId: () => undefined,
    setSelectedEdgeId: () => undefined,
    setHoveredSectionId: () => undefined,
    queuePendingNodeLabelEditRequest: () => undefined,
    clearPendingNodeLabelEditRequest: () => undefined,
    setMermaidDiagnostics: () => undefined,
    clearMermaidDiagnostics: () => undefined,
    lastUpdateTime: 0,
    updateLastSaveTime: () => undefined,
  };
}

describe('createHistoryActions', () => {
  it('records history for the active tab', () => {
    let nextState: Partial<FlowState> = {};
    const state = createState();
    const actions = createHistoryActions(
      (updater) => {
        nextState = typeof updater === 'function' ? updater(state) : updater;
      },
      () => state
    );

    actions.recordHistoryV2();

    expect(nextState.tabs?.[0]?.history.past).toHaveLength(1);
  });

  it('keeps history bounded when many snapshots accumulate', () => {
    let nextState: Partial<FlowState> = {};
    const state = createState(25);
    const actions = createHistoryActions(
      (updater) => {
        nextState = typeof updater === 'function' ? updater(state) : updater;
      },
      () => state
    );

    actions.recordHistoryV2();

    expect(nextState.tabs?.[0]?.history.past.length).toBeLessThanOrEqual(20);
  });

  it('restores canonical layer state with graph undo', () => {
    let nextState: Partial<FlowState> = {};
    const state = createState();
    state.layers = [{ id: 'locked', name: 'Locked', visible: true, locked: true }];
    state.tabs[0].history.past = [
      {
        nodes: state.nodes,
        edges: state.edges,
        layers: [{ id: 'default', name: 'Default', visible: true, locked: false }],
      },
    ];
    const actions = createHistoryActions(
      (updater) => {
        nextState = typeof updater === 'function' ? updater(state) : updater;
      },
      () => state
    );

    actions.undoV2();

    expect(nextState.layers).toEqual([
      { id: 'default', name: 'Default', visible: true, locked: false },
    ]);
  });

  it('records and restores canvas extensions with graph history', () => {
    let nextState: Partial<FlowState> = {};
    const state = createState();
    state.tabs[0].canvasExtensions = { openCanvasPrecision: { gridSize: 25 } };
    const actions = createHistoryActions(
      (updater) => {
        nextState = typeof updater === 'function' ? updater(state) : updater;
      },
      () => state
    );

    actions.recordHistoryV2();
    expect(nextState.tabs?.[0]?.history.past[0]?.canvasExtensions).toEqual(
      state.tabs[0].canvasExtensions
    );

    state.tabs[0].history.past = [
      {
        nodes: state.nodes,
        edges: state.edges,
        canvasExtensions: { openCanvasPrecision: { gridSize: 10 } },
      },
    ];
    actions.undoV2();
    expect(nextState.tabs?.[0]?.canvasExtensions).toEqual({
      openCanvasPrecision: { gridSize: 10 },
    });
  });

  it('scrubs atomically across the complete history timeline', () => {
    let state = createState();
    const earliest = {
      nodes: [createNode('earliest')],
      edges: [createEdge('earliest-edge', 'earliest', 'earliest')],
      layers: [{ id: 'early', name: 'Early', visible: true, locked: false }],
      canvasExtensions: { openCanvasPrecision: { gridSize: 8 } },
    };
    const latest = {
      nodes: [createNode('latest')],
      edges: [createEdge('latest-edge', 'latest', 'latest')],
      layers: [{ id: 'late', name: 'Late', visible: true, locked: false }],
      canvasExtensions: { openCanvasPrecision: { gridSize: 32 } },
    };
    state.tabs[0].history = { past: [earliest], future: [latest] };
    const actions = createHistoryActions(
      (updater) => {
        const partial = typeof updater === 'function' ? updater(state) : updater;
        state = { ...state, ...partial };
      },
      () => state
    );

    actions.scrubHistoryV2(0);
    expect(state.nodes[0].id).toBe('earliest');
    expect(state.layers[0].id).toBe('early');
    expect(state.tabs[0].canvasExtensions).toEqual(earliest.canvasExtensions);
    expect(state.tabs[0].history).toMatchObject({ past: [], future: expect.any(Array) });

    actions.scrubHistoryV2(2);
    expect(state.nodes[0].id).toBe('latest');
    expect(state.layers[0].id).toBe('late');
    expect(state.tabs[0].history.future).toEqual([]);
    expect(state.tabs[0].history.past).toHaveLength(2);
  });
});
