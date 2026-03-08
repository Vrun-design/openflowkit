import type { FlowEdge, FlowNode } from '@/lib/types';
import { useFlowCanvasAlignmentGuides } from './useFlowCanvasAlignmentGuides';
import { useFlowCanvasNodeDragHandlers } from './useFlowCanvasNodeDragHandlers';

interface UseFlowCanvasSelectionToolsParams {
    layerAdjustedNodes: FlowNode[];
    edges: FlowEdge[];
    alignmentGuidesEnabled: boolean;
    toTypedFlowNode: (node: unknown) => FlowNode;
    onNodeDragStart: (event: unknown, node: FlowNode) => void;
    onNodeDrag: (event: unknown, node: FlowNode, draggedNodes: FlowNode[]) => void;
    onNodeDragStop: (event: unknown, node: FlowNode) => void;
    startInteractionLowDetail: () => void;
    endInteractionLowDetail: () => void;
}

export function useFlowCanvasSelectionTools({
    layerAdjustedNodes,
    edges,
    alignmentGuidesEnabled,
    toTypedFlowNode,
    onNodeDragStart,
    onNodeDrag,
    onNodeDragStop,
    startInteractionLowDetail,
    endInteractionLowDetail,
}: UseFlowCanvasSelectionToolsParams) {
    const alignmentGuides = useFlowCanvasAlignmentGuides({
        enabled: alignmentGuidesEnabled,
        layerAdjustedNodes,
        edges,
    });

    const dragHandlers = useFlowCanvasNodeDragHandlers({
        toTypedFlowNode,
        onNodeDragStart,
        onNodeDrag,
        onNodeDragStop,
        startInteractionLowDetail,
        endInteractionLowDetail,
        updateAlignmentGuidesForNode: alignmentGuides.updateAlignmentGuidesForNode,
        clearAlignmentGuides: alignmentGuides.clearAlignmentGuides,
    });

    return {
        alignmentGuides: alignmentGuides.alignmentGuides,
        selectionDragPreview: alignmentGuides.selectionDragPreview,
        ...dragHandlers,
    };
}
