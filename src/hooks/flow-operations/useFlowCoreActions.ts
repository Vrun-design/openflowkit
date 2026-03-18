import { useCallback } from 'react';
import type { OnSelectionChangeParams } from '@/lib/reactflowCompat';
import type { FlowStoreState } from '@/store';

interface UseFlowCoreActionsParams {
    setSelectedNodeId: (id: string | null) => void;
    setSelectedEdgeId: (id: string | null) => void;
    setNodes: FlowStoreState['setNodes'];
    setEdges: FlowStoreState['setEdges'];
    recordHistory: () => void;
    clearCanvasConfirmText: string;
}

interface UseFlowCoreActionsResult {
    onSelectionChange: (params: OnSelectionChangeParams) => void;
    handleClear: () => void;
}

export function useFlowCoreActions({
    setSelectedNodeId,
    setSelectedEdgeId,
    setNodes,
    setEdges,
    recordHistory,
    clearCanvasConfirmText,
}: UseFlowCoreActionsParams): UseFlowCoreActionsResult {
    const onSelectionChange = useCallback(({ nodes: selectedNodes, edges: selectedEdges }: OnSelectionChangeParams) => {
        // Only update what IS selected — never clear to null here.
        // Clearing is handled exclusively by onPaneClick so the PropertiesPanel
        // stays open when the user clicks inside it (which resets RF's selection state).
        if (selectedNodes.length > 0) {
            setSelectedNodeId(selectedNodes[0].id);
            setSelectedEdgeId(null);
        } else if (selectedEdges.length > 0) {
            setSelectedEdgeId(selectedEdges[0].id);
            setSelectedNodeId(null);
        }
        // If both are empty (click on pane), do nothing — let onPaneClick handle it.
    }, [setSelectedEdgeId, setSelectedNodeId]);

    const handleClear = useCallback(() => {
        if (!window.confirm(clearCanvasConfirmText)) {
            return;
        }
        recordHistory();
        setNodes(() => []);
        setEdges(() => []);
    }, [clearCanvasConfirmText, recordHistory, setEdges, setNodes]);

    return { onSelectionChange, handleClear };
}
