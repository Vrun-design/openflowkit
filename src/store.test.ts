import { beforeEach, describe, expect, it } from 'vitest';
import type { FlowEdge, FlowNode, FlowTab } from '@/lib/types';
import { useFlowStore } from './store';
import { sanitizePersistedTab } from './store/persistence';

function createNode(id: string, label: string): FlowNode {
    return {
        id,
        type: 'process',
        position: { x: 0, y: 0 },
        data: { label, subLabel: '', color: 'slate' },
    };
}

function createEdge(id: string, source: string, target: string): FlowEdge {
    return { id, source, target };
}

function createTab(id: string, name: string, nodes: FlowNode[], edges: FlowEdge[]): FlowTab {
    return {
        id,
        name,
        nodes,
        edges,
        history: { past: [], future: [] },
    };
}

describe('flow store tab actions', () => {
    beforeEach(() => {
        const nodes = [createNode('n1', 'Base')];
        const edges = [createEdge('e1', 'n1', 'n1')];
        const tab = createTab('tab-1', 'Tab 1', nodes, edges);

        useFlowStore.setState({
            nodes,
            edges,
            tabs: [tab],
            activeTabId: 'tab-1',
        });
    });

    it('addTab creates and activates a new tab', () => {
        const { addTab } = useFlowStore.getState();
        const newId = addTab();
        const state = useFlowStore.getState();

        expect(newId).toMatch(/^tab-/);
        expect(state.activeTabId).toBe(newId);
        expect(state.tabs.some((tab) => tab.id === newId)).toBe(true);
    });

    it('setActiveTabId persists current tab content before switching', () => {
        const secondTab = createTab('tab-2', 'Tab 2', [createNode('n2', 'Second')], []);
        useFlowStore.setState((state) => ({
            tabs: [...state.tabs, secondTab],
            nodes: [createNode('n1-updated', 'Updated')],
            edges: [createEdge('e1-updated', 'n1-updated', 'n1-updated')],
            activeTabId: 'tab-1',
        }));

        useFlowStore.getState().setActiveTabId('tab-2');
        const state = useFlowStore.getState();
        const firstTab = state.tabs.find((tab) => tab.id === 'tab-1');

        expect(firstTab?.nodes[0].id).toBe('n1-updated');
        expect(firstTab?.edges[0].id).toBe('e1-updated');
        expect(state.activeTabId).toBe('tab-2');
        expect(state.nodes[0].id).toBe('n2');
    });

    it('setActiveTabId keeps each tab state isolated across repeated switches', () => {
        const tab2 = createTab('tab-2', 'Tab 2', [createNode('n2', 'Second')], []);
        const tab3 = createTab('tab-3', 'Tab 3', [createNode('n3', 'Third')], []);

        useFlowStore.setState((state) => ({
            tabs: [...state.tabs, tab2, tab3],
            activeTabId: 'tab-1',
            nodes: [createNode('n1-edit', 'Edited Tab 1')],
            edges: [createEdge('e1-edit', 'n1-edit', 'n1-edit')],
        }));

        useFlowStore.getState().setActiveTabId('tab-2');
        useFlowStore.getState().setNodes([createNode('n2-edit', 'Edited Tab 2')]);
        useFlowStore.getState().setEdges([createEdge('e2-edit', 'n2-edit', 'n2-edit')]);

        useFlowStore.getState().setActiveTabId('tab-3');
        useFlowStore.getState().setNodes([createNode('n3-edit', 'Edited Tab 3')]);
        useFlowStore.getState().setEdges([createEdge('e3-edit', 'n3-edit', 'n3-edit')]);

        useFlowStore.getState().setActiveTabId('tab-1');
        let state = useFlowStore.getState();
        expect(state.nodes[0].id).toBe('n1-edit');
        expect(state.edges[0].id).toBe('e1-edit');

        useFlowStore.getState().setActiveTabId('tab-2');
        state = useFlowStore.getState();
        expect(state.nodes[0].id).toBe('n2-edit');
        expect(state.edges[0].id).toBe('e2-edit');

        useFlowStore.getState().setActiveTabId('tab-3');
        state = useFlowStore.getState();
        expect(state.nodes[0].id).toBe('n3-edit');
        expect(state.edges[0].id).toBe('e3-edit');
    });

    it('duplicates active tab with cloned nodes and edges', () => {
        useFlowStore.setState({
            nodes: [createNode('n-active', 'Active')],
            edges: [createEdge('e-active', 'n-active', 'n-active')],
        });

        const newTabId = useFlowStore.getState().duplicateActiveTab();
        const state = useFlowStore.getState();
        const duplicated = state.tabs.find((tab) => tab.id === newTabId);

        expect(newTabId).toBeTruthy();
        expect(state.activeTabId).toBe(newTabId);
        expect(duplicated?.name).toContain('Copy');
        expect(duplicated?.nodes).toHaveLength(1);
        expect(duplicated?.edges).toHaveLength(1);
        expect(duplicated?.nodes[0].id).toBe('n-active');
        expect(duplicated?.nodes[0].selected).toBe(false);
    });

    it('copies selected nodes and connected edges to another tab', () => {
        const tab2 = createTab('tab-2', 'Tab 2', [], []);
        useFlowStore.setState((state) => ({
            tabs: [...state.tabs, tab2],
            nodes: [
                { ...createNode('n1', 'Node A'), selected: true },
                { ...createNode('n2', 'Node B'), selected: true },
                { ...createNode('n3', 'Node C'), selected: false },
            ],
            edges: [
                { ...createEdge('e1', 'n1', 'n2'), selected: true },
                { ...createEdge('e2', 'n2', 'n3'), selected: false },
            ],
            activeTabId: 'tab-1',
        }));

        const copiedCount = useFlowStore.getState().copySelectedToTab('tab-2');
        const state = useFlowStore.getState();
        const target = state.tabs.find((tab) => tab.id === 'tab-2');

        expect(copiedCount).toBe(2);
        expect(target?.nodes).toHaveLength(2);
        expect(target?.edges).toHaveLength(1);
        expect(target?.nodes.every((node) => node.selected === false)).toBe(true);
        expect(target?.edges[0].source).not.toBe('n1');
        expect(target?.edges[0].target).not.toBe('n2');
    });

    it('moves selected nodes and connected edges to another tab', () => {
        const tab2 = createTab('tab-2', 'Tab 2', [], []);
        useFlowStore.setState((state) => ({
            tabs: [...state.tabs, tab2],
            nodes: [
                { ...createNode('n1', 'Node A'), selected: true },
                { ...createNode('n2', 'Node B'), selected: true },
                { ...createNode('n3', 'Node C'), selected: false },
            ],
            edges: [
                { ...createEdge('e1', 'n1', 'n2'), selected: true },
                { ...createEdge('e2', 'n2', 'n3'), selected: false },
            ],
            activeTabId: 'tab-1',
        }));

        const movedCount = useFlowStore.getState().moveSelectedToTab('tab-2');
        const state = useFlowStore.getState();
        const source = state.tabs.find((tab) => tab.id === 'tab-1');
        const target = state.tabs.find((tab) => tab.id === 'tab-2');

        expect(movedCount).toBe(2);
        expect(source?.nodes.map((node) => node.id)).toEqual(['n3']);
        expect(source?.edges).toHaveLength(0);
        expect(target?.nodes.map((node) => node.id).sort()).toEqual(['n1', 'n2']);
        expect(target?.edges).toHaveLength(1);
        expect(state.nodes.map((node) => node.id)).toEqual(['n3']);
    });

    it('setActiveTabId is a no-op when switching to the already active tab', () => {
        const tab2 = createTab('tab-2', 'Tab 2', [createNode('n2', 'Second')], []);
        useFlowStore.setState((state) => ({
            tabs: [...state.tabs, tab2],
            activeTabId: 'tab-1',
            nodes: [createNode('n1-live', 'Live Canvas')],
            edges: [createEdge('e1-live', 'n1-live', 'n1-live')],
        }));

        const before = useFlowStore.getState();
        const beforeTab1 = before.tabs.find((tab) => tab.id === 'tab-1');
        const beforeTab1NodeId = beforeTab1?.nodes[0]?.id;
        const beforeCanvasNodeId = before.nodes[0]?.id;
        const beforeCanvasEdgeId = before.edges[0]?.id;

        useFlowStore.getState().setActiveTabId('tab-1');

        const after = useFlowStore.getState();
        const afterTab1 = after.tabs.find((tab) => tab.id === 'tab-1');

        expect(after.activeTabId).toBe('tab-1');
        expect(after.nodes[0].id).toBe(beforeCanvasNodeId);
        expect(after.edges[0].id).toBe(beforeCanvasEdgeId);
        expect(afterTab1?.nodes[0]?.id).toBe(beforeTab1NodeId);
    });

    it('does not persist durable tab state in the main zustand slice', () => {
        const tab2 = createTab('tab-2', 'Tab 2', [createNode('n2', 'Recovered Tab 2')], [createEdge('e2', 'n2', 'n2')]);

        useFlowStore.setState((state) => ({
            tabs: [state.tabs[0], tab2],
            activeTabId: 'tab-2',
            nodes: tab2.nodes,
            edges: tab2.edges,
        }));

        const persistedSlice = useFlowStore.persist.getOptions().partialize(useFlowStore.getState()) as Record<string, unknown>;
        expect('tabs' in persistedSlice).toBe(false);
        expect('activeTabId' in persistedSlice).toBe(false);
    });

    it('strips transient canvas fields from sanitized tab payloads', () => {
        const tab2 = createTab(
            'tab-2',
            'Tab 2',
            [
                {
                    ...createNode('n2', 'Recovered Tab 2'),
                    selected: true,
                    dragging: true,
                    measured: { width: 180, height: 96 },
                    positionAbsolute: { x: 50, y: 60 },
                } as FlowNode,
            ],
            [{ ...createEdge('e2', 'n2', 'n2'), selected: true }]
        );

        useFlowStore.setState((state) => ({
            tabs: [state.tabs[0], tab2],
            activeTabId: 'tab-2',
            nodes: tab2.nodes,
            edges: tab2.edges,
        }));

        const persistedTab = sanitizePersistedTab(tab2);
        const persistedNode = persistedTab?.nodes[0] as FlowNode & {
            measured?: unknown;
            positionAbsolute?: unknown;
        };
        const persistedEdge = persistedTab?.edges[0];

        expect(persistedNode.selected).toBeUndefined();
        expect(persistedNode.dragging).toBeUndefined();
        expect(persistedNode.measured).toBeUndefined();
        expect(persistedNode.positionAbsolute).toBeUndefined();
        expect(persistedEdge?.selected).toBeUndefined();
    });

    it('setActiveDocumentId is a no-op when the active document is already loaded', () => {
        const nodes = [createNode('n-doc', 'Loaded Document')];
        const edges = [createEdge('e-doc', 'n-doc', 'n-doc')];
        const page = createTab('doc-1:page:1', 'Page 1', nodes, edges);
        const document = {
            id: 'doc-1',
            name: 'Doc 1',
            createdAt: '2026-03-27T00:00:00.000Z',
            updatedAt: '2026-03-27T00:00:00.000Z',
            activePageId: page.id,
            pages: [page],
        };

        useFlowStore.setState({
            documents: [document],
            activeDocumentId: 'doc-1',
            tabs: document.pages,
            activeTabId: page.id,
            nodes,
            edges,
        });

        const before = useFlowStore.getState();
        useFlowStore.getState().setActiveDocumentId('doc-1');
        const after = useFlowStore.getState();

        expect(after.documents).toBe(before.documents);
        expect(after.tabs).toBe(before.tabs);
        expect(after.nodes).toBe(before.nodes);
        expect(after.edges).toBe(before.edges);
    });

    it('migrates legacy persisted tabs by adding missing history fields', async () => {
        const migrate = useFlowStore.persist.getOptions().migrate;
        expect(migrate).toBeDefined();

        const legacyPersisted = {
            tabs: [
                {
                    id: 'tab-legacy',
                    name: 'Legacy',
                    nodes: [createNode('n-legacy', 'Legacy Node')],
                    edges: [createEdge('e-legacy', 'n-legacy', 'n-legacy')],
                },
            ],
            activeTabId: 'tab-legacy',
        };

        const migrated = await Promise.resolve(migrate?.(legacyPersisted, 0));
        const state = migrated as {
            tabs: FlowTab[];
            activeTabId: string;
        };

        expect(state.tabs).toHaveLength(1);
        expect(state.tabs[0].history.past).toEqual([]);
        expect(state.tabs[0].history.future).toEqual([]);
        expect(state.activeTabId).toBe('tab-legacy');
    });

    it('migrates invalid persisted activeTabId to a valid tab id', async () => {
        const migrate = useFlowStore.persist.getOptions().migrate;
        expect(migrate).toBeDefined();

        const legacyPersisted = {
            tabs: [
                {
                    id: 'tab-a',
                    name: 'A',
                    nodes: [createNode('na', 'A')],
                    edges: [],
                    history: { past: [], future: [] },
                },
            ],
            activeTabId: 'missing-tab',
        };

        const migrated = await Promise.resolve(migrate?.(legacyPersisted, 0));
        const state = migrated as {
            tabs: FlowTab[];
            activeTabId: string;
        };

        expect(state.activeTabId).toBe('');
    });

    it('migrates malformed persisted tabs to a safe fallback tab', async () => {
        const migrate = useFlowStore.persist.getOptions().migrate;
        expect(migrate).toBeDefined();

        const legacyPersisted = {
            tabs: [{ bogus: true }],
            activeTabId: 'tab-unknown',
        };

        const migrated = await Promise.resolve(migrate?.(legacyPersisted, 0));
        const state = migrated as {
            tabs: FlowTab[];
            activeTabId: string;
        };

        expect(state.tabs).toHaveLength(0);
        expect(state.activeTabId).toBe('');
    });
});

