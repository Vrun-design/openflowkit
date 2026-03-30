import { describe, expect, it, vi } from 'vitest';
import type { FlowEdge, FlowNode } from '@/lib/types';
import {
  applyCollaborationDocumentStateToCanvas,
  createCollaborationDocumentStateFromCanvas,
} from './storeBridge';

function createNode(id: string): FlowNode {
  return {
    id,
    type: 'process',
    position: { x: 0, y: 0 },
    data: { label: id },
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

describe('collaboration store bridge', () => {
  it('creates collaboration document state from canvas state', () => {
    const nodes = [createNode('n-1')];
    const edges = [createEdge('e-1', 'n-1', 'n-1')];
    const state = createCollaborationDocumentStateFromCanvas('room-1', 2, nodes, edges);

    expect(state.roomId).toBe('room-1');
    expect(state.version).toBe(2);
    expect(state.nodes).toHaveLength(1);
    expect(state.edges).toHaveLength(1);
  });

  it('applies collaboration document state to canvas setters', () => {
    const nodes = [createNode('n-1')];
    const edges = [createEdge('e-1', 'n-1', 'n-1')];
    const setNodes = vi.fn();
    const setEdges = vi.fn();

    applyCollaborationDocumentStateToCanvas(
      createCollaborationDocumentStateFromCanvas('room-1', 1, nodes, edges),
      setNodes,
      setEdges
    );

    expect(setNodes).toHaveBeenCalledWith(expect.any(Function));
    expect(setEdges).toHaveBeenCalledWith(expect.any(Function));
  });

  it('preserves existing references for unchanged remote canvas entities', () => {
    const sharedNode = createNode('n-1');
    const sharedEdge = createEdge('e-1', 'n-1', 'n-1');
    const setNodes = vi.fn();
    const setEdges = vi.fn();

    applyCollaborationDocumentStateToCanvas(
      createCollaborationDocumentStateFromCanvas('room-1', 1, [createNode('n-1')], [createEdge('e-1', 'n-1', 'n-1')]),
      setNodes,
      setEdges
    );

    const nextNodes = setNodes.mock.calls[0][0]([sharedNode]);
    const nextEdges = setEdges.mock.calls[0][0]([sharedEdge]);

    expect(nextNodes).toBeInstanceOf(Array);
    expect(nextNodes[0]).toBe(sharedNode);
    expect(nextEdges[0]).toBe(sharedEdge);
  });
});
