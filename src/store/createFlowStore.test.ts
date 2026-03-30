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
        expect(typeof state.addLayer).toBe('function');
        expect(typeof state.setSelectedNodeId).toBe('function');
        expect(typeof state.setAISettings).toBe('function');
    });

    it('hydrates experience state through the dedicated experience slice', () => {
        const store = createFlowStore();
        const state = store.getState();

        expect(state.designSystems[0]?.id).toBe('default');
        expect(state.activeDesignSystemId).toBe('default');
        expect(state.viewSettings.showGrid).toBe(true);
        expect(state.globalEdgeOptions.type).toBe('smoothstep');
        expect(typeof state.setActiveDesignSystem).toBe('function');
        expect(typeof state.setViewSettings).toBe('function');
        expect(typeof state.updateLastSaveTime).toBe('function');
    });
});
