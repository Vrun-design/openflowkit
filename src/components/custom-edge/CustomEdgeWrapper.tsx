import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BaseEdge, EdgeLabelRenderer, useReactFlow } from '@/lib/reactflowCompat';
import { ROLLOUT_FLAGS } from '@/config/rolloutFlags';
import { MarkerType } from '@/lib/reactflowCompat';
import { useDesignSystem } from '@/hooks/useDesignSystem';
import type { EdgeData, FlowEdge } from '@/lib/types';
import {
    CLASS_MARKER_ARROW_FILLED,
    CLASS_MARKER_ARROW_OPEN,
    CLASS_MARKER_DIAMOND_FILLED,
    CLASS_MARKER_DIAMOND_OPEN,
    CLASS_MARKER_TRIANGLE_OPEN,
    ER_MARKER_BAR,
    ER_MARKER_CIRCLE,
    ER_MARKER_CROW,
    resolveRelationVisualSpec,
    toMarkerUrl,
} from './classRelationSemantics';
import { resolveStandardEdgeMarkers } from './standardEdgeMarkers';

interface CustomEdgeWrapperProps {
    id: string;
    path: string;
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
    labelX: number;
    labelY: number;
    markerEnd?: string;
    markerEndConfig?: FlowEdge['markerEnd'];
    style?: React.CSSProperties;
    data?: EdgeData;
    label?: string | React.ReactNode;
    markerStart?: string;
    markerStartConfig?: FlowEdge['markerStart'];
    selected?: boolean;
}

function toLabelTransform(x: number, y: number): string {
    return `translate(-50%, -50%) translate(${x}px,${y}px)`;
}

