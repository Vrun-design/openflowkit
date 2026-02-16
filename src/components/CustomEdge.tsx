import React, { useCallback, useRef, useState, useMemo } from 'react';
import { BaseEdge, EdgeLabelRenderer, EdgeProps, getBezierPath, getSmoothStepPath, getStraightPath, useReactFlow, useViewport, useEdges } from 'reactflow';
import { EdgeData } from '@/lib/types';

// --- Parallel edge offset utility ---
// When multiple edges exist between the same pair of nodes, offset each so they don't overlap.
function getParallelEdgeOffset(
    edgeId: string,
    source: string,
    target: string,
    allEdges: { id: string; source: string; target: string }[]
): number {
    // Find all edges between same node pair (in either direction)
    const key1 = `${source}-${target}`;
    const key2 = `${target}-${source}`;
    const siblings = allEdges.filter(
        (e) => (`${e.source}-${e.target}` === key1 || `${e.source}-${e.target}` === key2)
    );
    if (siblings.length <= 1) return 0;

    const idx = siblings.findIndex((e) => e.id === edgeId);
    const count = siblings.length;
    // Center them: offset = (index - (count-1)/2) * spacing
    const spacing = 25;
    return (idx - (count - 1) / 2) * spacing;
}

// --- Self-loop path generator ---
function getSelfLoopPath(
    sourceX: number,
    sourceY: number,
    nodeWidth = 180,
    nodeHeight = 60,
    loopDirection: 'right' | 'top' | 'left' | 'bottom' = 'right'
): { path: string; labelX: number; labelY: number } {
    const size = Math.max(nodeWidth, nodeHeight) * 0.5;
    const offset = size * 0.8;

    let path: string;
    let labelX: number;
    let labelY: number;

    switch (loopDirection) {
        case 'top':
            path = `M ${sourceX - 15} ${sourceY} C ${sourceX - offset} ${sourceY - size * 1.5}, ${sourceX + offset} ${sourceY - size * 1.5}, ${sourceX + 15} ${sourceY}`;
            labelX = sourceX;
            labelY = sourceY - size * 1.2;
            break;
        case 'left':
            path = `M ${sourceX} ${sourceY - 15} C ${sourceX - size * 1.5} ${sourceY - offset}, ${sourceX - size * 1.5} ${sourceY + offset}, ${sourceX} ${sourceY + 15}`;
            labelX = sourceX - size * 1.2;
            labelY = sourceY;
            break;
        case 'bottom':
            path = `M ${sourceX - 15} ${sourceY} C ${sourceX - offset} ${sourceY + size * 1.5}, ${sourceX + offset} ${sourceY + size * 1.5}, ${sourceX + 15} ${sourceY}`;
            labelX = sourceX;
            labelY = sourceY + size * 1.2;
            break;
        case 'right':
        default:
            path = `M ${sourceX} ${sourceY - 15} C ${sourceX + size * 1.5} ${sourceY - offset}, ${sourceX + size * 1.5} ${sourceY + offset}, ${sourceX} ${sourceY + 15}`;
            labelX = sourceX + size * 1.2;
            labelY = sourceY;
            break;
    }

    return { path, labelX, labelY };
}

