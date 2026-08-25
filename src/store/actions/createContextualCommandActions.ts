import { applyContextualEditorCommand } from '@/services/contextualEditorCommands';
import type { SetFlowState } from '../actionFactory';
import type { FlowState } from '../types';
import {
  buildHistorySnapshot,
  findActiveTabIndex,
  trimPastSnapshots,
} from './createHistoryActions';

export function createContextualCommandActions(
  set: SetFlowState
): Pick<FlowState, 'runContextualEditorCommand'> {
  return {
    runContextualEditorCommand: (command) => {
      let changed = false;
      set((state) => {
        const activeTabIndex = findActiveTabIndex(state);
        if (activeTabIndex < 0) return {};
        const result = applyContextualEditorCommand(
          {
            nodes: state.nodes,
            edges: state.edges,
            selectedNodeId: state.selectedNodeId,
            selectedEdgeId: state.selectedEdgeId,
          },
          command
        );
        if (!result) return {};

        const activeTab = state.tabs[activeTabIndex];
        const updatedTab = {
          ...activeTab,
          nodes: result.nodes,
          edges: result.edges,
          history: {
            past: trimPastSnapshots([...activeTab.history.past, buildHistorySnapshot(state)]),
            future: [],
          },
        };
        const tabs = [...state.tabs];
        tabs[activeTabIndex] = updatedTab;
        changed = true;
        return { nodes: result.nodes, edges: result.edges, tabs };
      });
      return changed;
    },
  };
}