export function CustomEdgeWrapper({
    id,
    path,
    sourceX,
    sourceY,
    targetX,
    targetY,
    labelX,
    labelY,
    markerEnd,
    markerEndConfig,
    style,
    data,
    label,
    markerStart,
    markerStartConfig,
    selected = false,
}: CustomEdgeWrapperProps): React.ReactElement {
    const { setEdges, screenToFlowPosition } = useReactFlow();
    const pathRef = useRef<SVGPathElement>(null);
    const labelRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);
    const designSystem = useDesignSystem();
    const visualQualityV2Enabled = ROLLOUT_FLAGS.visualQualityV2;
    const relationSemanticsV1Enabled = ROLLOUT_FLAGS.relationSemanticsV1;
    const canvasInteractionsV1Enabled = ROLLOUT_FLAGS.canvasInteractionsV1;

    const relationVisualSpec = resolveRelationVisualSpec(
        relationSemanticsV1Enabled,
        data,
        label
    );

    const relationStyle: React.CSSProperties = relationVisualSpec?.dashed
        ? { strokeDasharray: '6 4' }
        : { strokeDasharray: undefined };

    const resolvedStyle: React.CSSProperties = {
        stroke: designSystem.colors.edge,
        strokeWidth: designSystem.components.edge.strokeWidth,
        ...style,
        ...relationStyle,
    };

    const relationResolvedMarkerStart = relationVisualSpec
        ? toMarkerUrl(relationVisualSpec.markerStartId)
        : markerStart;
    const relationResolvedMarkerEnd = relationVisualSpec
        ? toMarkerUrl(relationVisualSpec.markerEndId)
        : markerEnd;
    const standardMarkers = resolveStandardEdgeMarkers({
        connectorModelEnabled: !relationVisualSpec,
        edgeId: id,
        markerStartUrl: relationResolvedMarkerStart,
        markerEndUrl: relationResolvedMarkerEnd,
        markerStartConfig: typeof markerStartConfig === 'object' ? markerStartConfig as {
            type?: MarkerType | string;
            color?: string;
            width?: number;
            height?: number;
        } : undefined,
        markerEndConfig: typeof markerEndConfig === 'object' ? markerEndConfig as {
            type?: MarkerType | string;
            color?: string;
            width?: number;
            height?: number;
        } : undefined,
        stroke: String(resolvedStyle.stroke ?? designSystem.colors.edge),
    });
    const resolvedMarkerStart = standardMarkers.markerStartUrl;
    const resolvedMarkerEnd = standardMarkers.markerEndUrl;
    const isAnimated = selected || isHovered;
    const animatedStrokeStyle = useMemo<React.CSSProperties>(() => {
        return {
            stroke: resolvedStyle.stroke,
            strokeWidth: Math.max(Number(resolvedStyle.strokeWidth ?? 2), 2),
            strokeDasharray: typeof resolvedStyle.strokeDasharray === 'string' && resolvedStyle.strokeDasharray.length > 0
                ? resolvedStyle.strokeDasharray
                : '8 8',
        };
    }, [resolvedStyle.stroke, resolvedStyle.strokeDasharray, resolvedStyle.strokeWidth]);

    useEffect(() => {
        const labelNode = labelRef.current;
        if (!labelNode) return;

        if (typeof data?.labelPosition !== 'number') {
            labelNode.style.transform = toLabelTransform(labelX, labelY);
            return;
        }

        const pathNode = pathRef.current;
        if (!pathNode) {
            labelNode.style.transform = toLabelTransform(labelX, labelY);
            return;
        }

        const length = pathNode.getTotalLength();
        const point = pathNode.getPointAtLength(length * data.labelPosition);
        labelNode.style.transform = toLabelTransform(point.x, point.y);
    }, [data?.labelPosition, labelX, labelY, path]);

    const updateEdgeData = (updater: (edgeData: EdgeData | undefined) => EdgeData): void => {
        setEdges((edges) => {
            return edges.map((edge) => {
                if (edge.id !== id) return edge;
                return {
                    ...edge,
                    data: updater(edge.data as EdgeData | undefined),
                };
            });
        });
    };

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

            updateEdgeData((edgeData) => ({
                ...edgeData,
                labelPosition: bestLength / pathLength,
                labelOffsetX: 0,
                labelOffsetY: 0,
            }));
        };

        const onPointerUp = (upEvent: PointerEvent): void => {
            upEvent.preventDefault();
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    const hasArchitectureMeta = typeof data?.archProtocol === 'string' && data.archProtocol.length > 0;
    const direction = typeof data?.archDirection === 'string' ? data.archDirection : '-->';
    const directionGlyph = direction === '<--' ? '<-' : direction === '<-->' ? '<->' : '->';
    const sourceSide = typeof data?.archSourceSide === 'string' ? data.archSourceSide : '';
    const targetSide = typeof data?.archTargetSide === 'string' ? data.archTargetSide : '';
    const sideHint = sourceSide || targetSide ? `${sourceSide || '?'}${directionGlyph}${targetSide || '?'}` : '';
    const renderedLabel = hasArchitectureMeta
        ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700 border border-blue-200">
                {sideHint && <span className="text-blue-500">{sideHint}</span>}
                <span>{data?.archProtocol}</span>
                {data?.archPort && <span className="text-blue-500">:{data.archPort}</span>}
            </span>
        )
        : label;

    return (
        <>
            <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
                <defs>
                    <marker id={CLASS_MARKER_ARROW_FILLED} markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L10,5 L0,10 z" fill="context-stroke" />
                    </marker>
                    <marker id={CLASS_MARKER_ARROW_OPEN} markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="strokeWidth">
                        <path d="M1,1 L9,5 L1,9" fill="none" stroke="context-stroke" strokeWidth="1.5" />
                    </marker>
                    <marker id={CLASS_MARKER_TRIANGLE_OPEN} markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="strokeWidth">
                        <path d="M1,1 L10,6 L1,11 z" fill="white" stroke="context-stroke" strokeWidth="1.5" />
                    </marker>
                    <marker id={CLASS_MARKER_DIAMOND_OPEN} markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="strokeWidth">
                        <path d="M1,6 L5.5,1 L10,6 L5.5,11 z" fill="white" stroke="context-stroke" strokeWidth="1.5" />
                    </marker>
                    <marker id={CLASS_MARKER_DIAMOND_FILLED} markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="strokeWidth">
                        <path d="M1,6 L5.5,1 L10,6 L5.5,11 z" fill="context-stroke" />
                    </marker>
                    <marker id={ER_MARKER_BAR} markerWidth="8" markerHeight="12" refX="6" refY="6" orient="auto" markerUnits="strokeWidth">
                        <path d="M1,1 L1,11" fill="none" stroke="context-stroke" strokeWidth="1.6" />
                    </marker>
                    <marker id={ER_MARKER_CIRCLE} markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto" markerUnits="strokeWidth">
                        <circle cx="4" cy="6" r="2.7" fill="white" stroke="context-stroke" strokeWidth="1.4" />
                    </marker>
                    <marker id={ER_MARKER_CROW} markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="strokeWidth">
                        <path d="M1,1 L10,6 L1,11 M1,6 L10,6" fill="none" stroke="context-stroke" strokeWidth="1.4" />
                    </marker>
                    {standardMarkers.defs.map((markerDef) => (
                        <marker
                            key={markerDef.id}
                            id={markerDef.id}
                            markerWidth={markerDef.width}
                            markerHeight={markerDef.height}
                            refX={markerDef.side === 'end' ? markerDef.width - 1 : 1}
                            refY={markerDef.height / 2}
                            orient={markerDef.side === 'start' ? 'auto-start-reverse' : 'auto'}
                            markerUnits="userSpaceOnUse"
                        >
                            <path
                                d={`M0,0 L${markerDef.width},${markerDef.height / 2} L0,${markerDef.height} z`}
                                fill={markerDef.color}
                            />
                        </marker>
                    ))}
                </defs>
            </svg>
            <BaseEdge path={path} markerEnd={resolvedMarkerEnd} markerStart={resolvedMarkerStart} style={resolvedStyle} />
            {isAnimated && (
                <path
                    d={path}
                    fill="none"
                    strokeLinecap="round"
                    style={animatedStrokeStyle}
                    className="flow-edge-animated-overlay"
                    pointerEvents="none"
                    aria-hidden="true"
                />
            )}
            <path
                d={path}
                fill="none"
                stroke="rgba(15,23,42,0.001)"
                strokeWidth={20}
                pointerEvents="stroke"
                onPointerEnter={() => setIsHovered(true)}
                onPointerLeave={() => setIsHovered(false)}
                aria-hidden="true"
            >
                {canvasInteractionsV1Enabled && <title>Select edge</title>}
            </path>
            <path ref={pathRef} d={path} style={{ display: 'none' }} fill="none" stroke="none" aria-hidden="true" />

            {renderedLabel && (
                <EdgeLabelRenderer>
                    <div
                        ref={labelRef}
                        style={{
                            position: 'absolute',
                            transform: toLabelTransform(labelX, labelY),
                            fontSize: 12,
                            pointerEvents: 'all',
                        }}
                        onPointerEnter={() => setIsHovered(true)}
                        onPointerLeave={() => setIsHovered(false)}
                        className={`flow-edge-label nodrag nopan ${selected || isHovered ? 'flow-lod-preserve' : ''}`}
                    >
                        <div
                            onPointerDown={onLabelPointerDown}
                            className={
                                visualQualityV2Enabled
                                    ? 'bg-white/95 px-2.5 py-0.5 rounded-full border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.08)] text-[11px] font-medium text-slate-500 hover:border-indigo-300 hover:text-slate-700 hover:shadow-md active:ring-2 active:ring-indigo-400 select-none flow-lod-secondary flow-lod-shadow transition-all'
                                    : 'bg-white px-2 py-1 rounded border border-slate-200 shadow-sm text-xs font-medium text-slate-600 hover:ring-2 hover:ring-indigo-500/20 active:ring-indigo-500 select-none flow-lod-secondary flow-lod-shadow'
                            }
                        >
                            {renderedLabel}
                        </div>
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
}
