import { beforeEach, describe, expect, it } from 'vitest';
import type { FlowNode, FlowTab } from '@/lib/types';
import { createFlowStore } from './createFlowStore';

function selectedNode(id: string, x: number): FlowNode {
  return {
    id,
    type: 'process',
    position: { x, y: 0 },
    data: { label: id },
    selected: true,
  };
}

describe('runContextualEditorCommand', () => {
  const store = createFlowStore();

  beforeEach(() => {
    const nodes = [selectedNode('a', 0), selectedNode('b', 100)];
    const tab: FlowTab = {
      id: 'page-1',
      name: 'Page 1',
      diagramType: 'flowchart',
      nodes,
      edges: [],
      history: { past: [], future: [] },
    };
    store.setState({
      nodes,
      edges: [],
      tabs: [tab],
      activeTabId: tab.id,
      selectedNodeId: 'a',
      selectedEdgeId: null,
    });
  });

  it('mutates graph, active page, and history in one undoable command', () => {
    expect(store.getState().runContextualEditorCommand({ kind: 'align', direction: 'left' })).toBe(
      true
    );
    expect(store.getState().nodes.map((node) => node.position.x)).toEqual([0, 0]);
    expect(store.getState().tabs[0].nodes.map((node) => node.position.x)).toEqual([0, 0]);
    expect(store.getState().tabs[0].history.past).toHaveLength(1);

    store.getState().undoV2();
    expect(store.getState().nodes.map((node) => node.position.x)).toEqual([0, 100]);
  });

  it('rejects a no-op without adding history', () => {
    store.setState((state) => ({
      nodes: state.nodes.map((node) => ({ ...node, position: { x: 0, y: 0 } })),
      tabs: state.tabs.map((tab) => ({
        ...tab,
        nodes: tab.nodes.map((node) => ({ ...node, position: { x: 0, y: 0 } })),
      })),
    }));

    expect(store.getState().runContextualEditorCommand({ kind: 'align', direction: 'left' })).toBe(
      false
    );
    expect(store.getState().tabs[0].history.past).toHaveLength(0);
  });
});
