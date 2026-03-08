import { describe, expect, it } from 'vitest';
import type { FlowEdge, FlowNode } from '@/lib/types';
import { computeMindmapDropPreview, reconcileMindmapDrop, relayoutMindmapComponent, syncMindmapEdges } from './mindmapLayout';

function createMindmapNode(id: string, x: number, y: number, data?: Partial<FlowNode['data']>): FlowNode {
  return {
    id,
    type: 'mindmap',
    position: { x, y },
    data: {
      label: id,
      color: 'slate',
      shape: 'rounded',
      ...data,
    },
    selected: false,
  };
}

function createEdge(source: string, target: string): FlowEdge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    type: 'default',
    selected: false,
  };
}

describe('relayoutMindmapComponent', () => {
  it('splits root branches across both sides and preserves root anchor position', () => {
    const nodes = [
      createMindmapNode('root', 400, 300, { mindmapDepth: 0 }),
      createMindmapNode('a', 0, 0),
      createMindmapNode('b', 0, 0),
    ];
    const edges = [createEdge('root', 'a'), createEdge('root', 'b')];

    const nextNodes = relayoutMindmapComponent(nodes, edges, 'root');
    const root = nextNodes.find((node) => node.id === 'root');
    const a = nextNodes.find((node) => node.id === 'a');
    const b = nextNodes.find((node) => node.id === 'b');

    expect(root?.position).toEqual({ x: 400, y: 300 });
    expect([a?.data.mindmapSide, b?.data.mindmapSide].sort()).toEqual(['left', 'right']);
    expect(a?.position.x).not.toBe(b?.position.x);
  });

  it('inherits branch direction for nested descendants and increases depth', () => {
    const nodes = [
      createMindmapNode('root', 300, 220, { mindmapDepth: 0 }),
      createMindmapNode('left', 20, 20, { mindmapSide: 'left', mindmapDepth: 1 }),
      createMindmapNode('child', 40, 40, { mindmapDepth: 2 }),
    ];
    const edges = [createEdge('root', 'left'), createEdge('left', 'child')];

    const nextNodes = relayoutMindmapComponent(nodes, edges, 'child');
    const left = nextNodes.find((node) => node.id === 'left');
    const child = nextNodes.find((node) => node.id === 'child');

    expect(left?.data.mindmapSide).toBe('left');
    expect(left?.data.mindmapParentId).toBe('root');
    expect(child?.data.mindmapParentId).toBe('left');
    expect(child?.data.mindmapSide).toBe('left');
    expect(child?.data.mindmapDepth).toBe(2);
    expect((child?.position.x ?? 0)).toBeLessThan(left?.position.x ?? 0);
  });

  it('leaves non-mindmap nodes untouched', () => {
    const nodes = [
      createMindmapNode('root', 200, 200, { mindmapDepth: 0 }),
      {
        id: 'process-1',
        type: 'process',
        position: { x: 600, y: 200 },
        data: { label: 'Process', color: 'slate', shape: 'rounded' },
        selected: false,
      } satisfies FlowNode,
    ];
    const edges: FlowEdge[] = [];

    const nextNodes = relayoutMindmapComponent(nodes, edges, 'root');
    expect(nextNodes.find((node) => node.id === 'process-1')?.position).toEqual({ x: 600, y: 200 });
  });

  it('reparents a dragged topic when dropped near another branch topic', () => {
    const nodes = relayoutMindmapComponent([
      createMindmapNode('root', 400, 260, { mindmapDepth: 0 }),
      createMindmapNode('left', 160, 220, { mindmapParentId: 'root', mindmapSide: 'left', mindmapDepth: 1 }),
      createMindmapNode('right', 640, 300, { mindmapParentId: 'root', mindmapSide: 'right', mindmapDepth: 1 }),
      createMindmapNode('leaf', 690, 340, { mindmapParentId: 'right', mindmapSide: 'right', mindmapDepth: 2 }),
    ], [
      createEdge('root', 'left'),
      createEdge('root', 'right'),
      createEdge('right', 'leaf'),
    ], 'root').map((node) => (
      node.id === 'leaf'
        ? { ...node, position: { x: 190, y: 230 } }
        : node
    ));

    const result = reconcileMindmapDrop(nodes, [
      createEdge('root', 'left'),
      createEdge('root', 'right'),
      createEdge('right', 'leaf'),
    ], 'leaf');

    expect(result.changed).toBe(true);
    expect(result.nodes.find((node) => node.id === 'leaf')?.data.mindmapParentId).toBe('left');
    expect(result.edges.some((edge) => edge.source === 'left' && edge.target === 'leaf')).toBe(true);
    expect(result.edges.some((edge) => edge.source === 'right' && edge.target === 'leaf')).toBe(false);
  });

  it('switches a root child to the opposite side when dragged across the central topic', () => {
    const nodes = relayoutMindmapComponent([
      createMindmapNode('root', 420, 280, { mindmapDepth: 0 }),
      createMindmapNode('topic-a', 0, 0, { mindmapSide: 'left', mindmapParentId: 'root', mindmapDepth: 1 }),
      createMindmapNode('topic-b', 0, 0, { mindmapSide: 'right', mindmapParentId: 'root', mindmapDepth: 1 }),
    ], [
      createEdge('root', 'topic-a'),
      createEdge('root', 'topic-b'),
    ], 'root').map((node) => (
      node.id === 'topic-a'
        ? { ...node, position: { x: 560, y: node.position.y } }
        : node
    ));

    const result = reconcileMindmapDrop(nodes, [
      createEdge('root', 'topic-a'),
      createEdge('root', 'topic-b'),
    ], 'topic-a');

    expect(result.changed).toBe(true);
    expect(result.nodes.find((node) => node.id === 'topic-a')?.data.mindmapSide).toBe('right');
  });

  it('returns a drop preview for reparenting and root-side switching during drag', () => {
    const reparentNodes = relayoutMindmapComponent([
      createMindmapNode('root', 400, 240, { mindmapDepth: 0 }),
      createMindmapNode('left', 160, 200, { mindmapParentId: 'root', mindmapSide: 'left', mindmapDepth: 1 }),
      createMindmapNode('right', 640, 260, { mindmapParentId: 'root', mindmapSide: 'right', mindmapDepth: 1 }),
      createMindmapNode('leaf', 700, 300, { mindmapParentId: 'right', mindmapSide: 'right', mindmapDepth: 2 }),
    ], [
      createEdge('root', 'left'),
      createEdge('root', 'right'),
      createEdge('right', 'leaf'),
    ], 'root').map((node) => (
      node.id === 'leaf'
        ? { ...node, position: { x: 180, y: 210 } }
        : node
    ));
    const reparentEdges = [
      createEdge('root', 'left'),
      createEdge('root', 'right'),
      createEdge('right', 'leaf'),
    ];

    expect(computeMindmapDropPreview(reparentNodes, reparentEdges, 'leaf')).toMatchObject({
      targetParentId: 'left',
      mode: 'reparent',
    });

    const rebranchNodes = relayoutMindmapComponent([
      createMindmapNode('root', 420, 280, { mindmapDepth: 0 }),
      createMindmapNode('topic-a', 0, 0, { mindmapSide: 'left', mindmapParentId: 'root', mindmapDepth: 1 }),
      createMindmapNode('topic-b', 0, 0, { mindmapSide: 'right', mindmapParentId: 'root', mindmapDepth: 1 }),
    ], [
      createEdge('root', 'topic-a'),
      createEdge('root', 'topic-b'),
    ], 'root').map((node) => (
      node.id === 'topic-a'
        ? { ...node, position: { x: 565, y: node.position.y } }
        : node
    ));
    const rebranchEdges = [
      createEdge('root', 'topic-a'),
      createEdge('root', 'topic-b'),
    ];

    expect(computeMindmapDropPreview(rebranchNodes, rebranchEdges, 'topic-a')).toMatchObject({
      targetParentId: 'root',
      targetSide: 'right',
      mode: 'rebranch',
    });
  });

  it('does not reparent a topic when it is only moved slightly away from its current parent', () => {
    const nodes = relayoutMindmapComponent([
      createMindmapNode('root', 400, 240, { mindmapDepth: 0 }),
      createMindmapNode('left', 160, 200, { mindmapParentId: 'root', mindmapSide: 'left', mindmapDepth: 1 }),
      createMindmapNode('right', 640, 260, { mindmapParentId: 'root', mindmapSide: 'right', mindmapDepth: 1 }),
      createMindmapNode('leaf', 700, 300, { mindmapParentId: 'right', mindmapSide: 'right', mindmapDepth: 2 }),
    ], [
      createEdge('root', 'left'),
      createEdge('root', 'right'),
      createEdge('right', 'leaf'),
    ], 'root').map((node) => (
      node.id === 'leaf'
        ? { ...node, position: { x: 610, y: 280 } }
        : node
    ));

    const result = reconcileMindmapDrop(nodes, [
      createEdge('root', 'left'),
      createEdge('root', 'right'),
      createEdge('right', 'leaf'),
    ], 'leaf');

    expect(result.changed).toBe(false);
  });

  it('normalizes mindmap edges to bezier side-branch connectors', () => {
    const nodes = [
      createMindmapNode('root', 420, 280, { mindmapDepth: 0 }),
      createMindmapNode('topic', 700, 280, { mindmapParentId: 'root', mindmapSide: 'right', mindmapDepth: 1 }),
    ];

    const [edge] = syncMindmapEdges(nodes, [{
      id: 'root-topic',
      source: 'root',
      target: 'topic',
      type: 'smoothstep',
      selected: false,
    }]);

    expect(edge.type).toBe('bezier');
    expect(edge.markerEnd).toBeUndefined();
    expect(edge.sourceHandle).toBe('right');
    expect(edge.targetHandle).toBe('left');
    expect(edge.data?.mindmapBranchKind).toBe('root');
  });

  it('marks non-root mindmap child edges as branch edges', () => {
    const nodes = [
      createMindmapNode('root', 420, 280, { mindmapDepth: 0 }),
      createMindmapNode('topic', 700, 280, { mindmapParentId: 'root', mindmapSide: 'right', mindmapDepth: 1 }),
      createMindmapNode('leaf', 920, 320, { mindmapParentId: 'topic', mindmapSide: 'right', mindmapDepth: 2 }),
    ];

    const [, branchEdge] = syncMindmapEdges(nodes, [
      { id: 'root-topic', source: 'root', target: 'topic', type: 'bezier', selected: false },
      { id: 'topic-leaf', source: 'topic', target: 'leaf', type: 'bezier', selected: false },
    ]);

    expect(branchEdge.data?.mindmapBranchKind).toBe('branch');
    expect(branchEdge.type).toBe('bezier');
    expect(branchEdge.markerEnd).toBeUndefined();
  });

  it('uses the root branch style when normalizing mindmap edges', () => {
    const nodes = [
      createMindmapNode('root', 420, 280, { mindmapDepth: 0, mindmapBranchStyle: 'straight' }),
      createMindmapNode('topic', 700, 280, { mindmapParentId: 'root', mindmapSide: 'right', mindmapDepth: 1 }),
    ];

    const [edge] = syncMindmapEdges(nodes, [{
      id: 'root-topic',
      source: 'root',
      target: 'topic',
      type: 'bezier',
      selected: false,
    }]);

    expect(edge.type).toBe('straight');
    expect(edge.markerEnd).toBeUndefined();
  });

});
