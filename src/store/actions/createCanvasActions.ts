import { addFlowEdge, applyFlowEdgeChanges, applyFlowNodeChanges } from '@/lib/reactflowCompat';
import { createDefaultEdge } from '@/constants';
import type { FlowEdge, FlowNode } from '@/lib/types';
import type { FlowState } from '../types';
import { syncTabNodesEdges } from './syncTabNodesEdges';

type SetFlowState = (
  partial: Partial<FlowState> | ((state: FlowState) => Partial<FlowState>)
) => void;
type GetFlowState = () => FlowState;

export function createCanvasActions(
  set: SetFlowState,
  get: GetFlowState
): Pick<FlowState, 'onNodesChange' | 'onEdgesChange' | 'setNodes' | 'setEdges' | 'onConnect'> {
  return {
    onNodesChange: (changes) => {
      set((state) => {
        const resizedSectionIds = new Set(
          changes
            .filter(
              (change) =>
                change.type === 'dimensions' ||
                change.type === 'replace'
            )
            .map((change) => change.id)
        );
        const nextNodes = applyFlowNodeChanges(changes, state.nodes).map((node) => {
          if (node.type !== 'section' || !resizedSectionIds.has(node.id)) {
            return node;
          }

          return {
            ...node,
            data: {
              ...node.data,
              sectionSizingMode: 'manual' as const,
            },
          };
        }) as FlowNode[];
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
