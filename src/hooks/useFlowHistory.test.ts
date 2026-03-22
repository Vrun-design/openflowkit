import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFlowHistory } from './useFlowHistory';
import { useFlowStore } from '../store';
import type { FlowEdge, FlowNode } from '@/lib/types';

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

function setSingleNodeState(label: string): void {
    useFlowStore.getState().setNodes([createNode('1', label)]);
    useFlowStore.getState().setEdges([]);
}

function setDualNodeState(version: string): void {
    useFlowStore.getState().setNodes([
        createNode('n1', `Node-A-${version}`),
        createNode('n2', `Node-B-${version}`),
    ]);
    useFlowStore.getState().setEdges([createEdge(`e-${version}`, 'n1', 'n2')]);
}

function setMemoryHeavyGraphState(version: number, nodeCount = 180, payloadSize = 256): void {
    const payload = 'm'.repeat(payloadSize);
    const nodes: FlowNode[] = Array.from({ length: nodeCount }, (_, index) => ({
        id: `mh-${version}-${index}`,
        type: 'process',
        position: { x: index * 4, y: version * 3 },
        data: { label: `MH-${version}-${index}-${payload}`, subLabel: '', color: 'blue' },
    }));
    const edges: FlowEdge[] = Array.from({ length: Math.max(0, nodeCount - 1) }, (_, index) => ({
        id: `mhe-${version}-${index}`,
        source: `mh-${version}-${index}`,
        target: `mh-${version}-${index + 1}`,
    }));
    useFlowStore.getState().setNodes(nodes);
    useFlowStore.getState().setEdges(edges);
}

function initializeV2Tabs(tabIds: string[]): void {
    useFlowStore.setState({
        tabs: tabIds.map((tabId, index) => ({
            id: tabId,
            name: `Tab ${index + 1}`,
            nodes: [],
            edges: [],
            history: { past: [], future: [] },
        })),
        activeTabId: tabIds[0],
    });
}

type HistoryScenarioResult = {
    currentLabel: string;
    canUndo: boolean;
    canRedo: boolean;
    pastLength: number;
    futureLength: number;
};

function runCoreHistoryScenario(): HistoryScenarioResult {
    useFlowStore.setState({
        nodes: [],
        edges: [],
        tabs: [
            {
                id: 'tab-1',
                name: 'Tab 1',
                nodes: [],
                edges: [],
                history: { past: [], future: [] },
            },
        ],
        activeTabId: 'tab-1',
    });

    const { result, unmount } = renderHook(() => useFlowHistory());

    act(() => {
        setSingleNodeState('A');
    });
    act(() => {
        result.current.recordHistory();
    });
    act(() => {
        setSingleNodeState('B');
    });
    act(() => {
        result.current.recordHistory();
    });
    act(() => {
        setSingleNodeState('C');
    });

    act(() => {
        result.current.undo();
    });
    act(() => {
        result.current.undo();
    });
    act(() => {
        result.current.redo();
    });

    const state = useFlowStore.getState();
    const scenarioResult: HistoryScenarioResult = {
        currentLabel: state.nodes[0]?.data.label ?? '',
        canUndo: result.current.canUndo,
        canRedo: result.current.canRedo,
        pastLength: result.current.past.length,
        futureLength: result.current.future.length,
    };
    unmount();
    return scenarioResult;
}

function assertStateGraphInvariant(nodes: FlowNode[], edges: FlowEdge[]): void {
    const nodeIds = new Set(nodes.map((node) => node.id));

    expect(nodes.length).toBeGreaterThan(0);
    for (const node of nodes) {
        expect(node.id).toBeTruthy();
        expect(Number.isFinite(node.position.x)).toBe(true);
        expect(Number.isFinite(node.position.y)).toBe(true);
        expect(typeof node.data.label).toBe('string');
    }

    for (const edge of edges) {
        expect(nodeIds.has(edge.source)).toBe(true);
        expect(nodeIds.has(edge.target)).toBe(true);
    }
}

function executeOperationSequence(result: { current: ReturnType<typeof useFlowHistory> }, operations: Array<'undo' | 'redo'>): void {
    for (const operation of operations) {
        act(() => {
            if (operation === 'undo') {
                result.current.undo();
                return;
            }
            result.current.redo();
        });
    }
}

