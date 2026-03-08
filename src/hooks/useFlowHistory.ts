import { useState, useCallback } from 'react';
import { FlowHistoryState } from '@/lib/types';
import { trackEvent } from '../lib/analytics';
import { useCanvasActions, useCanvasState } from '@/store/canvasHooks';
import { useHistoryActions } from '@/store/historyHooks';
import { useTabsState } from '@/store/tabHooks';
import { useViewSettings } from '@/store/viewHooks';

const MAX_HISTORY = 20;

export const useFlowHistory = () => {
  const { nodes, edges } = useCanvasState();
  const { tabs, activeTabId } = useTabsState();
  const viewSettings = useViewSettings();
  const { setNodes, setEdges } = useCanvasActions();
  const { recordHistoryV2, undoV2, redoV2, canUndoV2, canRedoV2 } = useHistoryActions();

  const [past, setPast] = useState<FlowHistoryState[]>([]);
  const [future, setFuture] = useState<FlowHistoryState[]>([]);
  const useStoreHistoryV2 = viewSettings.historyModelV2Enabled;
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const v2Past = activeTab?.history.past ?? [];
  const v2Future = activeTab?.history.future ?? [];

  const recordHistory = useCallback(() => {
    if (useStoreHistoryV2) {
      recordHistoryV2();
      return;
    }
    setPast((old) => [...old, { nodes, edges }].slice(-MAX_HISTORY));
    setFuture([]);
  }, [useStoreHistoryV2, recordHistoryV2, nodes, edges]);

  const undo = useCallback(() => {
    if (useStoreHistoryV2) {
      undoV2();
      return;
    }
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setPast((old) => old.slice(0, -1));
    setFuture((old) => [{ nodes, edges }, ...old]);
    setNodes(previous.nodes);
    setEdges(previous.edges);
    trackEvent('undo');
  }, [useStoreHistoryV2, undoV2, past, nodes, edges, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (useStoreHistoryV2) {
      redoV2();
      return;
    }
    if (future.length === 0) return;
    const next = future[0];
    setFuture((old) => old.slice(1));
    setPast((old) => [...old, { nodes, edges }].slice(-MAX_HISTORY)); // Ensure limit on redo too
    setNodes(next.nodes);
    setEdges(next.edges);
    trackEvent('redo');
  }, [useStoreHistoryV2, redoV2, future, nodes, edges, setNodes, setEdges]);

  // Expose setPast/setFuture for AutoSave and Tab switching
  // Ideally these should also be in store or handled differently, but for now we expose them.
  return {
    past: useStoreHistoryV2 ? v2Past : past,
    future: useStoreHistoryV2 ? v2Future : future,
    setPast,
    setFuture,
    recordHistory,
    undo,
    redo,
    canUndo: useStoreHistoryV2 ? canUndoV2() : past.length > 0,
    canRedo: useStoreHistoryV2 ? canRedoV2() : future.length > 0,
  };
};
