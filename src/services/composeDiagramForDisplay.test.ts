import { describe, expect, it, vi } from 'vitest';
import type { FlowEdge, FlowNode } from '@/lib/types';
import { composeDiagramForDisplay } from './composeDiagramForDisplay';
import { getElkLayout } from './elkLayout';
import { relayoutMindmapComponent, syncMindmapEdges } from '@/lib/mindmapLayout';

vi.mock('./elkLayout', () => ({
  getElkLayout: vi.fn(async (nodes: FlowNode[], edges: FlowEdge[]) => ({ nodes, edges })),
}));

vi.mock('@/lib/mindmapLayout', () => ({
  relayoutMindmapComponent: vi.fn((nodes: FlowNode[]) => nodes),
  syncMindmapEdges: vi.fn((_: FlowNode[], edges: FlowEdge[]) => edges),
}));

function createNode(id: string, type = 'process'): FlowNode {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: { label: id },
  } as FlowNode;
}

function createEdge(id: string, source: string, target: string): FlowEdge {
  return { id, source, target } as FlowEdge;
}

describe('composeDiagramForDisplay', () => {
  it('uses ELK composition for regular diagrams', async () => {
    const nodes = [createNode('a'), createNode('b')];
    const edges = [createEdge('e1', 'a', 'b')];

    await composeDiagramForDisplay(nodes, edges, { direction: 'LR', algorithm: 'layered', spacing: 'compact' });

    expect(getElkLayout).toHaveBeenCalledWith(nodes, edges, {
      direction: 'LR',
      algorithm: 'layered',
      spacing: 'compact',
      diagramType: undefined,
    });
  });

  it('uses mindmap relayout for mindmap diagrams', async () => {
    const nodes = [createNode('root', 'mindmap'), createNode('child', 'mindmap')];
    const edges = [createEdge('e1', 'root', 'child')];

    await composeDiagramForDisplay(nodes, edges, { diagramType: 'mindmap' });

    expect(relayoutMindmapComponent).toHaveBeenCalled();
    expect(syncMindmapEdges).toHaveBeenCalled();
    expect(getElkLayout).not.toHaveBeenCalledWith(nodes, edges, expect.anything());
  });
});
