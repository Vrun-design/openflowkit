import type { FlowEdge, FlowNode } from '@/lib/types';

export interface PositionPreservingApplyResult {
    mergedNodes: FlowNode[];
    mergedEdges: FlowEdge[];
    newNodeIds: Set<string>;
    existingById: Map<string, FlowNode>;
}

/**
 * Merges AI-generated nodes/edges with the existing canvas state.
 *
 * - Nodes matched by ID (AI preserved the ID) or label → keep existing position, update data
 * - New nodes (no match) → let the caller position them via layout
 * - Nodes from the existing canvas omitted by the AI → excluded (treated as removed)
 */
export function applyAIResultToCanvas(
    aiNodes: FlowNode[],
    aiEdges: FlowEdge[],
    existingNodes: FlowNode[],
    idMap: Map<string, string>
): PositionPreservingApplyResult {
    const existingById = new Map(existingNodes.map((n) => [n.id, n]));
    const newNodeIds = new Set<string>();

    const mergedNodes = aiNodes.map((aiNode) => {
        const resolvedId = idMap.get(aiNode.id) ?? aiNode.id;
        const existing = existingById.get(resolvedId);

        if (existing) {
            return { ...aiNode, id: resolvedId, position: existing.position };
        }

        newNodeIds.add(resolvedId);
        return { ...aiNode, id: resolvedId };
    });

    return { mergedNodes, mergedEdges: aiEdges, newNodeIds, existingById };
}

/**
 * Position new nodes relative to their existing graph neighbors.
 * Avoids a full ELK re-layout for simple insertions (add one node between two others).
 */
export function positionNewNodesSmartly(
    mergedNodes: FlowNode[],
    mergedEdges: FlowEdge[],
    newNodeIds: Set<string>,
    existingById: Map<string, FlowNode>
): FlowNode[] {
    const existingNodes = [...existingById.values()];
    const bbox = computeBoundingBox(existingNodes);
    const isHorizontal = (bbox.maxX - bbox.minX) > (bbox.maxY - bbox.minY);
    let orphanIndex = 0;

    return mergedNodes.map((node) => {
        if (!newNodeIds.has(node.id)) return node;

        const neighbors = findExistingNeighbors(node.id, mergedEdges, existingById, newNodeIds);

        if (neighbors.length >= 2) {
            const a = neighbors[0].position;
            const b = neighbors[1].position;
            const midX = (a.x + b.x) / 2;
            const midY = (a.y + b.y) / 2;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const perpX = -dy / len;
            const perpY = dx / len;
            return { ...node, position: { x: Math.round(midX + perpX * 80), y: Math.round(midY + perpY * 80) } };
        }

        if (neighbors.length === 1) {
            const n = neighbors[0].position;
            const offset = 200;
            const pos = isHorizontal
                ? { x: n.x + offset, y: n.y }
                : { x: n.x, y: n.y + offset };
            return { ...node, position: pos };
        }

        const pos = {
            x: bbox.maxX + 80,
            y: bbox.minY + orphanIndex * 160,
        };
        orphanIndex++;
        return { ...node, position: pos };
    });
}

function findExistingNeighbors(
    nodeId: string,
    edges: FlowEdge[],
    existingById: Map<string, FlowNode>,
    newNodeIds: Set<string>
): FlowNode[] {
    const neighbors: FlowNode[] = [];
    for (const edge of edges) {
        let neighborId: string | null = null;
        if (edge.source === nodeId && !newNodeIds.has(edge.target)) neighborId = edge.target;
        if (edge.target === nodeId && !newNodeIds.has(edge.source)) neighborId = edge.source;
        if (neighborId) {
            const existing = existingById.get(neighborId);
            if (existing && !neighbors.some((n) => n.id === existing.id)) {
                neighbors.push(existing);
            }
        }
    }
    return neighbors;
}

function computeBoundingBox(nodes: FlowNode[]): { minX: number; minY: number; maxX: number; maxY: number } {
    if (nodes.length === 0) return { minX: 0, minY: 0, maxX: 200, maxY: 200 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
        if (n.position.x < minX) minX = n.position.x;
        if (n.position.y < minY) minY = n.position.y;
        if (n.position.x > maxX) maxX = n.position.x;
        if (n.position.y > maxY) maxY = n.position.y;
    }
    return { minX, minY, maxX, maxY };
}

/**
 * After ELK has positioned all nodes (including new ones), restore the original
 * positions for nodes that already existed. Only new nodes keep the ELK-computed position.
 */
export function restoreExistingPositions(
    elkNodes: FlowNode[],
    newNodeIds: Set<string>,
    existingById: Map<string, FlowNode>
): FlowNode[] {
    return elkNodes.map((node) => {
        if (newNodeIds.has(node.id)) return node;
        const existing = existingById.get(node.id);
        return existing ? { ...node, position: existing.position } : node;
    });
}
