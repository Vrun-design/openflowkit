import { useCallback, useState } from 'react';
import type { FlowEdge, FlowNode } from '@/lib/types';
import { computeMindmapDropPreview } from '@/lib/mindmapLayout';
import { computeAlignmentGuides, type AlignmentGuides, type SelectionDragPreview } from './alignmentGuides';

interface UseFlowCanvasAlignmentGuidesParams {
    enabled: boolean;
    layerAdjustedNodes: FlowNode[];
    edges: FlowEdge[];
}

export function useFlowCanvasAlignmentGuides({
    enabled,
    layerAdjustedNodes,
    edges,
}: UseFlowCanvasAlignmentGuidesParams) {
    const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuides>({
        verticalFlowX: null,
        horizontalFlowY: null,
    });
    const [selectionDragPreview, setSelectionDragPreview] = useState<SelectionDragPreview>({
        mindmapDrop: null,
    });

    const updateAlignmentGuidesForNode = useCallback((draggedNode: FlowNode): void => {
        if (!enabled) {
            return;
        }
        setAlignmentGuides(computeAlignmentGuides(draggedNode, layerAdjustedNodes));
        setSelectionDragPreview({
            mindmapDrop: computeMindmapDropPreview(layerAdjustedNodes, edges, draggedNode.id),
        });
    }, [edges, enabled, layerAdjustedNodes]);

    const clearAlignmentGuides = useCallback((): void => {
        if (!enabled) {
            return;
        }
        setAlignmentGuides({ verticalFlowX: null, horizontalFlowY: null });
        setSelectionDragPreview({ mindmapDrop: null });
    }, [enabled]);

    return {
        alignmentGuides,
        selectionDragPreview,
        updateAlignmentGuidesForNode,
        clearAlignmentGuides,
    };
}
