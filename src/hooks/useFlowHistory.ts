import { useState, useCallback } from 'react';
import { FlowHistoryState } from '@/lib/types';
import { useFlowStore } from '../store';

const MAX_HISTORY = 20;

export const useFlowHistory = () => {
  const { nodes, edges, setNodes, setEdges } = useFlowStore();

  const [past, setPast] = useState<FlowHistoryState[]>([]);
  const [future, setFuture] = useState<FlowHistoryState[]>([]);

  const recordHistory = useCallback(() => {
    setPast((old) => [...old, { nodes, edges }].slice(-MAX_HISTORY));
    setFuture([]);
  }, [nodes, edges]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setPast((old) => old.slice(0, -1));
    setFuture((old) => [{ nodes, edges }, ...old]);
    setNodes(previous.nodes);
    setEdges(previous.edges);
  }, [past, nodes, edges, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((old) => old.slice(1));
    setPast((old) => [...old, { nodes, edges }].slice(-MAX_HISTORY)); // Ensure limit on redo too
    setNodes(next.nodes);
    setEdges(next.edges);
  }, [future, nodes, edges, setNodes, setEdges]);

  // Expose setPast/setFuture for AutoSave and Tab switching
  // Ideally these should also be in store or handled differently, but for now we expose them.
  return { past, future, setPast, setFuture, recordHistory, undo, redo, canUndo: past.length > 0, canRedo: future.length > 0 };
};
