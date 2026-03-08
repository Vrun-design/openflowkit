import type { FlowEdge } from '@/lib/types';

export function releaseStaleElkRoutesForNodeIds(
  edges: FlowEdge[],
  movedNodeIds: Set<string>
): FlowEdge[] {
  let changed = false;

  const nextEdges = edges.map((edge) => {
    if (!movedNodeIds.has(edge.source) && !movedNodeIds.has(edge.target)) {
      return edge;
    }

    if (edge.data?.routingMode === 'manual') {
      return edge;
    }

    if ((edge.data?.elkPoints?.length ?? 0) === 0 && edge.data?.routingMode !== 'elk') {
      return edge;
    }

    changed = true;
    return {
      ...edge,
      data: {
        ...edge.data,
        routingMode: 'auto' as const,
        elkPoints: undefined,
      },
    };
  });

  return changed ? nextEdges : edges;
}
