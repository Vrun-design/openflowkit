import { describe, expect, it } from 'vitest';
import { createFlowStore } from './createFlowStore';
import {
  createDesignSystemByIdSelector,
  createTabByIdSelector,
  selectActiveDesignSystem,
  selectCanvasState,
  selectTabsState,
} from './selectors';

describe('store selectors', () => {
  it('selects grouped canvas and tab slices without reshaping the store contract', () => {
    const store = createFlowStore();
    const state = store.getState();

    expect(selectCanvasState(state)).toEqual({
      nodes: state.nodes,
      edges: state.edges,
    });
    expect(selectTabsState(state)).toEqual({
      tabs: state.tabs,
      activeTabId: state.activeTabId,
    });
  });

  it('falls back to the first design system when the active id is missing', () => {
    const store = createFlowStore();
    store.setState({
      activeDesignSystemId: 'missing-system',
    });

    expect(selectActiveDesignSystem(store.getState()).id).toBe(
      store.getState().designSystems[0]?.id
    );
  });

  it('builds stable lookup selectors for tabs and design systems', () => {
    const store = createFlowStore();
    store.setState({
      tabs: [
        {
          id: 'tab-1',
          name: 'Overview',
          diagramType: 'flowchart',
          updatedAt: '2026-03-30T00:00:00.000Z',
          nodes: [],
          edges: [],
          playback: undefined,
          history: { past: [], future: [] },
        },
      ],
    });

    expect(createTabByIdSelector('tab-1')(store.getState())?.name).toBe('Overview');
    expect(
      createDesignSystemByIdSelector(store.getState().designSystems[0]?.id ?? '')(
        store.getState()
      )?.id
    ).toBe(store.getState().designSystems[0]?.id);
  });
});
