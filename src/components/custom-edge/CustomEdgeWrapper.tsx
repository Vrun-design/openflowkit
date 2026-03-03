import React, { useEffect, useRef } from 'react';
import { BaseEdge, EdgeLabelRenderer, useReactFlow } from 'reactflow';
import { useDesignSystem } from '@/hooks/useDesignSystem';
import type { EdgeData } from '@/lib/types';

interface CustomEdgeWrapperProps {
    id: string;
    path: string;
    labelX: number;
    labelY: number;
    markerEnd?: string;
    style?: React.CSSProperties;
    data?: EdgeData;
    label?: string | React.ReactNode;
    markerStart?: string;
}

export function CustomEdgeWrapper({
    id,
    path,
    labelX,
    labelY,
    markerEnd,
    style,
    data,
    label,
    markerStart,
}: CustomEdgeWrapperProps): React.ReactElement {
    const { setEdges, screenToFlowPosition } = useReactFlow();
    const pathRef = useRef<SVGPathElement>(null);
    const labelRef = useRef<HTMLDivElement>(null);
    const designSystem = useDesignSystem();

    const resolvedStyle: React.CSSProperties = {
        stroke: designSystem.colors.edge,
        strokeWidth: designSystem.components.edge.strokeWidth,
        ...style,
    };

    useEffect(() => {
        const labelNode = labelRef.current;
        if (!labelNode) return;

        if (typeof data?.labelPosition !== 'number') {
            labelNode.style.transform = `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`;
            return;
        }

        const pathNode = pathRef.current;
        if (!pathNode) {
            labelNode.style.transform = `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`;
            return;
        }

        const length = pathNode.getTotalLength();
        const point = pathNode.getPointAtLength(length * data.labelPosition);
        labelNode.style.transform = `translate(-50%, -50%) translate(${point.x}px,${point.y}px)`;
    }, [data?.labelPosition, labelX, labelY, path]);

    const onLabelPointerDown = (event: React.PointerEvent): void => {
        event.stopPropagation();
        event.preventDefault();
        const pathNode = pathRef.current;
        if (!pathNode) return;

        const onPointerMove = (moveEvent: PointerEvent): void => {
            moveEvent.preventDefault();
            const flowPos = screenToFlowPosition({ x: moveEvent.clientX, y: moveEvent.clientY });
            const pathLength = pathNode.getTotalLength();
            let bestLength = 0;
            let bestDistance = Infinity;

            for (let length = 0; length <= pathLength; length += 10) {
                const point = pathNode.getPointAtLength(length);
                const dx = point.x - flowPos.x;
                const dy = point.y - flowPos.y;
                const distance = dx * dx + dy * dy;
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestLength = length;
                }
            }

            for (let length = Math.max(0, bestLength - 10); length <= Math.min(pathLength, bestLength + 10); length += 1) {
                const point = pathNode.getPointAtLength(length);
                const dx = point.x - flowPos.x;
                const dy = point.y - flowPos.y;
                const distance = dx * dx + dy * dy;
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestLength = length;
                }
            }

            setEdges((edges) => {
                return edges.map((edge) => {
                    if (edge.id !== id) return edge;
                    return {
                        ...edge,
                        data: { ...edge.data, labelPosition: bestLength / pathLength, labelOffsetX: 0, labelOffsetY: 0 },
                    };
                });
            });
        };

        const onPointerUp = (upEvent: PointerEvent): void => {
            upEvent.preventDefault();
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    return (
        <>
            <BaseEdge path={path} markerEnd={markerEnd} markerStart={markerStart} style={resolvedStyle} />
            <path ref={pathRef} d={path} style={{ display: 'none' }} fill="none" stroke="none" aria-hidden="true" />

            {label && (
                <EdgeLabelRenderer>
                    <div
                        ref={labelRef}
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
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
}
