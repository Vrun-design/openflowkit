import type { FlowEdge, FlowNode } from '@/lib/types';
import type { CollaborationOperationEnvelope } from './types';

const COMPACTION_CLIENT_ID = 'system:compaction';

interface CompactedCanvasState {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

function sortById<T extends { id: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => left.id.localeCompare(right.id));
}

function resolveCompactedCanvasState(
  operations: CollaborationOperationEnvelope[]
): CompactedCanvasState {
  const nodesById = new Map<string, FlowNode>();
  const edgesById = new Map<string, FlowEdge>();

  for (const operation of operations) {
    switch (operation.type) {
      case 'node.upsert':
        if ('node' in operation.payload) {
          nodesById.set(operation.payload.node.id, operation.payload.node);
        }
        break;
      case 'node.delete':
        if ('nodeId' in operation.payload) {
          nodesById.delete(operation.payload.nodeId);
          for (const [edgeId, edge] of edgesById.entries()) {
            if (edge.source === operation.payload.nodeId || edge.target === operation.payload.nodeId) {
              edgesById.delete(edgeId);
            }
          }
        }
        break;
      case 'edge.upsert':
        if ('edge' in operation.payload) {
          edgesById.set(operation.payload.edge.id, operation.payload.edge);
        }
        break;
      case 'edge.delete':
        if ('edgeId' in operation.payload) {
          edgesById.delete(operation.payload.edgeId);
        }
        break;
    }
  }

  return {
    nodes: sortById(Array.from(nodesById.values())),
    edges: sortById(Array.from(edgesById.values())),
  };
}

export function compactCollaborationOperationLog(
  operations: CollaborationOperationEnvelope[]
): CollaborationOperationEnvelope[] {
  if (operations.length === 0) {
    return [];
  }

  const latestOperation = operations[operations.length - 1];
  const compactedCanvasState = resolveCompactedCanvasState(operations);
  const compactedOperations: CollaborationOperationEnvelope[] = [];
  let nextBaseVersion = 0;
  let nextTimestamp = latestOperation.timestamp + 1;

  for (const node of compactedCanvasState.nodes) {
    compactedOperations.push({
      opId: `compact:node:${node.id}:${nextTimestamp}`,
      roomId: latestOperation.roomId,
      clientId: COMPACTION_CLIENT_ID,
      baseVersion: nextBaseVersion,
      timestamp: nextTimestamp,
      type: 'node.upsert',
      payload: { node },
    });
    nextBaseVersion += 1;
    nextTimestamp += 1;
  }

  for (const edge of compactedCanvasState.edges) {
    compactedOperations.push({
      opId: `compact:edge:${edge.id}:${nextTimestamp}`,
      roomId: latestOperation.roomId,
      clientId: COMPACTION_CLIENT_ID,
      baseVersion: nextBaseVersion,
      timestamp: nextTimestamp,
      type: 'edge.upsert',
      payload: { edge },
    });
    nextBaseVersion += 1;
    nextTimestamp += 1;
  }

  return compactedOperations;
}
