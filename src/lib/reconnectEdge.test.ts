import { describe, expect, it } from 'vitest';
import type { Connection } from '@/lib/reactflowCompat';
import type { FlowEdge, FlowNode } from '@/lib/types';
import { buildReconnectedEdge, shouldRespectExplicitReconnectHandles } from './reconnectEdge';

function createNode(id: string): FlowNode {
  return {
    id,
    type: 'process',
    position: { x: 0, y: 0 },
    data: { label: id },
  } as FlowNode;
}

function createEdge(overrides: Partial<FlowEdge> = {}): FlowEdge {
  return {
    id: 'edge-1',
    source: 'a',
    target: 'b',
    sourceHandle: 'right',
    targetHandle: 'left',
    data: {},
    ...overrides,
  } as FlowEdge;
}

describe('buildReconnectedEdge', () => {
  it('clears stored route geometry and resets reconnects to auto routing', () => {
    const edge = createEdge({
      data: {
        routingMode: 'manual',
        elkPoints: [{ x: 10, y: 10 }],
        waypoints: [{ x: 20, y: 20 }],
        waypoint: { x: 30, y: 30 },
      },
    });

    const result = buildReconnectedEdge(
      edge,
      { source: 'a', target: 'c', sourceHandle: null, targetHandle: null },
      [createNode('a'), createNode('b'), createNode('c')]
    );

    expect(result.data?.routingMode).toBe('auto');
    expect(result.data?.elkPoints).toBeUndefined();
    expect(result.data?.waypoints).toBeUndefined();
    expect(result.data?.waypoint).toBeUndefined();
  });

  it('preserves the untouched endpoint handle when only one side is reconnected', () => {
    const result = buildReconnectedEdge(
      createEdge(),
      { source: 'a', target: 'c', sourceHandle: null, targetHandle: 'top' },
      [createNode('a'), createNode('b'), createNode('c')]
    );

    expect(result.sourceHandle).toBe('right');
    expect(result.targetHandle).toBe('top');
  });

  it('drops the moved endpoint handle when reconnecting to a different node body', () => {
    const result = buildReconnectedEdge(
      createEdge(),
      { source: 'c', target: 'b', sourceHandle: null, targetHandle: null },
      [createNode('a'), createNode('b'), createNode('c')]
    );

    expect(result.source).toBe('c');
    expect(result.sourceHandle).toBeNull();
    expect(result.targetHandle).toBe('left');
  });
});

describe('shouldRespectExplicitReconnectHandles', () => {
  it('only respects reconnect handles when both ends were explicit', () => {
    expect(
      shouldRespectExplicitReconnectHandles({
        source: 'a',
        target: 'b',
        sourceHandle: 'right',
        targetHandle: 'left',
      } as Connection)
    ).toBe(true);

    expect(
      shouldRespectExplicitReconnectHandles({
        source: 'a',
        target: 'b',
        sourceHandle: 'right',
      } as Connection)
    ).toBe(false);
  });
});
