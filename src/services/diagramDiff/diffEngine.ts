import type { FlowEdge, FlowNode } from '@/lib/types';

export type NodeDiffStatus = 'added' | 'removed' | 'changed' | 'unchanged';
export type EdgeDiffStatus = 'added' | 'removed' | 'unchanged';

export interface NodeDiff {
    status: NodeDiffStatus;
    /** The node in the current diagram (undefined if removed) */
    current?: FlowNode;
    /** The node in the baseline snapshot (undefined if added) */
    baseline?: FlowNode;
}

export interface EdgeDiff {
    status: EdgeDiffStatus;
    current?: FlowEdge;
    baseline?: FlowEdge;
}

export interface DiagramDiff {
    nodes: Map<string, NodeDiff>;
    edges: Map<string, EdgeDiff>;
    addedNodeIds: string[];
    removedNodes: FlowNode[];
    changedNodeIds: string[];
    addedEdgeIds: string[];
    removedEdges: FlowEdge[];
    totalChanges: number;
}

/** Returns true if any meaningful node data changed (not position — position changes are separate). */
function nodeDataChanged(a: FlowNode, b: FlowNode): boolean {
    // Label change
    if (a.data.label !== b.data.label) return true;
    // Node type change
    if (a.type !== b.type) return true;
    // Sub-label change
    if (a.data.subLabel !== b.data.subLabel) return true;
    // Color
    if (a.data.color !== b.data.color) return true;
    return false;
}

/** Returns true if the node moved significantly (> 20px in any direction). */
function nodeMoved(a: FlowNode, b: FlowNode): boolean {
    const dx = (a.position?.x ?? 0) - (b.position?.x ?? 0);
    const dy = (a.position?.y ?? 0) - (b.position?.y ?? 0);
    return Math.abs(dx) > 20 || Math.abs(dy) > 20;
}

export function computeDiagramDiff(current: { nodes: FlowNode[]; edges: FlowEdge[] }, baseline: { nodes: FlowNode[]; edges: FlowEdge[] }): DiagramDiff {
    const currentNodeMap = new Map(current.nodes.map((n) => [n.id, n]));
    const baselineNodeMap = new Map(baseline.nodes.map((n) => [n.id, n]));
    const currentEdgeMap = new Map(current.edges.map((e) => [e.id, e]));
    const baselineEdgeMap = new Map(baseline.edges.map((e) => [e.id, e]));

    const nodeDiffs = new Map<string, NodeDiff>();
    const addedNodeIds: string[] = [];
    const removedNodes: FlowNode[] = [];
    const changedNodeIds: string[] = [];

    // Nodes in current: added or changed/unchanged
    for (const node of current.nodes) {
        const base = baselineNodeMap.get(node.id);
        if (!base) {
            nodeDiffs.set(node.id, { status: 'added', current: node });
            addedNodeIds.push(node.id);
        } else if (nodeDataChanged(node, base) || nodeMoved(node, base)) {
            nodeDiffs.set(node.id, { status: 'changed', current: node, baseline: base });
            changedNodeIds.push(node.id);
        } else {
            nodeDiffs.set(node.id, { status: 'unchanged', current: node, baseline: base });
        }
    }

    // Nodes only in baseline: removed
    for (const node of baseline.nodes) {
        if (!currentNodeMap.has(node.id)) {
            nodeDiffs.set(node.id, { status: 'removed', baseline: node });
            removedNodes.push(node);
        }
    }

    const edgeDiffs = new Map<string, EdgeDiff>();
    const addedEdgeIds: string[] = [];
    const removedEdges: FlowEdge[] = [];

    for (const edge of current.edges) {
        if (!baselineEdgeMap.has(edge.id)) {
            edgeDiffs.set(edge.id, { status: 'added', current: edge });
            addedEdgeIds.push(edge.id);
        } else {
            edgeDiffs.set(edge.id, { status: 'unchanged', current: edge });
        }
    }

    for (const edge of baseline.edges) {
        if (!currentEdgeMap.has(edge.id)) {
            edgeDiffs.set(edge.id, { status: 'removed', baseline: edge });
            removedEdges.push(edge);
        }
    }

    const totalChanges = addedNodeIds.length + removedNodes.length + changedNodeIds.length + addedEdgeIds.length + removedEdges.length;

    return { nodes: nodeDiffs, edges: edgeDiffs, addedNodeIds, removedNodes, changedNodeIds, addedEdgeIds, removedEdges, totalChanges };
}