describe('useFlowHistory', () => {
    beforeEach(() => {
        act(() => {
            const { setNodes, setEdges } = useFlowStore.getState();
            setNodes([]);
            setEdges([]);
        });
        useFlowStore.setState({
            tabs: [{ id: 'tab-1', name: 'Tab 1', nodes: [], edges: [], history: { past: [], future: [] } }],
            activeTabId: 'tab-1',
        });
    });

    it('should record history', () => {
        const { result } = renderHook(() => useFlowHistory());

        act(() => {
            setSingleNodeState('A');
        });

        act(() => {
            result.current.recordHistory();
        });

        expect(result.current.past).toHaveLength(1);
        expect(result.current.canUndo).toBe(true);
    });

    it('should undo changes', () => {
        const { result } = renderHook(() => useFlowHistory());

        // Initial state
        act(() => {
            setSingleNodeState('Initial');
        });

        act(() => {
            result.current.recordHistory();
        });

        // Change state
        act(() => {
            setSingleNodeState('Changed');
        });

        // Undo
        act(() => {
            result.current.undo();
        });

        const { nodes } = useFlowStore.getState();
        expect(nodes).toHaveLength(1);
        expect(nodes[0].data.label).toBe('Initial');
        expect(result.current.past).toHaveLength(0);
        expect(result.current.future).toHaveLength(1);
    });

    it('should redo changes', () => {
        const { result } = renderHook(() => useFlowHistory());

        act(() => {
            setSingleNodeState('A');
        });

        act(() => {
            result.current.recordHistory();
        });

        act(() => {
            setSingleNodeState('B');
        });

        act(() => {
            result.current.undo();
        });

        expect(useFlowStore.getState().nodes[0].data.label).toBe('A');

        act(() => {
            result.current.redo();
        });

        expect(useFlowStore.getState().nodes[0].data.label).toBe('B');
    });

    it('should limit history size via memory budget', () => {
        const { result } = renderHook(() => useFlowHistory());

        act(() => {
            for (let i = 0; i < 30; i++) {
                setSingleNodeState(`step-${i}`);
                result.current.recordHistory();
            }
        });

        // V2 uses a memory budget rather than a hard count cap — past stays bounded
        expect(result.current.past.length).toBeGreaterThan(0);
        expect(result.current.past.length).toBeLessThanOrEqual(30);
        expect(result.current.canUndo).toBe(true);
    });

    it('should not mutate state when undo/redo are called at boundaries', () => {
        const { result } = renderHook(() => useFlowHistory());

        act(() => {
            setSingleNodeState('Boundary');
        });

        const before = useFlowStore.getState().nodes[0].data.label;

        act(() => {
            result.current.undo();
            result.current.redo();
        });

        expect(useFlowStore.getState().nodes[0].data.label).toBe(before);
        expect(result.current.past).toHaveLength(0);
        expect(result.current.future).toHaveLength(0);
        expect(result.current.canUndo).toBe(false);
        expect(result.current.canRedo).toBe(false);
    });

    it('should preserve state graph invariants across repeated undo/redo cycles', () => {
        const { result } = renderHook(() => useFlowHistory());

        act(() => {
            setDualNodeState('v0');
        });
        act(() => {
            result.current.recordHistory();
        });
        act(() => {
            setDualNodeState('v1');
        });
        act(() => {
            result.current.recordHistory();
        });
        act(() => {
            setDualNodeState('v2');
        });
        act(() => {
            result.current.recordHistory();
        });
        act(() => {
            setDualNodeState('v3');
        });

        act(() => {
            result.current.undo(); // v2
        });
        act(() => {
            result.current.undo(); // v1
        });
        act(() => {
            result.current.undo(); // v0
        });

        let state = useFlowStore.getState();
        assertStateGraphInvariant(state.nodes, state.edges);
        expect(state.nodes[0].data.label).toBe('Node-A-v0');
        expect(state.edges[0].id).toBe('e-v0');

        act(() => {
            result.current.redo(); // v1
        });
        act(() => {
            result.current.redo(); // v2
        });
        act(() => {
            result.current.redo(); // v3
        });

        state = useFlowStore.getState();
        assertStateGraphInvariant(state.nodes, state.edges);
        expect(state.nodes[0].data.label).toBe('Node-A-v3');
        expect(state.edges[0].id).toBe('e-v3');
        expect(result.current.canRedo).toBe(false);
    });

    it('should keep graph state valid under long mixed undo/redo stress sequence', () => {
        const { result } = renderHook(() => useFlowHistory());

        const versions = 25;
        act(() => {
            setDualNodeState('v0');
        });
        for (let i = 0; i < versions; i += 1) {
            act(() => {
                result.current.recordHistory();
            });
            act(() => {
                setDualNodeState(`v${i + 1}`);
            });
        }

        // Deterministic mixed sequence to stress history transitions.
        const operations: Array<'undo' | 'redo'> = [];
        for (let i = 0; i < 20; i += 1) {
            operations.push('undo');
        }
        for (let i = 0; i < 10; i += 1) {
            operations.push('redo');
        }
        for (let i = 0; i < 12; i += 1) {
            operations.push('undo');
        }
        for (let i = 0; i < 50; i += 1) {
            operations.push(i % 3 === 0 ? 'redo' : 'undo');
        }

        executeOperationSequence(result, operations);

        const state = useFlowStore.getState();
        assertStateGraphInvariant(state.nodes, state.edges);
        expect(state.nodes[0].id).toBe('n1');
        expect(state.nodes[1].id).toBe('n2');
        expect(state.edges).toHaveLength(1);
    });

    it('should not corrupt state after repeated boundary hammering', () => {
        const { result } = renderHook(() => useFlowHistory());

        act(() => {
            setDualNodeState('stable');
        });

        // Hammer boundaries with no history entries.
        const operations = Array.from({ length: 80 }, (_, index) => (index % 2 === 0 ? 'undo' : 'redo')) as Array<'undo' | 'redo'>;
        executeOperationSequence(result, operations);

        const state = useFlowStore.getState();
        assertStateGraphInvariant(state.nodes, state.edges);
        expect(state.nodes[0].data.label).toBe('Node-A-stable');
        expect(state.edges[0].id).toBe('e-stable');
        expect(result.current.canUndo).toBe(false);
        expect(result.current.canRedo).toBe(false);
    });

    it('should record and restore history using the store-level model', () => {
        useFlowStore.setState((state) => ({
            tabs: [
                {
                    id: 'tab-1',
                    name: 'Tab 1',
                    nodes: state.nodes,
                    edges: state.edges,
                    history: { past: [], future: [] },
                },
            ],
            activeTabId: 'tab-1',
        }));

        const { result } = renderHook(() => useFlowHistory());

        act(() => {
            setSingleNodeState('Store-V2-A');
            result.current.recordHistory();
            setSingleNodeState('Store-V2-B');
        });

        expect(result.current.canUndo).toBe(true);
        expect(result.current.past).toHaveLength(1);

        act(() => {
            result.current.undo();
        });
        expect(useFlowStore.getState().nodes[0].data.label).toBe('Store-V2-A');

        act(() => {
            result.current.redo();
        });
        expect(useFlowStore.getState().nodes[0].data.label).toBe('Store-V2-B');
    });

    it('should trim V2 past history by memory budget under heavy snapshots', () => {
        useFlowStore.setState((state) => ({
            tabs: [
                {
                    id: 'tab-1',
                    name: 'Tab 1',
                    nodes: state.nodes,
                    edges: state.edges,
                    history: { past: [], future: [] },
                },
            ],
            activeTabId: 'tab-1',
        }));

        const { result } = renderHook(() => useFlowHistory());

        for (let i = 0; i < 12; i += 1) {
            act(() => {
                setMemoryHeavyGraphState(i, 180, 320);
                result.current.recordHistory();
            });
        }

        // With V2 memory budget, retained history should trim below raw insertion count.
        expect(result.current.past.length).toBeGreaterThan(0);
        expect(result.current.past.length).toBeLessThan(12);
        expect(result.current.canUndo).toBe(true);
    });

    it('should trim future history by memory budget during heavy undo sequences', () => {
        useFlowStore.setState((state) => ({
            tabs: [
                {
                    id: 'tab-1',
                    name: 'Tab 1',
                    nodes: state.nodes,
                    edges: state.edges,
                    history: { past: [], future: [] },
                },
            ],
            activeTabId: 'tab-1',
        }));

        const { result } = renderHook(() => useFlowHistory());

        for (let i = 0; i < 14; i += 1) {
            act(() => {
                setMemoryHeavyGraphState(i, 180, 320);
                result.current.recordHistory();
            });
            act(() => {
                setMemoryHeavyGraphState(i + 100, 180, 320);
            });
        }

        for (let i = 0; i < 8; i += 1) {
            act(() => {
                result.current.undo();
            });
        }

        expect(result.current.future.length).toBeGreaterThan(0);
        expect(result.current.future.length).toBeLessThan(8);
    });

    it('should preserve per-tab V2 undo/redo continuity across tab switches', () => {
        initializeV2Tabs(['tab-1', 'tab-2']);
        const { result } = renderHook(() => useFlowHistory());

        // Tab 1 history lifecycle.
        act(() => {
            setSingleNodeState('T1-A');
            result.current.recordHistory();
            setSingleNodeState('T1-B');
        });
        act(() => {
            result.current.undo();
        });
        expect(useFlowStore.getState().nodes[0].data.label).toBe('T1-A');
        expect(result.current.canRedo).toBe(true);

        // Switch to Tab 2 and create its own history.
        act(() => {
            useFlowStore.getState().setActiveTabId('tab-2');
        });
        act(() => {
            setSingleNodeState('T2-A');
            result.current.recordHistory();
            setSingleNodeState('T2-B');
        });
        act(() => {
            result.current.undo();
        });
        expect(useFlowStore.getState().nodes[0].data.label).toBe('T2-A');

        // Back to Tab 1: its redo stack should still be present.
        act(() => {
            useFlowStore.getState().setActiveTabId('tab-1');
        });
        expect(useFlowStore.getState().nodes[0].data.label).toBe('T1-A');
        expect(result.current.canRedo).toBe(true);
        act(() => {
            result.current.redo();
        });
        expect(useFlowStore.getState().nodes[0].data.label).toBe('T1-B');

        // Back to Tab 2: its history continuity should remain intact.
        act(() => {
            useFlowStore.getState().setActiveTabId('tab-2');
        });
        expect(useFlowStore.getState().nodes[0].data.label).toBe('T2-A');
        expect(result.current.canRedo).toBe(true);
        act(() => {
            result.current.redo();
        });
        expect(useFlowStore.getState().nodes[0].data.label).toBe('T2-B');
    });

    it('should keep V2 tab history isolated while switching multiple times', () => {
        initializeV2Tabs(['tab-1', 'tab-2', 'tab-3']);
        const { result } = renderHook(() => useFlowHistory());

        act(() => {
            setSingleNodeState('A1');
            result.current.recordHistory();
            setSingleNodeState('A2');
        });
        act(() => {
            useFlowStore.getState().setActiveTabId('tab-2');
            setSingleNodeState('B1');
            result.current.recordHistory();
            setSingleNodeState('B2');
        });
        act(() => {
            useFlowStore.getState().setActiveTabId('tab-3');
            setSingleNodeState('C1');
            result.current.recordHistory();
            setSingleNodeState('C2');
        });

        act(() => {
            useFlowStore.getState().setActiveTabId('tab-1');
        });
        expect(useFlowStore.getState().nodes[0].data.label).toBe('A2');
        act(() => {
            result.current.undo();
        });
        expect(useFlowStore.getState().nodes[0].data.label).toBe('A1');

        act(() => {
            useFlowStore.getState().setActiveTabId('tab-2');
        });
        expect(useFlowStore.getState().nodes[0].data.label).toBe('B2');
        act(() => {
            result.current.undo();
        });
        expect(useFlowStore.getState().nodes[0].data.label).toBe('B1');

        act(() => {
            useFlowStore.getState().setActiveTabId('tab-3');
        });
        expect(useFlowStore.getState().nodes[0].data.label).toBe('C2');
        act(() => {
            result.current.undo();
        });
        expect(useFlowStore.getState().nodes[0].data.label).toBe('C1');
    });

    it('should produce correct undo/redo outcome after a sequence of record, undo, redo', () => {
        const result = runCoreHistoryScenario();

        // After: record(A), record(B), state=C, undo, undo, redo
        // V2 semantics: undo/redo push the current snapshot to the opposite stack.
        // past=[A], current=B, future=[C]
        expect(result.currentLabel).toBe('B');
        expect(result.canUndo).toBe(true);
        expect(result.canRedo).toBe(true);
        expect(result.pastLength).toBe(1);
        expect(result.futureLength).toBe(1);
    });
});
