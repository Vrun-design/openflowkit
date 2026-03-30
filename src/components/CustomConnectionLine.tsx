import React from 'react';
import { ConnectionLineComponentProps, getBezierPath, useNodes } from '@/lib/reactflowCompat';
import { NODE_WIDTH, NODE_HEIGHT } from '../constants';
import type { FlowNode } from '@/lib/types';

const SNAP_PADDING = 56;

const CustomConnectionLine = ({
    fromX,
    fromY,
    fromPosition,
    toX,
    toY,
    toPosition,
}: ConnectionLineComponentProps) => {
    const nodes = useNodes<FlowNode>();

    let isNearNode = false;
    for (const node of nodes) {
        const nX = node.position.x;
        const nY = node.position.y;
        const w = node.width || node.data?.width || NODE_WIDTH;
        const h = node.height || node.data?.height || NODE_HEIGHT;
        const inside =
            toX >= nX - SNAP_PADDING &&
            toX <= nX + w + SNAP_PADDING &&
            toY >= nY - SNAP_PADDING &&
            toY <= nY + h + SNAP_PADDING;
        if (inside) {
            isNearNode = true;
            break;
        }
    }

    const [edgePath] = getBezierPath({
        sourceX: fromX,
        sourceY: fromY,
        sourcePosition: fromPosition,
        targetX: toX,
        targetY: toY,
        targetPosition: toPosition,
    });
    const connectionStroke = 'var(--brand-primary, #6366f1)';

    return (
        <g>
            <path
                fill="none"
                stroke={connectionStroke}
                strokeWidth={2.5}
                strokeDasharray={isNearNode ? '8 6' : '6 8'}
                strokeLinecap="round"
                style={{
                    filter: 'drop-shadow(0 1px 3px rgba(99,102,241,0.25))',
                    animation: 'flow-connection-dash 0.8s linear infinite',
                }}
                d={edgePath}
            />

            {isNearNode ? (
                <circle
                    cx={toX}
                    cy={toY}
                    r={9}
                    fill={connectionStroke}
                    opacity={0.18}
                    className="animate-ping"
                />
            ) : null}
            <circle
                cx={toX}
                cy={toY}
                r={isNearNode ? 6 : 4}
                fill={connectionStroke}
                opacity={isNearNode ? 1 : 0.6}
            />
            {isNearNode ? (
                <circle
                    cx={toX}
                    cy={toY}
                    r={3}
                    fill="white"
                    opacity={0.95}
                />
            ) : null}
            <style>
                {`
                    @keyframes flow-connection-dash {
                        from {
                            stroke-dashoffset: 20;
                        }
                        to {
                            stroke-dashoffset: 0;
                        }
                    }
                `}
            </style>
        </g>
    );
};

export default CustomConnectionLine;
