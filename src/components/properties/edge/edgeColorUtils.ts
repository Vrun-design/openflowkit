import type { FlowEdge } from '@/lib/types';
import type { EdgeCondition } from '@/lib/types';
import { EDGE_CONDITION_LABELS } from '@/constants';
import { resolveEdgeConditionStroke } from '@/theme';

export function recolorEdgeMarker(
  marker: FlowEdge['markerStart'] | FlowEdge['markerEnd'],
  color: string
): FlowEdge['markerStart'] | FlowEdge['markerEnd'] {
  if (!marker || typeof marker === 'string' || !('type' in marker)) {
    return marker;
  }

  return {
    ...marker,
    color,
  };
}

export function buildEdgeStrokeUpdates(
  edge: FlowEdge,
  stroke: string
): Partial<FlowEdge> {
  return {
    style: { ...edge.style, stroke },
    markerStart: recolorEdgeMarker(edge.markerStart, stroke),
    markerEnd: recolorEdgeMarker(edge.markerEnd, stroke),
  };
}

export function buildEdgeConditionUpdates(
  edge: FlowEdge,
  condition: EdgeCondition
): Partial<FlowEdge> {
  const stroke = resolveEdgeConditionStroke(condition);
  const label = EDGE_CONDITION_LABELS[condition] || 'Default';
  return {
    ...buildEdgeStrokeUpdates(edge, stroke),
    data: { ...edge.data, condition },
    label: condition === 'default' ? '' : label,
  };
}
