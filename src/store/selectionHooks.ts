import { useShallow } from 'zustand/react/shallow';
import { useFlowStore } from '../store';
import type { FlowStoreState } from '../store';
import type { MermaidDiagnosticsSnapshot, PendingNodeLabelEditRequest } from './types';

export function useSelectionState(): Pick<FlowStoreState, 'selectedNodeId' | 'selectedEdgeId' | 'hoveredSectionId'> {
    return useFlowStore(
        useShallow((state) => ({
            selectedNodeId: state.selectedNodeId,
            selectedEdgeId: state.selectedEdgeId,
            hoveredSectionId: state.hoveredSectionId,
        }))
    );
}

export function useSelectedNodeId(): string | null {
    return useFlowStore((state) => state.selectedNodeId);
}

export function useSelectionActions(): Pick<FlowStoreState, 'setSelectedNodeId' | 'setSelectedEdgeId' | 'setHoveredSectionId'> {
    return useFlowStore(
        useShallow((state) => ({
            setSelectedNodeId: state.setSelectedNodeId,
            setSelectedEdgeId: state.setSelectedEdgeId,
            setHoveredSectionId: state.setHoveredSectionId,
        }))
    );
}

export function usePendingNodeLabelEditRequest(): PendingNodeLabelEditRequest | null {
    return useFlowStore((state) => state.pendingNodeLabelEditRequest);
}

export function useNodeLabelEditRequestActions(): Pick<
    FlowStoreState,
    'queuePendingNodeLabelEditRequest' | 'clearPendingNodeLabelEditRequest'
> {
    return useFlowStore(
        useShallow((state) => ({
            queuePendingNodeLabelEditRequest: state.queuePendingNodeLabelEditRequest,
            clearPendingNodeLabelEditRequest: state.clearPendingNodeLabelEditRequest,
        }))
    );
}

export function useMermaidDiagnostics(): MermaidDiagnosticsSnapshot | null {
    return useFlowStore((state) => state.mermaidDiagnostics);
}

export function useMermaidDiagnosticsActions(): Pick<
    FlowStoreState,
    'setMermaidDiagnostics' | 'clearMermaidDiagnostics'
> {
    return useFlowStore(
        useShallow((state) => ({
            setMermaidDiagnostics: state.setMermaidDiagnostics,
            clearMermaidDiagnostics: state.clearMermaidDiagnostics,
        }))
    );
}
