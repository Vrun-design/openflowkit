import { useCallback } from 'react';
import { useHistoryActions } from '@/store/historyHooks';
import { useEditorPagesState } from '@/store/editorPageHooks';

export const useFlowHistory = () => {
  const { pages, activePageId } = useEditorPagesState();
  const { recordHistoryV2, undoV2, redoV2, canUndoV2, canRedoV2 } = useHistoryActions();

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
    const currentIndex = past.length;
    const boundedTargetIndex = Math.max(0, Math.min(targetIndex, past.length + future.length));

    if (boundedTargetIndex === currentIndex) {
      return;
    }

    if (boundedTargetIndex < currentIndex) {
      for (let index = currentIndex; index > boundedTargetIndex; index -= 1) {
        undoV2();
      }
      return;
    }

    for (let index = currentIndex; index < boundedTargetIndex; index += 1) {
      redoV2();
    }
  }, [future.length, past.length, redoV2, undoV2]);

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
