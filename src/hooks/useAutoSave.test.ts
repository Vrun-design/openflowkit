import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutoSave } from './useAutoSave';
import { FlowEdge, FlowNode, FlowTab } from '@/lib/types';

function createNode(id: string, label: string): FlowNode {
    return {
        id,
        type: 'process',
        position: { x: 0, y: 0 },
        data: { label, subLabel: '', color: 'blue' },
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
        history: {
            past: [],
            future: [],
        },
    };
}

describe('useAutoSave', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.useRealTimers();
    });

    it('does not sync when active tab is not found', () => {
        vi.useFakeTimers();
        const setTabs = vi.fn<(tabs: FlowTab[]) => void>();

        renderHook(() =>
            useAutoSave(
                [createTab('tab-1', 'Tab 1', [], [])],
                'tab-missing',
                [createNode('n1', 'Node 1')],
                [createEdge('e1', 'n1', 'n1')],
                setTabs
            )
        );

        vi.advanceTimersByTime(1000);
        expect(setTabs).not.toHaveBeenCalled();
    });

    it('syncs active tab nodes and edges back into tabs after debounce', () => {
        vi.useFakeTimers();

        const oldNodes = [createNode('n1', 'Old')];
        const oldEdges = [createEdge('e1', 'n1', 'n1')];
        const newNodes = [createNode('n2', 'New')];
        const newEdges = [createEdge('e2', 'n2', 'n2')];
        const tabs = [createTab('tab-1', 'Tab 1', oldNodes, oldEdges)];

        const setTabs = vi.fn<(tabs: FlowTab[]) => void>();

        renderHook(() =>
            useAutoSave(
                tabs,
                'tab-1',
                newNodes,
                newEdges,
                setTabs
            )
        );

        vi.advanceTimersByTime(1000);

        expect(setTabs).toHaveBeenCalledWith([
            {
                ...tabs[0],
                nodes: newNodes,
                edges: newEdges,
            },
        ]);
    });
});
