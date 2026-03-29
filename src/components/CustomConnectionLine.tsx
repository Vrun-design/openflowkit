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

    return (
        <g>
            <path
                fill="none"
                stroke="var(--brand-primary, #6366f1)"
                strokeWidth={2}
                style={{ filter: 'drop-shadow(0 1px 3px rgba(99,102,241,0.25))' }}
                d={edgePath}
            />

            {/* Endpoint dot — grows subtly on snap without outlining the whole node */}
            <circle
                cx={toX}
                cy={toY}
                r={isNearNode ? 6 : 4}
                fill="var(--brand-primary, #6366f1)"
                opacity={isNearNode ? 1 : 0.6}
            />
        </g>
    );
};

export default CustomConnectionLine;
