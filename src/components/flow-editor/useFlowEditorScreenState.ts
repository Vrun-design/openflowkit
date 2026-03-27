import { useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { useReactFlow } from '@/lib/reactflowCompat';
import { useFlowStore } from '@/store';
import { useSnapshots } from '@/hooks/useSnapshots';
import { useFlowHistory } from '@/hooks/useFlowHistory';
import { useFlowEditorUIState } from '@/hooks/useFlowEditorUIState';
import { useShortcutHelpActions, useViewSettings } from '@/store/viewHooks';
import { useSelectionActions, useSelectionState } from '@/store/selectionHooks';
import type { FlowSnapshot } from '@/lib/types';
import { isRolloutFlagEnabled } from '@/config/rolloutFlags';

export function useFlowEditorScreenState() {
  const location = useLocation();
  const navigate = useNavigate();
  const collaborationEnabled = isRolloutFlagEnabled('collaborationEnabled');

  const storeState = useFlowStore(useShallow((state) => ({
    nodes: state.nodes,
    edges: state.edges,
    setNodes: state.setNodes,
    setEdges: state.setEdges,
    tabs: state.tabs,
    activeTabId: state.activeTabId,
    addTab: state.addTab,
    closeTab: state.closeTab,
    updateTab: state.updateTab,
    toggleGrid: state.toggleGrid,
    toggleSnap: state.toggleSnap,
  })));
  const viewSettings = useViewSettings();
  const { setShortcutsHelpOpen } = useShortcutHelpActions();
  const [diffBaseline, setDiffBaseline] = useState<FlowSnapshot | null>(null);
  const selectionState = useSelectionState();
  const selectionActions = useSelectionActions();
  const activeTabName = useMemo(
    () => storeState.tabs.find((tab) => tab.id === storeState.activeTabId)?.name,
    [storeState.tabs, storeState.activeTabId],
  );
  const snapshotsState = useSnapshots();
  const uiState = useFlowEditorUIState();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowState = useReactFlow();
  const historyState = useFlowHistory();

  return {
    location,
    navigate,
    collaborationEnabled,
    ...storeState,
    viewSettings,
    setShortcutsHelpOpen,
    diffBaseline,
    setDiffBaseline,
    ...selectionState,
    ...selectionActions,
    activeTabName,
    ...snapshotsState,
    ...uiState,
    reactFlowWrapper,
    ...reactFlowState,
    ...historyState,
  };
}
