import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { FlowEdge, FlowNode, FlowTab } from '@/lib/types';
import { useFlowStore } from '@/store';
import { useFlowCanvasContextActions } from './useFlowCanvasContextActions';

const nodes: FlowNode[] = [
  { id: 'a', type: 'process', position: { x: 0, y: 0 }, data: { label: 'a' } },
  { id: 'b', type: 'process', position: { x: 200, y: 0 }, data: { label: 'b' } },
];
const edges: FlowEdge[] = [
  { id: 'e1', source: 'a', target: 'b' },
  { id: 'e2', source: 'b', target: 'a' },
];

describe('useFlowCanvasContextActions', () => {
  beforeEach(() => {
    const tab: FlowTab = {
      id: 'page-1', name: 'Page 1', diagramType: 'flowchart', nodes, edges,
      history: { past: [], future: [] },
    };
    useFlowStore.setState({
      nodes, edges, tabs: [tab], activeTabId: tab.id, selectedNodeId: null, selectedEdgeId: null,
    });
  });

  it('reverses only the edge under the menu and records history', () => {
    const onCloseContextMenu = vi.fn();
    const { result } = renderHook(() => useFlowCanvasContextActions({
      contextMenu: { id: 'e1', type: 'edge', position: { x: 0, y: 0 }, onClose: vi.fn(), isOpen: true },
      onCloseContextMenu,
      screenToFlowPosition: (p) => p,
      copySelection: vi.fn(), pasteSelection: vi.fn(), duplicateNode: vi.fn(), deleteNode: vi.fn(),
      deleteEdge: vi.fn(), updateNodeZIndex: vi.fn(), updateNodeType: vi.fn(), updateNodeData: vi.fn(),
      fitSectionToContents: vi.fn(), releaseFromSection: vi.fn(), bringContentsIntoSection: vi.fn(),
      handleAlignNodes: vi.fn(), handleDistributeNodes: vi.fn(), handleGroupNodes: vi.fn(),
      handleWrapInSection: vi.fn(), handleUngroupSection: vi.fn(), nodes,
    }));

    result.current.onReverseEdge();

    const state = useFlowStore.getState();
    expect(state.edges.find((edge) => edge.id === 'e1')).toMatchObject({ source: 'b', target: 'a' });
    expect(state.edges.find((edge) => edge.id === 'e2')).toMatchObject({ source: 'b', target: 'a' });
    expect(state.tabs[0].history.past).toHaveLength(1);
    expect(onCloseContextMenu).toHaveBeenCalled();
  });
});
