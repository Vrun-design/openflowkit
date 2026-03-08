import { describe, expect, it } from 'vitest';
import type { FlowEdge, FlowNode } from '@/lib/types';
import { assignSmartHandles, assignSmartHandlesWithOptions } from './smartEdgeRouting';

function createNode(id: string, x: number, y: number, type = 'process'): FlowNode {
  return {
    id,
    type,
    position: { x, y },
    data: { label: id },
  } as FlowNode;
}

function createEdge(id: string, source: string, target: string): FlowEdge {
  return { id, source, target } as FlowEdge;
}

describe('assignSmartHandles', () => {
  it('keeps sibling edges on the same geometry-driven sides', () => {
    const nodes = [createNode('a', 0, 0), createNode('b', 300, 0)];
    const edges = [
      createEdge('e1', 'a', 'b'),
      createEdge('e2', 'a', 'b'),
      createEdge('e3', 'a', 'b'),
    ];

    const routed = assignSmartHandles(nodes, edges);

    expect(routed[0].sourceHandle).toBe('right');
    expect(routed[0].targetHandle).toBe('left');
    expect(routed[1].sourceHandle).toBe('right');
    expect(routed[1].targetHandle).toBe('left');
    expect(routed[2].sourceHandle).toBe('right');
    expect(routed[2].targetHandle).toBe('left');
  });

  it('keeps bidirectional edges geometry-consistent in each direction', () => {
    const nodes = [createNode('a', 0, 0), createNode('b', 0, 300)];
    const edges = [
      createEdge('e-forward', 'a', 'b'),
      createEdge('e-reverse', 'b', 'a'),
    ];

    const routed = assignSmartHandles(nodes, edges);
    const forward = routed.find((edge) => edge.id === 'e-forward');
    const reverse = routed.find((edge) => edge.id === 'e-reverse');

    expect(forward?.sourceHandle).toBe('bottom');
    expect(forward?.targetHandle).toBe('top');
    expect(reverse?.sourceHandle).toBe('top');
    expect(reverse?.targetHandle).toBe('bottom');
  });

  it('invalidates cached routing context when node mutation epoch changes', () => {
    const edges = [createEdge('e1', 'a', 'b')];

    const nodesHorizontal = [createNode('a', 0, 0), createNode('b', 300, 0)];
    const routedHorizontal = assignSmartHandles(nodesHorizontal, edges);
    expect(routedHorizontal[0].sourceHandle).toBe('right');
    expect(routedHorizontal[0].targetHandle).toBe('left');

    const nodesVertical = [createNode('a', 0, 0), createNode('b', 0, 300)];
    const routedVertical = assignSmartHandles(nodesVertical, edges);
    expect(routedVertical[0].sourceHandle).toBe('bottom');
    expect(routedVertical[0].targetHandle).toBe('top');
  });

  it('invalidates cached routing context when edge mutation epoch changes', () => {
    const nodes = [createNode('a', 0, 0), createNode('b', 300, 0)];
    const oneEdge = [createEdge('e1', 'a', 'b')];
    const twoEdges = [createEdge('e1', 'a', 'b'), createEdge('e2', 'a', 'b')];

    const routedOne = assignSmartHandles(nodes, oneEdge);
    expect(routedOne[0].sourceHandle).toBe('right');
    expect(routedOne[0].targetHandle).toBe('left');

    const routedTwo = assignSmartHandles(nodes, twoEdges);
    expect(routedTwo[0].sourceHandle).toBe('right');
    expect(routedTwo[0].targetHandle).toBe('left');
    expect(routedTwo[1].sourceHandle).toBe('right');
    expect(routedTwo[1].targetHandle).toBe('left');
  });

  it('preserves edge label placement metadata during reroute updates', () => {
    const nodes = [createNode('a', 0, 0), createNode('b', 0, 300)];
    const edge = {
      ...createEdge('e-label', 'a', 'b'),
      sourceHandle: 'right',
      targetHandle: 'left',
      label: 'HTTP',
      data: {
        labelPosition: 0.72,
        labelOffsetX: 6,
        labelOffsetY: -4,
      },
    } as FlowEdge;

    const routed = assignSmartHandles(nodes, [edge]);

    expect(routed[0]).not.toBe(edge);
    expect(routed[0].sourceHandle).toBe('bottom');
    expect(routed[0].targetHandle).toBe('top');
    expect(routed[0].label).toBe('HTTP');
    expect(routed[0].data?.labelPosition).toBe(0.72);
    expect(routed[0].data?.labelOffsetX).toBe(6);
    expect(routed[0].data?.labelOffsetY).toBe(-4);
  });

  it('supports infrastructure profile bias for diagonal layouts', () => {
    const nodes = [createNode('a', 0, 0), createNode('b', 220, 260)];
    const edge = createEdge('e-diag', 'a', 'b');

    const standard = assignSmartHandles(nodes, [edge]);
    const infra = assignSmartHandlesWithOptions(nodes, [edge], {
      profile: 'infrastructure',
      bundlingEnabled: false,
    });

    expect(standard[0].sourceHandle).toBe('bottom');
    expect(standard[0].targetHandle).toBe('top');
    expect(infra[0].sourceHandle).toBe('right');
    expect(infra[0].targetHandle).toBe('left');
  });

  it('keeps bundling option path-only and not side-selective', () => {
    const nodes = [createNode('a', 0, 0), createNode('b', 300, 0)];
    const edges = [createEdge('e1', 'a', 'b'), createEdge('e2', 'a', 'b')];

    const spread = assignSmartHandlesWithOptions(nodes, edges, {
      profile: 'standard',
      bundlingEnabled: false,
    });
    const bundled = assignSmartHandlesWithOptions(nodes, edges, {
      profile: 'standard',
      bundlingEnabled: true,
    });

    expect(spread[0].sourceHandle).toBe('right');
    expect(spread[0].targetHandle).toBe('left');
    expect(spread[1].sourceHandle).toBe('right');
    expect(spread[1].targetHandle).toBe('left');

    expect(bundled[0].sourceHandle).toBe('right');
    expect(bundled[0].targetHandle).toBe('left');
    expect(bundled[1].sourceHandle).toBe('right');
    expect(bundled[1].targetHandle).toBe('left');
  });

  it('preserves explicit architecture side semantics over auto-routing', () => {
    const nodes = [createNode('a', 0, 0), createNode('b', 300, 0)];
    const edge = {
      ...createEdge('e-arch', 'a', 'b'),
      data: {
        archSourceSide: 'T',
        archTargetSide: 'B',
      },
    } as FlowEdge;

    const routed = assignSmartHandlesWithOptions(nodes, [edge], {
      profile: 'infrastructure',
      bundlingEnabled: false,
    });

    expect(routed[0].sourceHandle).toBe('top');
    expect(routed[0].targetHandle).toBe('bottom');
  });

  it('maps smart-routed handles to the actual lightweight node handles', () => {
    const nodes = [createNode('text-a', 0, 0, 'text'), createNode('text-b', 320, 0, 'text')];
    const edge = createEdge('e-text', 'text-a', 'text-b');

    const routed = assignSmartHandles(nodes, [edge]);

    expect(routed[0].sourceHandle).toBe('source-right');
    expect(routed[0].targetHandle).toBe('target-left');
  });
});
