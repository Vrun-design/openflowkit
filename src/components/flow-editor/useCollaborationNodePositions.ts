import { useMemo } from 'react';
import type { FlowNode } from '@/lib/types';

export interface CollaborationNodePosition {
    x: number;
    y: number;
    width: number;
    height: number;
}

export function useCollaborationNodePositions(
    enabled: boolean,
    nodes: FlowNode[],
    remotePresenceCount: number
): Map<string, CollaborationNodePosition> | undefined {
    return useMemo(() => {
        if (!enabled || remotePresenceCount === 0) {
            return undefined;
        }

        const positions = new Map<string, CollaborationNodePosition>();
        for (const node of nodes) {
            positions.set(node.id, {
                x: node.position.x,
                y: node.position.y,
                width: (node.measured?.width ?? node.width) ?? 150,
                height: (node.measured?.height ?? node.height) ?? 40,
            });
        }

        return positions;
    }, [enabled, nodes, remotePresenceCount]);
}
