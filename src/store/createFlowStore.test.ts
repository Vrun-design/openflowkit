import { describe, expect, it } from 'vitest';
import { createFlowStore } from './createFlowStore';

describe('createFlowStore', () => {
    it('creates isolated store instances', () => {
        const firstStore = createFlowStore();
        const secondStore = createFlowStore();

        firstStore.getState().setSelectedNodeId('node-a');

        expect(firstStore.getState().selectedNodeId).toBe('node-a');
        expect(secondStore.getState().selectedNodeId).toBeNull();
    });

    it('hydrates workspace state through the dedicated workspace slice', () => {
        const store = createFlowStore();
        const state = store.getState();

        expect(state.documents).toEqual([]);
        expect(state.activeDocumentId).toBe('');
        expect(state.tabs).toEqual([]);
        expect(state.activeTabId).toBe('');
        expect(typeof state.createDocument).toBe('function');
        expect(typeof state.addTab).toBe('function');
        expect(typeof state.recordHistoryV2).toBe('function');
    });

    it('hydrates canvas editor state through the dedicated canvas slice', () => {
        const store = createFlowStore();
        const state = store.getState();

        expect(state.nodes).toEqual([]);
        expect(state.edges).toEqual([]);
        expect(state.layers[0]?.id).toBe('default');
        expect(state.selectedNodeId).toBeNull();
        expect(state.pendingNodeLabelEditRequest).toBeNull();
        expect(typeof state.setNodes).toBe('function');
        expect(typeof state.setGraph).toBe('function');
        expect(typeof state.addLayer).toBe('function');
        expect(typeof state.setSelectedNodeId).toBe('function');
        expect(typeof state.setAISettings).toBe('function');
    });

    it('replaces nodes and edges atomically in the active tab', () => {
        const store = createFlowStore();
        store.setState({
            activeTabId: 'tab-1',
            tabs: [{
                id: 'tab-1', name: 'Page', diagramType: 'flowchart',
                updatedAt: '2026-08-13T00:00:00.000Z', nodes: [], edges: [],
                playback: undefined, history: { past: [], future: [] },
            }],
        });
        const nodes = [{ id: 'node', position: { x: 0, y: 0 }, data: { label: 'Node' } }] as never[];
        const edges = [{ id: 'edge', source: 'node', target: 'node' }] as never[];

        store.getState().setGraph(nodes, edges);

        expect(store.getState().nodes).toBe(nodes);
        expect(store.getState().edges).toBe(edges);
        expect(store.getState().tabs[0]).toMatchObject({ nodes, edges });
    });

    it('owns layers per page and swaps them with the active page atomically', () => {
        const store = createFlowStore();
        const first = {
            id: 'first', name: 'First', nodes: [], edges: [],
            layers: [{ id: 'first-layer', name: 'First', visible: true, locked: false }],
            history: { past: [], future: [] },
        };
        const second = {
            id: 'second', name: 'Second', nodes: [], edges: [],
            layers: [{ id: 'second-layer', name: 'Second', visible: true, locked: true }],
            history: { past: [], future: [] },
        };
        store.getState().replacePageWorkspace([first, second], 'first');
        expect(store.getState().layers[0].id).toBe('first-layer');

        store.getState().setActiveTabId('second');

        expect(store.getState().activeTabId).toBe('second');
        expect(store.getState().layers).toEqual(second.layers);
        expect(store.getState().tabs.find((tab) => tab.id === 'first')?.layers).toEqual(first.layers);
    });

    it('hydrates experience state through the dedicated experience slice', () => {
        const store = createFlowStore();
        const state = store.getState();

        expect(state.designSystems[0]?.id).toBe('default');
        expect(state.activeDesignSystemId).toBe('default');
        expect(state.viewSettings.showGrid).toBe(true);
        expect(state.globalEdgeOptions.type).toBe('bezier');
        expect(state.globalEdgeOptions.curve).toBe('basis');
        expect(typeof state.setActiveDesignSystem).toBe('function');
        expect(typeof state.setViewSettings).toBe('function');
        expect(typeof state.updateLastSaveTime).toBe('function');
    });
});
