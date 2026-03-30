import { describe, expect, it } from 'vitest';
import type { FlowEdge, FlowNode } from '@/lib/types';
import type { CollaborationOperationEnvelope } from './types';
import { compactCollaborationOperationLog } from './operationLog';

function createNode(id: string, label: string): FlowNode {
  return {
    id,
    type: 'process',
    position: { x: 0, y: 0 },
    data: { label },
  };
}

function createEdge(id: string, source: string, target: string): FlowEdge {
  return {
    id,
    source,
    target,
    type: 'smoothstep',
    data: {},
  };
}

function createOperation(
  type: CollaborationOperationEnvelope['type'],
  payload: CollaborationOperationEnvelope['payload'],
  timestamp: number
): CollaborationOperationEnvelope {
  return {
    opId: `${type}:${timestamp}`,
    roomId: 'room-1',
    clientId: 'client-a',
    baseVersion: Math.max(timestamp - 1, 0),
    timestamp,
    type,
    payload,
  };
}

describe('compactCollaborationOperationLog', () => {
  it('reduces an operation log to the final node and edge state', () => {
    const compacted = compactCollaborationOperationLog([
      createOperation('node.upsert', { node: createNode('n-1', 'First') }, 1),
      createOperation('node.upsert', { node: createNode('n-1', 'Updated') }, 2),
      createOperation('node.upsert', { node: createNode('n-2', 'Second') }, 3),
      createOperation('edge.upsert', { edge: createEdge('e-1', 'n-1', 'n-2') }, 4),
      createOperation('node.delete', { nodeId: 'n-1' }, 5),
    ]);

    expect(compacted).toHaveLength(1);
    expect(compacted[0]?.type).toBe('node.upsert');
    expect('node' in compacted[0]!.payload && compacted[0]!.payload.node.id).toBe('n-2');
    expect(compacted[0]?.clientId).toBe('system:compaction');
  });
});
