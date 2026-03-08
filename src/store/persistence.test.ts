import { describe, expect, it } from 'vitest';
import type { FlowEdge, FlowNode, FlowTab } from '@/lib/types';
import {
    createInitialFlowState,
    migratePersistedFlowState,
    partializePersistedFlowState,
} from './persistence';

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

describe('store persistence helpers', () => {
    it('creates the expected initial persisted runtime slice', () => {
        const state = createInitialFlowState();

        expect(state.activeTabId).toBe('tab-1');
        expect(state.tabs).toHaveLength(1);
        expect(state.layers[0]?.id).toBe('default');
        expect(state.designSystems[0]?.id).toBe('default');
        expect(state.activeBrandKitId).toBe('default');
    });

    it('partializes store state while stripping transient canvas fields from tabs', () => {
        const tab = createTab(
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
        const state = {
            ...createInitialFlowState(),
            tabs: [createInitialFlowState().tabs[0], tab],
            activeTabId: 'tab-2',
            nodes: tab.nodes,
            edges: tab.edges,
        };

        const persistedSlice = partializePersistedFlowState(state as never);
        const persistedTab = persistedSlice.tabs.find((entry) => entry.id === 'tab-2');
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

    it('migrates malformed tabs and invalid active ids to a safe fallback', () => {
        const migrated = migratePersistedFlowState({
            tabs: [{ bogus: true }],
            activeTabId: 'missing-tab',
        }) as {
            tabs: FlowTab[];
            activeTabId: string;
        };

        expect(migrated.tabs).toHaveLength(1);
        expect(migrated.tabs[0].id).toBe('tab-1');
        expect(migrated.activeTabId).toBe('tab-1');
    });

    it('rehydrates default layers and merged view settings from persisted state', () => {
        const migrated = migratePersistedFlowState({
            tabs: [
                {
                    id: 'tab-a',
                    name: 'A',
                    nodes: [createNode('na', 'A')],
                    edges: [],
                    history: { past: [], future: [] },
                },
            ],
            activeTabId: 'tab-a',
            layers: [{ id: 'infra', name: 'Infra', visible: true, locked: false }],
            viewSettings: { showGrid: false },
        }) as {
            layers: Array<{ id: string }>;
            activeLayerId: string;
            viewSettings: { showGrid: boolean; snapToGrid: boolean };
        };

        expect(migrated.layers.map((layer) => layer.id)).toEqual(['default', 'infra']);
        expect(migrated.activeLayerId).toBe('default');
        expect(migrated.viewSettings.showGrid).toBe(false);
        expect(migrated.viewSettings.snapToGrid).toBe(true);
    });
});
