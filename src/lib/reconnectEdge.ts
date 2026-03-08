import type { Connection } from '@/lib/reactflowCompat';
import type { FlowEdge, FlowNode } from '@/lib/types';
import { normalizeNodeHandleId } from '@/lib/nodeHandles';

function clearStoredRouteData(edge: FlowEdge): FlowEdge['data'] {
  return {
    ...edge.data,
    routingMode: 'auto' as const,
    elkPoints: undefined,
    waypoint: undefined,
    waypoints: undefined,
  };
}

export function buildReconnectedEdge(
  oldEdge: FlowEdge,
  newConnection: Connection,
  nodes: FlowNode[]
): FlowEdge {
  const nextSourceId = newConnection.source || oldEdge.source;
  const nextTargetId = newConnection.target || oldEdge.target;
  const sourceNode = nodes.find((node) => node.id === nextSourceId);
  const targetNode = nodes.find((node) => node.id === nextTargetId);

  const nextSourceHandleInput =
    newConnection.sourceHandle
    ?? (nextSourceId === oldEdge.source ? oldEdge.sourceHandle ?? null : null);
  const nextTargetHandleInput =
    newConnection.targetHandle
    ?? (nextTargetId === oldEdge.target ? oldEdge.targetHandle ?? null : null);

  return {
    ...oldEdge,
    source: nextSourceId,
    target: nextTargetId,
    sourceHandle: normalizeNodeHandleId(sourceNode, nextSourceHandleInput),
    targetHandle: normalizeNodeHandleId(targetNode, nextTargetHandleInput),
    data: clearStoredRouteData(oldEdge),
  };
}

export function shouldRespectExplicitReconnectHandles(connection: Connection): boolean {
  return !!connection.sourceHandle && !!connection.targetHandle;
}
