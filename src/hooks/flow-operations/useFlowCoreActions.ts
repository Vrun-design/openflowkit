import { useCallback } from 'react';
import type { OnSelectionChangeParams } from 'reactflow';
import { trackEvent } from '@/lib/analytics';
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
        setSelectedNodeId(selectedNodes.length > 0 ? selectedNodes[0].id : null);
        setSelectedEdgeId(selectedNodes.length === 0 && selectedEdges.length > 0 ? selectedEdges[0].id : null);
    }, [setSelectedEdgeId, setSelectedNodeId]);

    const handleClear = useCallback(() => {
        if (!window.confirm(clearCanvasConfirmText)) {
            return;
        }
        recordHistory();
        setNodes(() => []);
        setEdges(() => []);
        trackEvent('clear_canvas');
    }, [clearCanvasConfirmText, recordHistory, setEdges, setNodes]);

    return { onSelectionChange, handleClear };
}
