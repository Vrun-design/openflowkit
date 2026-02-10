import React, { useMemo } from 'react';
import { ConnectionLineComponentProps, getBezierPath, useNodes } from 'reactflow';
import { Settings } from 'lucide-react';
import { NODE_WIDTH, NODE_HEIGHT } from '../constants';

const CustomConnectionLine = ({
    fromX,
    fromY,
    fromPosition,
    toX,
    toY,
    toPosition,
}: ConnectionLineComponentProps) => {
    const nodes = useNodes<any>();

    const isNearNode = useMemo(() => {
        return nodes.some(node => {
            const nX = node.position.x;
            const nY = node.position.y;
            const w = node.width || node.data?.width || NODE_WIDTH;
            const h = node.height || node.data?.height || NODE_HEIGHT;

            const hPoints = [
                { x: nX + w / 2, y: nY }, // Top
                { x: nX + w / 2, y: nY + h }, // Bottom
                { x: nX, y: nY + h / 2 }, // Left
                { x: nX + w, y: nY + h / 2 }, // Right
            ];

            return hPoints.some(hp => {
                const dist = Math.sqrt((hp.x - toX) ** 2 + (hp.y - toY) ** 2);
                return dist < 45; // Slightly larger for better feel
            });
        });
    }, [nodes, toX, toY]);

    const [edgePath] = getBezierPath({
        sourceX: fromX,
        sourceY: fromY,
        sourcePosition: fromPosition,
        targetX: toX,
        targetY: toY,
        targetPosition: toPosition,
    });

    return (
        <g>
            <path
                fill="none"
                stroke="#6366f1"
                strokeWidth={2}
                strokeDasharray="5,5"
                className="animate-pulse"
                d={edgePath}
            />

            {/* Ghost Node Preview - Hide when near existing node */}
            {!isNearNode && (
                <foreignObject
                    x={toX - NODE_WIDTH / 2}
                    y={toY - NODE_HEIGHT / 2}
                    width={NODE_WIDTH}
                    height={NODE_HEIGHT}
                    className="pointer-events-none"
                >
                    <div className="w-full h-full bg-indigo-50/20 backdrop-blur-[1px] border-2 border-indigo-200/40 border-dashed rounded-xl flex flex-col justify-center p-4 ring-2 ring-indigo-500/10 transition-all">
                        <div className="flex items-center gap-3 opacity-40">
                            <div className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-100/50 border border-indigo-200/50">
                                <Settings className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div className="flex flex-col gap-1.5 flex-1">
                                <div className="h-3 w-2/3 bg-indigo-200/50 rounded-full" />
                                <div className="h-2 w-1/2 bg-indigo-100/50 rounded-full" />
                            </div>
                        </div>
                        <div className="mt-4 h-16 w-full bg-slate-50/20 rounded-lg border border-slate-200/20 border-dashed" />
                    </div>
                </foreignObject>
            )}

            <circle
                cx={toX}
                cy={toY}
                fill="#fff"
                r={4}
                stroke="#6366f1"
                strokeWidth={2}
            />
        </g>
    );
};

export default CustomConnectionLine;
