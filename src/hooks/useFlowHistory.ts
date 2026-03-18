import { useCallback } from 'react';
import { useHistoryActions } from '@/store/historyHooks';
import { useTabsState } from '@/store/tabHooks';

export const useFlowHistory = () => {
  const { tabs, activeTabId } = useTabsState();
  const { recordHistoryV2, undoV2, redoV2, canUndoV2, canRedoV2 } = useHistoryActions();

  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const past = activeTab?.history.past ?? [];
  const future = activeTab?.history.future ?? [];

  const recordHistory = useCallback(() => {
    recordHistoryV2();
  }, [recordHistoryV2]);

  const undo = useCallback(() => {
    undoV2();
  }, [undoV2]);

  const redo = useCallback(() => {
    redoV2();
  }, [redoV2]);

  return {
    past,
    future,
    recordHistory,
    undo,
    redo,
    canUndo: canUndoV2(),
    canRedo: canRedoV2(),
  };
};
