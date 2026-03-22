import { describe, expect, it } from 'vitest';
import type { FlowEdge, FlowNode } from '@/lib/types';
import { serializeCanvasContextForAI } from './contextSerializer';

function createNode(id: string, type: string, label: string): FlowNode {
  return {
    id,
    type,
    position: { x: 10, y: 20 },
    data: { label },
  };
}

function createEdge(id: string, source: string, target: string, label?: string): FlowEdge {
  return {
    id,
    source,
    target,
    label,
    type: 'smoothstep',
    data: {},
  };
}

describe('serializeCanvasContextForAI', () => {
  it('returns empty string for empty canvas', () => {
    expect(serializeCanvasContextForAI([], [])).toBe('');
  });

  it('serializes nodes/edges as OpenFlow DSL with header comment', () => {
    const nodes = [createNode('n1', 'process', 'A'), createNode('n2', 'decision', 'B')];
    const edges = [createEdge('e1', 'n1', 'n2', 'yes')];

    const serialized = serializeCanvasContextForAI(nodes, edges);

    expect(serialized).toContain('# Current diagram');
    expect(serialized).toContain('n1');
    expect(serialized).toContain('n2');
    expect(serialized).toContain('A');
    expect(serialized).toContain('B');
  });

  it('appends focused node IDs when selectedNodeIds are provided', () => {
    const nodes = [createNode('n1', 'process', 'A')];
    const serialized = serializeCanvasContextForAI(nodes, [], ['n1']);

    expect(serialized).toContain('# Focused nodes: [n1]');
  });
});
