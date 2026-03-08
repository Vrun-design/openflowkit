import React from 'react';
import type { FlowNode } from '@/lib/types';
import type { AlignmentGuides, SelectionDragPreview } from './alignmentGuides';

interface FlowCanvasAlignmentGuidesOverlayProps {
    enabled: boolean;
    alignmentGuides: AlignmentGuides;
    selectionDragPreview: SelectionDragPreview;
    nodes: FlowNode[];
    zoom: number;
    viewportX: number;
    viewportY: number;
}

export function FlowCanvasAlignmentGuidesOverlay({
    enabled,
    alignmentGuides,
    selectionDragPreview,
    nodes,
    zoom,
    viewportX,
    viewportY,
}: FlowCanvasAlignmentGuidesOverlayProps): React.ReactElement | null {
    if (
        !enabled
        || (
            alignmentGuides.verticalFlowX === null
            && alignmentGuides.horizontalFlowY === null
            && !selectionDragPreview.mindmapDrop
        )
    ) {
        return null;
    }

    const mindmapPreview = selectionDragPreview.mindmapDrop;
    const targetParent = mindmapPreview?.targetParentId
        ? nodes.find((node) => node.id === mindmapPreview.targetParentId)
        : null;
    const rootNode = mindmapPreview?.rootId
        ? nodes.find((node) => node.id === mindmapPreview.rootId)
        : null;
    const targetWidth = targetParent?.width ?? 180;
    const targetHeight = targetParent?.height ?? 96;
    const rootWidth = rootNode?.width ?? 180;

    return (
        <div className="pointer-events-none absolute inset-0 z-50">
            {alignmentGuides.verticalFlowX !== null && (
                <div
                    className="absolute top-0 bottom-0 w-px bg-sky-500 shadow-[0_0_0_1px_rgba(255,255,255,0.35)]"
                    style={{ left: alignmentGuides.verticalFlowX * zoom + viewportX }}
                />
            )}
            {alignmentGuides.horizontalFlowY !== null && (
                <div
                    className="absolute left-0 right-0 h-px bg-sky-500 shadow-[0_0_0_1px_rgba(255,255,255,0.35)]"
                    style={{ top: alignmentGuides.horizontalFlowY * zoom + viewportY }}
                />
            )}
            {mindmapPreview?.mode === 'reparent' && targetParent && (
                <div
                    className="absolute rounded-2xl border-2 border-amber-500/90 bg-amber-200/15 shadow-[0_0_0_1px_rgba(255,255,255,0.4)]"
                    style={{
                        left: targetParent.position.x * zoom + viewportX - 10,
                        top: targetParent.position.y * zoom + viewportY - 10,
                        width: targetWidth * zoom + 20,
                        height: targetHeight * zoom + 20,
                    }}
                />
            )}
            {mindmapPreview?.targetSide && rootNode && (
                <div
                    className="absolute flex items-center justify-center rounded-full border border-amber-400/90 bg-white/95 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700 shadow-md"
                    style={{
                        left: (rootNode.position.x + rootWidth / 2) * zoom + viewportX + (mindmapPreview.targetSide === 'right' ? 96 : -96),
                        top: rootNode.position.y * zoom + viewportY - 26,
                        transform: 'translate(-50%, -100%)',
                    }}
                >
                    {mindmapPreview.targetSide} branch
                </div>
            )}
        </div>
    );
}
