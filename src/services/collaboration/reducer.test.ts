import { describe, expect, it } from 'vitest';
import type { FlowEdge, FlowNode } from '@/lib/types';
import type { CollaborationDocumentState, CollaborationOperationEnvelope } from './types';
import { applyCollaborationOperation, applyCollaborationOperations } from './reducer';

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
  payload: CollaborationOperationEnvelope['payload']
): CollaborationOperationEnvelope {
  return {
    opId: `${type}:${JSON.stringify(payload)}`,
    roomId: 'room-1',
    clientId: 'client-1',
    baseVersion: 0,
    timestamp: 1,
    type,
    payload,
  };
}

describe('collaboration reducer', () => {
  it('applies upsert operations deterministically', () => {
    const initialState: CollaborationDocumentState = {
      roomId: 'room-1',
      version: 1,
      nodes: [createNode('n-1', 'Node 1')],
      edges: [],
    };
    const operations: CollaborationOperationEnvelope[] = [
      createOperation('node.upsert', { node: createNode('n-2', 'Node 2') }),
      createOperation('node.upsert', { node: createNode('n-1', 'Node 1 Updated') }),
      createOperation('edge.upsert', { edge: createEdge('e-1', 'n-1', 'n-2') }),
    ];

    const firstRun = applyCollaborationOperations(initialState, operations);
    const secondRun = applyCollaborationOperations(initialState, operations);

    expect(firstRun).toEqual(secondRun);
    expect(firstRun.version).toBe(4);
    expect(firstRun.nodes.map((node) => node.id)).toEqual(['n-1', 'n-2']);
    expect(firstRun.nodes[0].data.label).toBe('Node 1 Updated');
    expect(firstRun.edges).toHaveLength(1);
  });

  it('deletes connected edges when deleting a node', () => {
    const initialState: CollaborationDocumentState = {
      roomId: 'room-1',
      version: 2,
      nodes: [createNode('n-1', 'Node 1'), createNode('n-2', 'Node 2')],
      edges: [createEdge('e-1', 'n-1', 'n-2')],
    };

    const result = applyCollaborationOperation(
      initialState,
      createOperation('node.delete', { nodeId: 'n-1' })
    );

    expect(result.applied).toBe(true);
    expect(result.nextState.version).toBe(3);
    expect(result.nextState.nodes).toHaveLength(1);
    expect(result.nextState.edges).toHaveLength(0);
  });

  it('ignores operations for a different room', () => {
    const initialState: CollaborationDocumentState = {
      roomId: 'room-1',
      version: 1,
      nodes: [],
      edges: [],
    };
    const operation: CollaborationOperationEnvelope = {
      ...createOperation('node.upsert', { node: createNode('n-1', 'Node 1') }),
      roomId: 'room-2',
    };

    const result = applyCollaborationOperation(initialState, operation);
    expect(result.applied).toBe(false);
    expect(result.nextState).toEqual(initialState);
  });

  it('treats identical upserts and missing deletes as no-ops', () => {
    const initialState: CollaborationDocumentState = {
      roomId: 'room-1',
      version: 2,
      nodes: [createNode('n-1', 'Node 1')],
      edges: [createEdge('e-1', 'n-1', 'n-1')],
    };

    const identicalNodeUpsert = applyCollaborationOperation(
      initialState,
      createOperation('node.upsert', { node: createNode('n-1', 'Node 1') })
    );
    const missingEdgeDelete = applyCollaborationOperation(
      initialState,
      createOperation('edge.delete', { edgeId: 'missing-edge' })
    );

    expect(identicalNodeUpsert.applied).toBe(false);
    expect(identicalNodeUpsert.nextState).toEqual(initialState);
    expect(missingEdgeDelete.applied).toBe(false);
    expect(missingEdgeDelete.nextState).toEqual(initialState);
  });
});