describe('flow store Mermaid diagnostics contract', () => {
    it('sets and clears diagnostics snapshot', () => {
        useFlowStore.setState({ mermaidDiagnostics: null });

        useFlowStore.getState().setMermaidDiagnostics({
            source: 'paste',
            diagramType: 'flowchart',
            diagnostics: [
                {
                    message: 'Sample diagnostic',
                    line: 2,
                },
            ],
            error: 'Sample error',
            updatedAt: 123,
        });

        let state = useFlowStore.getState();
        expect(state.mermaidDiagnostics).toBeTruthy();
        expect(state.mermaidDiagnostics?.source).toBe('paste');
        expect(state.mermaidDiagnostics?.diagnostics).toHaveLength(1);
        expect(state.mermaidDiagnostics?.error).toBe('Sample error');

        state.clearMermaidDiagnostics();
        state = useFlowStore.getState();
        expect(state.mermaidDiagnostics).toBeNull();
    });
});

describe('flow store layer actions', () => {
    beforeEach(() => {
        const nodes = [
            createNode('n1', 'Node 1'),
            createNode('n2', 'Node 2'),
        ];
        nodes[0].selected = true;
        nodes[1].selected = false;
        nodes[0].data.layerId = 'default';
        nodes[1].data.layerId = 'default';

        useFlowStore.setState({
            nodes,
            edges: [],
            selectedNodeId: null,
            selectedEdgeId: null,
            layers: [
                { id: 'default', name: 'Default', visible: true, locked: false },
            ],
            activeLayerId: 'default',
        });
    });

    it('moves selected nodes to a target layer and selects nodes in that layer', () => {
        const layerId = useFlowStore.getState().addLayer('Infra');
        useFlowStore.getState().moveSelectedNodesToLayer(layerId);

        let state = useFlowStore.getState();
        const moved = state.nodes.find((node) => node.id === 'n1');
        const untouched = state.nodes.find((node) => node.id === 'n2');

        expect(moved?.data.layerId).toBe(layerId);
        expect(untouched?.data.layerId).toBe('default');

        useFlowStore.getState().selectNodesInLayer(layerId);
        state = useFlowStore.getState();

        expect(state.nodes.find((node) => node.id === 'n1')?.selected).toBe(true);
        expect(state.nodes.find((node) => node.id === 'n2')?.selected).toBe(false);
        expect(state.selectedNodeId).toBe('n1');
    });

    it('toggles layer visibility/lock and reassigns nodes to default on delete', () => {
        const layerId = useFlowStore.getState().addLayer('Ops');
        useFlowStore.getState().moveSelectedNodesToLayer(layerId);
        useFlowStore.getState().toggleLayerVisibility(layerId);
        useFlowStore.getState().toggleLayerLock(layerId);

        let state = useFlowStore.getState();
        const toggledLayer = state.layers.find((layer) => layer.id === layerId);
        expect(toggledLayer?.visible).toBe(false);
        expect(toggledLayer?.locked).toBe(true);

        useFlowStore.getState().deleteLayer(layerId);
        state = useFlowStore.getState();

        expect(state.layers.some((layer) => layer.id === layerId)).toBe(false);
        expect(state.nodes.find((node) => node.id === 'n1')?.data.layerId).toBe('default');
        expect(state.activeLayerId).toBe('default');
    });
});
