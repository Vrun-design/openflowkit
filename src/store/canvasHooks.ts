import { useShallow } from 'zustand/react/shallow';
import { useFlowStore } from '../store';
import type { FlowStoreState } from '../store';

export function useCanvasState(): Pick<FlowStoreState, 'nodes' | 'edges'> {
    return useFlowStore(
        useShallow((state) => ({
            nodes: state.nodes,
            edges: state.edges,
        }))
    );
}

export function useCanvasActions(): Pick<
    FlowStoreState,
    'onNodesChange' | 'onEdgesChange' | 'setNodes' | 'setEdges' | 'onConnect'
> {
    return useFlowStore(
        useShallow((state) => ({
            onNodesChange: state.onNodesChange,
            onEdgesChange: state.onEdgesChange,
            setNodes: state.setNodes,
            setEdges: state.setEdges,
            onConnect: state.onConnect,
        }))
    );
}
