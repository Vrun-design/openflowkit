import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { FlowEdge, FlowNode, FlowTab } from '@/lib/types';
import { useFlowStore } from '@/store';
import { useClipboardOperations } from './useClipboardOperations';

const nodes: FlowNode[] = [
  { id: 'a', type: 'process', position: { x: 10, y: 20 }, data: { label: 'a' }, selected: true },
  { id: 'b', type: 'process', position: { x: 210, y: 20 }, data: { label: 'b' }, selected: true },
  { id: 'c', type: 'process', position: { x: 500, y: 500 }, data: { label: 'c' } },
];
const edges: FlowEdge[] = [
  { id: 'ab', source: 'a', target: 'b', selected: true },
  { id: 'bc', source: 'b', target: 'c' },
];

describe('useClipboardOperations', () => {
  beforeEach(() => {
    localStorage.clear();
    const tab: FlowTab = {
      id: 'p', name: 'p', diagramType: 'flowchart', nodes, edges, history: { past: [], future: [] },
    };
    useFlowStore.setState({ nodes, edges, tabs: [tab], activeTabId: 'p', selectedNodeId: 'a' });
  });

  it('pastes in place at the copied coordinates with internal edges only', () => {
    const recordHistory = vi.fn();
    const { result } = renderHook(() => useClipboardOperations(recordHistory));
    act(() => result.current.copySelection());
    act(() => result.current.pasteSelectionInPlace());

    const state = useFlowStore.getState();
    const pasted = state.nodes.filter((n) => n.selected);
    expect(pasted.map((n) => n.position)).toEqual([{ x: 10, y: 20 }, { x: 210, y: 20 }]);
    expect(pasted.every((n) => n.id !== 'a' && n.id !== 'b')).toBe(true);
    const pastedEdges = state.edges.filter((e) => e.selected);
    expect(pastedEdges).toHaveLength(1);
    expect(pastedEdges[0].source).toBe(pasted[0].id);
    expect(recordHistory).toHaveBeenCalledTimes(1);
  });

  it('offsets an ordinary paste', () => {
    const { result } = renderHook(() => useClipboardOperations(() => {}));
    act(() => result.current.copySelection());
    act(() => result.current.pasteSelection());
    const pasted = useFlowStore.getState().nodes.filter((n) => n.selected);
    expect(pasted[0].position).toEqual({ x: 60, y: 70 });
  });
});
