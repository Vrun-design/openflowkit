import { useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { useReactFlow } from '@/lib/reactflowCompat';
import { useFlowStore } from '@/store';
import { useEditorPageActions, useEditorPagesState } from '@/store/editorPageHooks';
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

  const canvasState = useFlowStore(useShallow((state) => ({
    nodes: state.nodes,
    edges: state.edges,
    setNodes: state.setNodes,
    setEdges: state.setEdges,
    toggleGrid: state.toggleGrid,
    toggleSnap: state.toggleSnap,
  })));
  const { pages, activePageId } = useEditorPagesState();
  const { addPage, closePage, updatePage, reorderPage } = useEditorPageActions();
  const viewSettings = useViewSettings();
  const { setShortcutsHelpOpen } = useShortcutHelpActions();
  const [diffBaseline, setDiffBaseline] = useState<FlowSnapshot | null>(null);
  const selectionState = useSelectionState();
  const selectionActions = useSelectionActions();
  const activePageName = useMemo(
    () => pages.find((page) => page.id === activePageId)?.name,
    [pages, activePageId],
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
    ...canvasState,
    pages,
    activePageId,
    addPage,
    closePage,
    updatePage,
    reorderPage,
    viewSettings,
    setShortcutsHelpOpen,
    diffBaseline,
    setDiffBaseline,
    ...selectionState,
    ...selectionActions,
    activePageName,
    ...snapshotsState,
    ...uiState,
    reactFlowWrapper,
    ...reactFlowState,
    ...historyState,
  };
}
