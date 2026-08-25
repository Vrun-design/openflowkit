import { useCallback } from 'react';
import { useHistoryActions } from '@/store/historyHooks';
import { useEditorPagesState } from '@/store/editorPageHooks';

export const useFlowHistory = () => {
  const { pages, activePageId } = useEditorPagesState();
  const {
    recordHistoryV2,
    undoV2,
    redoV2,
    scrubHistoryV2,
    canUndoV2,
    canRedoV2,
  } = useHistoryActions();

  const activePage = pages.find((page) => page.id === activePageId);
  const past = activePage?.history.past ?? [];
  const future = activePage?.history.future ?? [];

  const recordHistory = useCallback(() => {
    recordHistoryV2();
  }, [recordHistoryV2]);

  const undo = useCallback(() => {
    undoV2();
  }, [undoV2]);

  const redo = useCallback(() => {
    redoV2();
  }, [redoV2]);

  const scrubToHistoryIndex = useCallback((targetIndex: number) => {
    scrubHistoryV2(targetIndex);
  }, [scrubHistoryV2]);

  return {
    past,
    future,
    recordHistory,
    undo,
    redo,
    scrubToHistoryIndex,
    canUndo: canUndoV2(),
    canRedo: canRedoV2(),
  };
};
