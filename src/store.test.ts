import { beforeEach, describe, expect, it } from 'vitest';
import type { FlowEdge, FlowNode, FlowTab } from '@/lib/types';
import { useFlowStore } from './store';

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
});