// --- CustomEdgeWrapper: renders edge path + draggable label ---
const CustomEdgeWrapper = ({
    id,
    path,
    labelX,
    labelY,
    markerEnd,
    style,
    data,
    label,
    markerStart,
}: {
    id: string;
    path: string;
    labelX: number;
    labelY: number;
    markerEnd?: string;
    style?: React.CSSProperties;
    data?: EdgeData;
    label?: string | React.ReactNode;
    markerStart?: string;
}) => {
    const { setEdges, screenToFlowPosition } = useReactFlow();
    const { zoom } = useViewport();
    const pathRef = useRef<SVGPathElement>(null);

    // Calculate position along path for label
    let posX = labelX;
    let posY = labelY;

    if (pathRef.current && typeof data?.labelPosition === 'number') {
        const len = pathRef.current.getTotalLength();
        const point = pathRef.current.getPointAtLength(len * data.labelPosition);
        posX = point.x;
        posY = point.y;
    }

    const onLabelPointerDown = (event: React.PointerEvent) => {
        event.stopPropagation();
        event.preventDefault();
        const pathNode = pathRef.current;
        if (!pathNode) return;

        const onPointerMove = (e: PointerEvent) => {
            e.preventDefault();
            const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
            const pathLen = pathNode.getTotalLength();
            let bestLen = 0;
            let bestDist = Infinity;

            for (let l = 0; l <= pathLen; l += 10) {
                const p = pathNode.getPointAtLength(l);
                const dx = p.x - flowPos.x;
                const dy = p.y - flowPos.y;
                const d = dx * dx + dy * dy;
                if (d < bestDist) { bestDist = d; bestLen = l; }
            }
            for (let l = Math.max(0, bestLen - 10); l <= Math.min(pathLen, bestLen + 10); l += 1) {
                const p = pathNode.getPointAtLength(l);
                const dx = p.x - flowPos.x;
                const dy = p.y - flowPos.y;
                const d = dx * dx + dy * dy;
                if (d < bestDist) { bestDist = d; bestLen = l; }
            }

            setEdges((edges) => edges.map((edge) => {
                if (edge.id === id) {
                    return {
                        ...edge,
                        data: { ...edge.data, labelPosition: bestLen / pathLen, labelOffsetX: 0, labelOffsetY: 0 }
                    };
                }
                return edge;
            }));
        };

        const onPointerUp = (e: PointerEvent) => {
            e.preventDefault();
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    return (
        <>
            <BaseEdge path={path} markerEnd={markerEnd} markerStart={markerStart} style={style} />
            <path ref={pathRef} d={path} style={{ display: 'none' }} fill="none" stroke="none" aria-hidden="true" />

            {label && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${posX}px,${posY}px)`,
                            fontSize: 12,
                            pointerEvents: 'all',
                        }}
                        className="nodrag nopan"
                    >
                        <div
                            onPointerDown={onLabelPointerDown}
                            className="bg-white px-2 py-1 rounded border border-slate-200 shadow-sm text-xs font-medium text-slate-600 cursor-move hover:ring-2 hover:ring-indigo-500/20 active:ring-indigo-500 select-none"
                        >
                            {label}
                        </div>
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
};

// --- Edge components with parallel offset and self-loop support ---

// Helper to get offset vector based on handle position
function getOffsetVector(position: string, offset: number) {
    switch (position) {
        case 'top':
        case 'bottom':
            return { x: offset, y: 0 };
        case 'left':
        case 'right':
            return { x: 0, y: offset };
        default:
            return { x: 0, y: 0 };
    }
}

export const CustomBezierEdge = (props: EdgeProps<EdgeData>) => {
    const allEdges = useEdges();
    let edgePath = '';
    let labelX = 0;
    let labelY = 0;

    if (props.source === props.target) {
        const loop = getSelfLoopPath(props.sourceX, props.sourceY, 180, 60, props.sourcePosition as any);
        edgePath = loop.path;
        labelX = loop.labelX;
        labelY = loop.labelY;
    } else {
        const offset = getParallelEdgeOffset(props.id, props.source, props.target, allEdges);
        const sourceOffset = getOffsetVector(props.sourcePosition, offset);
        const targetOffset = getOffsetVector(props.targetPosition, offset);

        [edgePath, labelX, labelY] = getBezierPath({
            sourceX: props.sourceX + sourceOffset.x,
            sourceY: props.sourceY + sourceOffset.y,
            sourcePosition: props.sourcePosition,
            targetX: props.targetX + targetOffset.x,
            targetY: props.targetY + targetOffset.y,
            targetPosition: props.targetPosition,
            curvature: 0.25,
        });
    }

    return <CustomEdgeWrapper id={props.id} path={edgePath} labelX={labelX} labelY={labelY} {...props} />;
};

export const CustomSmoothStepEdge = (props: EdgeProps<EdgeData>) => {
    const allEdges = useEdges();
    let edgePath = '';
    let labelX = 0;
    let labelY = 0;

    if (props.source === props.target) {
        const loop = getSelfLoopPath(props.sourceX, props.sourceY, 180, 60, props.sourcePosition as any);
        edgePath = loop.path;
        labelX = loop.labelX;
        labelY = loop.labelY;
    } else {
        const offset = getParallelEdgeOffset(props.id, props.source, props.target, allEdges);
        // smoothstep handles offset internally via 'offset' param, but that separates the SEGMENTS, not the start/end.
        // To separate start/end, we must shift the points too.
        const sourceOffset = getOffsetVector(props.sourcePosition, offset);
        const targetOffset = getOffsetVector(props.targetPosition, offset);

        [edgePath, labelX, labelY] = getSmoothStepPath({
            sourceX: props.sourceX + sourceOffset.x,
            sourceY: props.sourceY + sourceOffset.y,
            sourcePosition: props.sourcePosition,
            targetX: props.targetX + targetOffset.x,
            targetY: props.targetY + targetOffset.y,
            targetPosition: props.targetPosition,
            offset: 20, // Standard segment offset
        });
    }

    return <CustomEdgeWrapper id={props.id} path={edgePath} labelX={labelX} labelY={labelY} {...props} />;
};

export const CustomStepEdge = (props: EdgeProps<EdgeData>) => {
    const allEdges = useEdges();
    let edgePath = '';
    let labelX = 0;
    let labelY = 0;

    if (props.source === props.target) {
        const loop = getSelfLoopPath(props.sourceX, props.sourceY, 180, 60, props.sourcePosition as any);
        edgePath = loop.path;
        labelX = loop.labelX;
        labelY = loop.labelY;
    } else {
        const offset = getParallelEdgeOffset(props.id, props.source, props.target, allEdges);
        const sourceOffset = getOffsetVector(props.sourcePosition, offset);
        const targetOffset = getOffsetVector(props.targetPosition, offset);

        [edgePath, labelX, labelY] = getSmoothStepPath({
            sourceX: props.sourceX + sourceOffset.x,
            sourceY: props.sourceY + sourceOffset.y,
            sourcePosition: props.sourcePosition,
            targetX: props.targetX + targetOffset.x,
            targetY: props.targetY + targetOffset.y,
            targetPosition: props.targetPosition,
            borderRadius: 0,
            offset: 20,
        });
    }

    return <CustomEdgeWrapper id={props.id} path={edgePath} labelX={labelX} labelY={labelY} {...props} />;
};

export default CustomSmoothStepEdge;
