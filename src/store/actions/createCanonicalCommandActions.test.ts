import { beforeEach, describe, expect, it } from 'vitest';
import type { FlowNode, FlowTab } from '@/lib/types';
import { createFlowStore } from '../createFlowStore';

const node: FlowNode = {
  id: 'a', type: 'process', position: { x: 10, y: 20 }, data: { label: 'A' }, selected: true,
};

describe('applyCanonicalCommand', () => {
  const store = createFlowStore();

  beforeEach(() => {
    const tab: FlowTab = {
      id: 'page-1', name: 'Page 1', diagramType: 'flowchart', nodes: [node], edges: [],
      history: { past: [], future: [] },
    };
    store.setState({
      nodes: [node], edges: [], tabs: [tab], activeTabId: tab.id, selectedNodeId: 'a',
      documents: [{ id: 'doc', name: 'Doc', tabs: [tab], activeTabId: tab.id }] as never,
      activeDocumentId: 'doc',
    });
  });

  it('applies a command, keeps selection, and records one history entry', () => {
    const changed = store.getState().applyCanonicalCommand((document, pageId) => {
      const page = document.pages.find(({ id }) => id === pageId)!;
      const before = page.nodes[0];
      return {
        kind: 'set-node', id: 'move', label: 'Move', pageId, before,
        after: { ...before, transform: { ...before.transform, translation: { x: 100, y: 200 } } },
      };
    });
    expect(changed).toBe(true);
    const state = store.getState();
    expect(state.nodes[0]).toMatchObject({ position: { x: 100, y: 200 }, selected: true });
    expect(state.tabs[0].nodes[0].position).toEqual({ x: 100, y: 200 });
    expect(state.tabs[0].history.past).toHaveLength(1);
    store.getState().undoV2();
    expect(store.getState().nodes[0].position).toEqual({ x: 10, y: 20 });
  });

  it('leaves the store untouched when the builder declines', () => {
    expect(store.getState().applyCanonicalCommand(() => null)).toBe(false);
    expect(store.getState().tabs[0].history.past).toHaveLength(0);
  });
});
