import { addFlowEdge, applyFlowEdgeChanges, applyFlowNodeChanges } from '@/lib/reactflowCompat';
import { createDefaultEdge } from '@/constants';
import type { FlowEdge, FlowNode } from '@/lib/types';
import type { GetFlowState, SetFlowState } from '../actionFactory';
import type { FlowState } from '../types';
import { syncTabNodesEdges } from './syncTabNodesEdges';

export function createCanvasActions(
  set: SetFlowState,
  get: GetFlowState
): Pick<FlowState, 'onNodesChange' | 'onEdgesChange' | 'setNodes' | 'setEdges' | 'onConnect'> {
  return {
    onNodesChange: (changes) => {
      set((state) => {
        const nextNodes = applyFlowNodeChanges(changes, state.nodes) as FlowNode[];
        return {
          nodes: nextNodes,
          tabs: syncTabNodesEdges(state.tabs, state.activeTabId, nextNodes, state.edges),
        };
      });
    },

    onEdgesChange: (changes) => {
      set((state) => {
        const nextEdges = applyFlowEdgeChanges(changes, state.edges);
        return {
          edges: nextEdges,
          tabs: syncTabNodesEdges(state.tabs, state.activeTabId, state.nodes, nextEdges),
        };
      });
    },

    setNodes: (nodesInput: FlowNode[] | ((nodes: FlowNode[]) => FlowNode[])) => {
      set((state) => {
        const nextNodes = typeof nodesInput === 'function' ? nodesInput(state.nodes) : nodesInput;
        return {
          nodes: nextNodes,
          tabs: syncTabNodesEdges(state.tabs, state.activeTabId, nextNodes, state.edges),
        };
      });
    },

    setEdges: (edgesInput: FlowEdge[] | ((edges: FlowEdge[]) => FlowEdge[])) => {
      set((state) => {
        const nextEdges = typeof edgesInput === 'function' ? edgesInput(state.edges) : edgesInput;
        return {
          edges: nextEdges,
          tabs: syncTabNodesEdges(state.tabs, state.activeTabId, state.nodes, nextEdges),
        };
      });
    },

    onConnect: (connection) => {
      const { globalEdgeOptions } = get();
      const newEdge = createDefaultEdge(connection.source!, connection.target!);

      newEdge.type = globalEdgeOptions.type === 'default' ? undefined : globalEdgeOptions.type;
      newEdge.animated = globalEdgeOptions.animated;
      newEdge.style = {
        ...newEdge.style,
        strokeWidth: globalEdgeOptions.strokeWidth,
        ...(globalEdgeOptions.color ? { stroke: globalEdgeOptions.color } : {}),
      };

      set((state) => {
        const nextEdges = addFlowEdge(newEdge, state.edges);
        return {
          edges: nextEdges,
          tabs: syncTabNodesEdges(state.tabs, state.activeTabId, state.nodes, nextEdges),
        };
      });
    },
  };
}
