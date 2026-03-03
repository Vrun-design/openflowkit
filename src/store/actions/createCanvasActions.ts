import { addEdge, applyEdgeChanges, applyNodeChanges } from 'reactflow';
import { createDefaultEdge } from '@/constants';
import type { FlowEdge, FlowNode } from '@/lib/types';
import type { FlowState } from '../types';

type SetFlowState = (partial: Partial<FlowState> | ((state: FlowState) => Partial<FlowState>)) => void;
type GetFlowState = () => FlowState;

export function createCanvasActions(set: SetFlowState, get: GetFlowState): Pick<
    FlowState,
    'onNodesChange' | 'onEdgesChange' | 'setNodes' | 'setEdges' | 'onConnect'
> {
    return {
        onNodesChange: (changes) => {
            set({
                nodes: applyNodeChanges(changes, get().nodes),
            });
        },

        onEdgesChange: (changes) => {
            set({
                edges: applyEdgeChanges(changes, get().edges),
            });
        },

        setNodes: (nodesInput: FlowNode[] | ((nodes: FlowNode[]) => FlowNode[])) => {
            set((state) => ({
                nodes: typeof nodesInput === 'function' ? nodesInput(state.nodes) : nodesInput,
            }));
        },

        setEdges: (edgesInput: FlowEdge[] | ((edges: FlowEdge[]) => FlowEdge[])) => {
            set((state) => ({
                edges: typeof edgesInput === 'function' ? edgesInput(state.edges) : edgesInput,
            }));
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

            set({
                edges: addEdge(newEdge, get().edges),
            });
        },
    };
}
