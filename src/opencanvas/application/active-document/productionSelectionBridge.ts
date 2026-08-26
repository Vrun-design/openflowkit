import type { FlowEdge, FlowNode } from '@/lib/types';
import type { CanvasSelection } from '../selection/selection';

export interface ProjectedSelection {
  /** Null when every node's `selected` flag already matches, so no write is needed. */
  readonly nodes: FlowNode[] | null;
  readonly selectedNodeId: string | null;
}

/**
 * The single translation from a canonical selection to the store's React Flow
 * representation. `selectedNodeId` is reported independently of the node flags:
 * tying it to a flag change would leave it stale whenever the primary node
 * moves within an unchanged set.
 */
export function projectSelectionToNodes(
  nodes: readonly FlowNode[],
  selection: CanvasSelection
): ProjectedSelection {
  const selectedIds = new Set(selection.nodeIds);
  let changed = false;
  const next = nodes.map((node) => {
    const selected = selectedIds.has(node.id);
    if (Boolean(node.selected) === selected) return node;
    changed = true;
    return { ...node, selected };
  });
  return { nodes: changed ? next : null, selectedNodeId: selection.primaryNodeId };
}

export interface ProjectedConnectorSelection {
  /** Null when every edge's `selected` flag already matches, so no write is needed. */
  readonly edges: FlowEdge[] | null;
  readonly selectedEdgeId: string | null;
}

/** The edge counterpart of `projectSelectionToNodes`. */
export function projectConnectorSelectionToEdges(
  edges: readonly FlowEdge[],
  connectorId: string | null
): ProjectedConnectorSelection {
  let changed = false;
  const next = edges.map((edge) => {
    const selected = edge.id === connectorId;
    if (Boolean(edge.selected) === selected) return edge;
    changed = true;
    return { ...edge, selected };
  });
  return { edges: changed ? next : null, selectedEdgeId: connectorId };
}
