import { describe, expect, it } from 'vitest';
import type { FlowEdge, FlowNode } from '@/lib/types';
import { insertNodeIntoEdge } from './edgeInsertion';

const nodes: FlowNode[] = [
  { id: 'a', type: 'process', position: { x: 0, y: 0 }, width: 100, height: 60, data: { label: 'a' }, selected: true },
  { id: 'b', type: 'process', position: { x: 400, y: 0 }, width: 100, height: 60, data: { label: 'b' } },
];
const edges: FlowEdge[] = [
  { id: 'ab', source: 'a', target: 'b', sourceHandle: 'right', targetHandle: 'left', type: 'smoothstep', animated: true, style: { stroke: '#f00' }, data: { curve: 'smoothstep' } },
];

describe('insertNodeIntoEdge', () => {
  it('splits the edge around a node at the midpoint and keeps appearance on both halves', () => {
    const result = insertNodeIntoEdge(nodes, edges, 'ab', { nodeId: 'n', edgeId: 'e2' })!;
    const inserted = result.nodes.find((n) => n.id === 'n')!;
    // Midpoint between the node centres (50,30) and (450,30) is (250,30).
    expect(inserted.position.x + 60).toBe(250);
    expect(inserted.selected).toBe(true);
    expect(result.nodes.find((n) => n.id === 'a')!.selected).toBe(false);
    expect(result.edges.map((e) => e.id)).toEqual(['ab', 'e2']);
    expect(result.edges[0]).toMatchObject({ source: 'a', target: 'n', sourceHandle: 'right', animated: true, style: { stroke: '#f00' } });
    expect(result.edges[1]).toMatchObject({ source: 'n', target: 'b', targetHandle: 'left', animated: true, style: { stroke: '#f00' }, type: 'smoothstep' });
  });

  it('returns null for unknown edges', () => {
    expect(insertNodeIntoEdge(nodes, edges, 'missing', { nodeId: 'n', edgeId: 'e2' })).toBeNull();
  });
});
