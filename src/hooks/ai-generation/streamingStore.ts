import { useSyncExternalStore, useCallback } from 'react';
import type { FlowNode, FlowEdge } from '@/lib/types';
import type { StreamingParseResult } from './streamingParser';

interface StreamingState {
  isGenerating: boolean;
  nodeCount: number;
  edgeCount: number;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

const EMPTY: StreamingState = {
  isGenerating: false,
  nodeCount: 0,
  edgeCount: 0,
  nodes: [],
  edges: [],
};

let state: StreamingState = EMPTY;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

export function setStreamingGraph(result: StreamingParseResult | null): void {
  if (!result || result.nodeCount === 0) {
    if (state.isGenerating) {
      state = { ...state, nodeCount: 0, edgeCount: 0, nodes: [], edges: [] };
      emit();
    }
    return;
  }
  state = {
    isGenerating: true,
    nodeCount: result.nodeCount,
    edgeCount: result.edgeCount,
    nodes: result.nodes,
    edges: result.edges,
  };
  emit();
}

export function setStreamingActive(active: boolean): void {
  if (state.isGenerating !== active) {
    state = active ? { ...state, isGenerating: true } : EMPTY;
    emit();
  }
}

export function useStreamingState(): StreamingState {
  const subscribe = useCallback((cb: () => void) => {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => EMPTY
  );
}
