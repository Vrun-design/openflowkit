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
        playback: undefined,
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

    it('preserves sanitized playback state in persisted tabs', () => {
        const tab = createTab('tab-2', 'Tab 2', [createNode('n2', 'Recovered Tab 2')], []);
        tab.playback = {
            version: 1,
            scenes: [{ id: 'scene-1', name: 'Intro', stepIds: ['step-1'] }],
            timeline: [{ id: 'step-1', nodeId: 'n2', durationMs: 1200 }],
            selectedSceneId: 'scene-1',
            defaultStepDurationMs: 1500,
        };

        const persistedSlice = partializePersistedFlowState({
            ...createInitialFlowState(),
            tabs: [tab],
            activeTabId: 'tab-2',
            nodes: tab.nodes,
            edges: tab.edges,
        } as never);

        expect(persistedSlice.tabs[0].playback?.timeline[0]?.nodeId).toBe('n2');

        const migrated = migratePersistedFlowState({
            tabs: [persistedSlice.tabs[0]],
            activeTabId: 'tab-2',
        }) as {
            tabs: FlowTab[];
        };

        expect(migrated.tabs[0].playback?.scenes[0]?.name).toBe('Intro');
        expect(migrated.tabs[0].playback?.selectedSceneId).toBe('scene-1');
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

    it('sanitizes persisted ai settings during migration', () => {
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
            aiSettings: {
                provider: 'invalid-provider',
                apiKey: '  secret  ',
                customHeaders: [
                    { key: ' Authorization ', value: 'Bearer token', enabled: true },
                    { key: '', value: 'skip-me' },
                ],
            },
        }) as {
            aiSettings: {
                provider: string;
                apiKey?: string;
                customHeaders?: Array<{ key: string; value: string; enabled?: boolean }>;
            };
        };

        expect(migrated.aiSettings.provider).toBe('gemini');
        expect(migrated.aiSettings.apiKey).toBe('secret');
        expect(migrated.aiSettings.customHeaders).toEqual([
            { key: 'Authorization', value: 'Bearer token', enabled: true },
        ]);
    });
});
