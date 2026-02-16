import { Node, Edge } from 'reactflow';
import { NODE_WIDTH, NODE_HEIGHT } from '../constants';

/**
 * Assign intelligent `sourceHandle` and `targetHandle` to each edge
 * based on the relative positions of connected nodes.
 *
 * This produces natural edge routing:
 * - If target is below source → bottom→top
 * - If target is right of source → right→left
 * - Bidirectional edges use different handle pairs
 * - Multiple edges between same pair distribute across handles
 */
// Helper to get absolute position
function getAbsolutePosition(node: Node, nodeMap: Map<string, Node>): { x: number, y: number } {
    // We intentionally ignore node.positionAbsolute here because during drag operations
    // in React Flow, the positionAbsolute might be stale or not yet updated in the store
    // while node.position (relative) is updated.
    // To ensure smooth "magnetic" routing, we always calculate absolute position
    // from the hierarchy.

    let x = node.position.x;
    let y = node.position.y;
    let currentParentId = node.parentNode;

    while (currentParentId) {
        const parent = nodeMap.get(currentParentId);
        if (parent) {
            x += parent.position.x;
            y += parent.position.y;
            currentParentId = parent.parentNode;
        } else {
            break;
        }
    }
    return { x, y };
}

// Helper to get node dimensions robustly
function getNodeDimensions(node: Node): { width: number, height: number } {
    const measured = (node as any).measured;
    if (measured && measured.width && measured.height) {
        return { width: measured.width, height: measured.height };
    }

    const styleWidth = node.style?.width;
    const styleHeight = node.style?.height;

    const w = typeof styleWidth === 'string' && styleWidth.endsWith('px')
        ? parseFloat(styleWidth)
        : (typeof styleWidth === 'number' ? styleWidth : null);

    const h = typeof styleHeight === 'string' && styleHeight.endsWith('px')
        ? parseFloat(styleHeight)
        : (typeof styleHeight === 'number' ? styleHeight : null);

    return {
        width: w ?? node.width ?? NODE_WIDTH,
        height: h ?? node.height ?? NODE_HEIGHT
    };
}

export function assignSmartHandles(nodes: Node[], edges: Edge[]): Edge[] {
    const nodeMap = new Map<string, Node>();
    for (const node of nodes) {
        nodeMap.set(node.id, node);
    }

    // Track handle usage per node to distribute multiple connections
    // Key: "nodeId-handleSide", Value: count of edges using this handle
    const handleUsage = new Map<string, number>();

    const getUsageCount = (nodeId: string, handle: string) => {
        const key = `${nodeId}-${handle}`;
        return handleUsage.get(key) || 0;
    };

    const recordUsage = (nodeId: string, handle: string) => {
        const key = `${nodeId}-${handle}`;
        handleUsage.set(key, (handleUsage.get(key) || 0) + 1);
    };

    // Group edges by source-target pair (considering both directions)
    const pairGroups = new Map<string, Edge[]>();
    for (const edge of edges) {
        const key = [edge.source, edge.target].sort().join('::');
        const group = pairGroups.get(key) || [];
        group.push(edge);
        pairGroups.set(key, group);
    }

    return edges.map((edge) => {
        const sourceNode = nodeMap.get(edge.source);
        const targetNode = nodeMap.get(edge.target);

        if (!sourceNode || !targetNode) return edge;

        // Self-loop: handled by CustomEdge already
        if (edge.source === edge.target) return edge;

        const { width: sw, height: sh } = getNodeDimensions(sourceNode);
        const { width: tw, height: th } = getNodeDimensions(targetNode);

        // Use center positions (calculated absolutely)
        const sourcePos = getAbsolutePosition(sourceNode, nodeMap);
        const targetPos = getAbsolutePosition(targetNode, nodeMap);

        const sx = sourcePos.x + sw / 2;
        const sy = sourcePos.y + sh / 2;
        const tx = targetPos.x + tw / 2;
        const ty = targetPos.y + th / 2;

        const dx = tx - sx;
        const dy = ty - sy;

        let sourceHandle: string;
        let targetHandle: string;

        // Check if this is a bidirectional pair
        const pairKey = [edge.source, edge.target].sort().join('::');
        const pairGroup = pairGroups.get(pairKey) || [];
        const isReverse = pairGroup.some(e => e.source === edge.target && e.target === edge.source);
        const sameDirectionSiblings = pairGroup.filter(e => e.source === edge.source && e.target === edge.target);
        const siblingIndex = sameDirectionSiblings.indexOf(edge);

        if (Math.abs(dy) >= Math.abs(dx)) {
            // Vertical dominance
            if (dy >= 0) {
                // Target is below - primary: bottom→top
                if (isReverse && edge.source > edge.target) {
                    // Reverse direction of bidirectional pair
                    sourceHandle = 'left';
                    targetHandle = 'left';
                } else if (siblingIndex > 0) {
                    // Multiple same-direction edges: alternate sides
                    sourceHandle = siblingIndex % 2 === 1 ? 'right' : 'bottom';
                    targetHandle = siblingIndex % 2 === 1 ? 'right' : 'top';
                } else {
                    sourceHandle = 'bottom';
                    targetHandle = 'top';
                }
            } else {
                // Target is above
                if (isReverse && edge.source > edge.target) {
                    sourceHandle = 'right';
                    targetHandle = 'right';
                } else if (siblingIndex > 0) {
                    sourceHandle = siblingIndex % 2 === 1 ? 'left' : 'top';
                    targetHandle = siblingIndex % 2 === 1 ? 'left' : 'bottom';
                } else {
                    sourceHandle = 'top';
                    targetHandle = 'bottom';
                }
            }
        } else {
            // Horizontal dominance
            if (dx >= 0) {
                // Target is to the right
                if (isReverse && edge.source > edge.target) {
                    sourceHandle = 'bottom';
                    targetHandle = 'bottom';
                } else if (siblingIndex > 0) {
                    sourceHandle = siblingIndex % 2 === 1 ? 'bottom' : 'right';
                    targetHandle = siblingIndex % 2 === 1 ? 'bottom' : 'left';
                } else {
                    sourceHandle = 'right';
                    targetHandle = 'left';
                }
            } else {
                // Target is to the left
                if (isReverse && edge.source > edge.target) {
                    sourceHandle = 'top';
                    targetHandle = 'top';
                } else if (siblingIndex > 0) {
                    sourceHandle = siblingIndex % 2 === 1 ? 'top' : 'left';
                    targetHandle = siblingIndex % 2 === 1 ? 'top' : 'right';
                } else {
                    sourceHandle = 'left';
                    targetHandle = 'right';
                }
            }
        }

        recordUsage(edge.source, sourceHandle);
        recordUsage(edge.target, targetHandle);

        // Optimization: Only create new object if handles changed
        if (edge.sourceHandle === sourceHandle && edge.targetHandle === targetHandle) {
            return edge;
        }

        return {
            ...edge,
            sourceHandle,
            targetHandle,
        };
    });
}
