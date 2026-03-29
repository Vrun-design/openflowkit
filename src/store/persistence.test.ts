import { describe, expect, it, vi } from 'vitest';
import type { FlowEdge, FlowNode, FlowTab } from '@/lib/types';
import {
    createInitialFlowState,
    migratePersistedFlowState,
    partializePersistedFlowState,
    sanitizePersistedTab,
} from './persistence';
import * as aiSettingsPersistence from './aiSettingsPersistence';

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
        const loadPersistedAISettingsSpy = vi.spyOn(aiSettingsPersistence, 'loadPersistedAISettings').mockReturnValue({
            provider: 'openai',
            storageMode: 'local',
            apiKey: 'persisted-key',
            model: 'gpt-test',
            customBaseUrl: undefined,
            customHeaders: [],
        });
        const state = createInitialFlowState();

        expect(state.activeDocumentId).toBe('');
        expect(state.activeTabId).toBe('');
        expect(state.documents).toHaveLength(0);
        expect(state.tabs).toHaveLength(0);
        expect(state.nodes).toHaveLength(0);
        expect(state.edges).toHaveLength(0);
        expect(state.layers[0]?.id).toBe('default');
        expect(state.designSystems[0]?.id).toBe('default');
        expect(state.aiSettings.provider).toBe('openai');
        expect(state.aiSettings.apiKey).toBe('persisted-key');

        loadPersistedAISettingsSpy.mockRestore();
    });

    it('sanitizes tab content while stripping transient canvas fields', () => {
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
        const persistedTab = sanitizePersistedTab(tab);
        const persistedNode = persistedTab.nodes[0] as FlowNode & {
            measured?: unknown;
            positionAbsolute?: unknown;
        };
        const persistedEdge = persistedTab.edges[0];

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

        const persistedTab = sanitizePersistedTab(tab);

        expect(persistedTab.playback?.timeline[0]?.nodeId).toBe('n2');

        const migrated = migratePersistedFlowState({
            tabs: [persistedTab],
            activeTabId: 'tab-2',
        }) as {
            tabs: FlowTab[];
        };

        expect(migrated.tabs[0].playback?.scenes[0]?.name).toBe('Intro');
        expect(migrated.tabs[0].playback?.selectedSceneId).toBe('scene-1');
    });

    it('migrates malformed tabs and invalid active ids to a safe empty state', () => {
        const migrated = migratePersistedFlowState({
            tabs: [{ bogus: true }],
            activeTabId: 'missing-tab',
        }) as {
            tabs: FlowTab[];
            activeTabId: string;
        };

        expect(migrated.tabs).toHaveLength(0);
        expect(migrated.activeTabId).toBe('');
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

    it('upgrades legacy section nodes with frame metadata defaults', () => {
        const migrated = migratePersistedFlowState({
            tabs: [
                {
                    id: 'tab-a',
                    name: 'A',
                    nodes: [
                        {
                            id: 'section-1',
                            type: 'section',
                            position: { x: 20, y: 30 },
                            data: { label: 'Legacy Section' },
                            style: { width: 500, height: 400 },
                        },
                    ],
                    edges: [],
                    history: { past: [], future: [] },
                },
            ],
            activeTabId: 'tab-a',
        }) as {
            tabs: FlowTab[];
        };

        const migratedSection = migrated.tabs[0]?.nodes[0];
        expect(migratedSection?.data.sectionSizingMode).toBe('manual');
        expect(migratedSection?.data.sectionLayoutMode).toBe('freeform');
        expect(migratedSection?.data.sectionLocked).toBe(false);
        expect(migratedSection?.data.sectionHidden).toBe(false);
    });

    it('sanitizes persisted ai settings during migration', () => {
        const loadPersistedAISettingsSpy = vi.spyOn(aiSettingsPersistence, 'loadPersistedAISettings').mockReturnValue({
            provider: 'gemini',
            storageMode: 'local',
            apiKey: undefined,
            model: undefined,
            customBaseUrl: undefined,
            customHeaders: [],
        });
        const persistAISettingsSpy = vi.spyOn(aiSettingsPersistence, 'persistAISettings').mockImplementation(() => undefined);
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
        expect(persistAISettingsSpy).toHaveBeenCalledWith({
            provider: 'gemini',
            storageMode: 'local',
            apiKey: 'secret',
            model: undefined,
            customBaseUrl: undefined,
            customHeaders: [
                { key: 'Authorization', value: 'Bearer token', enabled: true },
            ],
        });

        loadPersistedAISettingsSpy.mockRestore();
        persistAISettingsSpy.mockRestore();
    });

    it('does not include aiSettings in the main persisted flow slice', () => {
        const persistedSlice = partializePersistedFlowState(createInitialFlowState() as never);

        expect('aiSettings' in persistedSlice).toBe(false);
    });

    it('does not include durable document state in the main persisted flow slice', () => {
        const persistedSlice = partializePersistedFlowState(createInitialFlowState() as never);

        expect('tabs' in persistedSlice).toBe(false);
        expect('activeTabId' in persistedSlice).toBe(false);
    });
});
