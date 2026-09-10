import type { FlowEdge, FlowNode } from '@/lib/types';
import { resolveNodeSize } from '@/components/nodeHelpers';
import { getAbsoluteNodeBounds } from './sectionBounds';
import { createGenericShapeNode } from './nodeFactories';

export interface EdgeInsertionResult {
  readonly nodes: FlowNode[];
  readonly edges: FlowEdge[];
  readonly nodeId: string;
}

/**
 * Splits `edgeId` around a new process node placed at the edge's midpoint.
 * The original edge keeps its id, data, and style and now ends at the new
 * node; a second edge with the same appearance continues to the old target.
 */
export function insertNodeIntoEdge(
  nodes: FlowNode[],
  edges: FlowEdge[],
  edgeId: string,
  ids: { readonly nodeId: string; readonly edgeId: string }
): EdgeInsertionResult | null {
  const edge = edges.find((candidate) => candidate.id === edgeId);
  const source = edge && nodes.find((node) => node.id === edge.source);
  const target = edge && nodes.find((node) => node.id === edge.target);
  if (!edge || !source || !target) return null;

  const sourceBounds = getAbsoluteNodeBounds(source, nodes);
  const targetBounds = getAbsoluteNodeBounds(target, nodes);
  const midpoint = {
    x: (sourceBounds.x + sourceBounds.width / 2 + targetBounds.x + targetBounds.width / 2) / 2,
    y: (sourceBounds.y + sourceBounds.height / 2 + targetBounds.y + targetBounds.height / 2) / 2,
  };
  const draft = createGenericShapeNode(ids.nodeId, { x: 0, y: 0 }, {
    type: 'process', color: 'white', shape: 'rounded', label: '',
  });
  const size = resolveNodeSize(draft);
  const inserted: FlowNode = {
    ...draft,
    position: { x: midpoint.x - size.width / 2, y: midpoint.y - size.height / 2 },
    selected: true,
  };

  const { id: _id, source: _source, target: _target, sourceHandle: _sh, targetHandle: _th, ...appearance } = edge;
  const first: FlowEdge = { ...edge, target: ids.nodeId, targetHandle: undefined, selected: false };
  const second: FlowEdge = {
    ...appearance, id: ids.edgeId, source: ids.nodeId, target: edge.target,
    sourceHandle: undefined, targetHandle: edge.targetHandle, selected: false,
  };
  return {
    nodes: nodes.map((node) => (node.selected ? { ...node, selected: false } : node)).concat(inserted),
    edges: edges.flatMap((candidate) => (candidate.id === edgeId ? [first, second] : [candidate])),
    nodeId: ids.nodeId,
  };
}
