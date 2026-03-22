import { describe, expect, it } from 'vitest';
import type { FlowNode } from '@/lib/types';
import { applyAIResultToCanvas, positionNewNodesSmartly, restoreExistingPositions } from './positionPreservingApply';

function node(id: string, x = 0, y = 0): FlowNode {
  return { id, type: 'process', position: { x, y }, data: { label: id } } as FlowNode;
}

describe('applyAIResultToCanvas', () => {
  it('preserves existing position for matched nodes', () => {
    const existing = [node('a', 100, 200)];
    const idMap = new Map([['ai-a', 'a']]);
    const { mergedNodes, newNodeIds } = applyAIResultToCanvas(
      [node('ai-a', 0, 0)],
      [],
      existing,
      idMap
    );

    expect(mergedNodes[0].id).toBe('a');
    expect(mergedNodes[0].position).toEqual({ x: 100, y: 200 });
    expect(newNodeIds.size).toBe(0);
  });

  it('marks unmatched nodes as new', () => {
    const { mergedNodes, newNodeIds } = applyAIResultToCanvas(
      [node('brand-new')],
      [],
      [],
      new Map()
    );

    expect(mergedNodes[0].id).toBe('brand-new');
    expect(newNodeIds.has('brand-new')).toBe(true);
  });

  it('handles a mix of matched and new nodes', () => {
    const existing = [node('keep-me', 50, 60)];
    const idMap = new Map([['ai-keep', 'keep-me'], ['ai-new', 'ai-new']]);
    const { mergedNodes, newNodeIds } = applyAIResultToCanvas(
      [node('ai-keep'), node('ai-new')],
      [],
      existing,
      idMap
    );

    expect(mergedNodes.find((n) => n.id === 'keep-me')?.position).toEqual({ x: 50, y: 60 });
    expect(newNodeIds.has('ai-new')).toBe(true);
    expect(newNodeIds.has('keep-me')).toBe(false);
  });
});

describe('positionNewNodesSmartly', () => {
  it('places a new node between two existing neighbors near their midpoint', () => {
    const a = node('a', 0, 0);
    const b = node('b', 0, 400);
    const newNode = node('new', 0, 0);
    const edges = [
      { id: 'e1', source: 'a', target: 'new', type: 'smoothstep', data: {} },
      { id: 'e2', source: 'new', target: 'b', type: 'smoothstep', data: {} },
    ];
    const existingById = new Map([['a', a], ['b', b]]);
    const result = positionNewNodesSmartly([a, b, newNode], edges, new Set(['new']), existingById);
    const placed = result.find((n) => n.id === 'new')!;
    // Should be near midpoint (0, 200) with perpendicular offset
    expect(placed.position.y).toBeGreaterThanOrEqual(150);
    expect(placed.position.y).toBeLessThanOrEqual(250);
  });

  it('places a new node offset from a single neighbor', () => {
    const a = node('a', 100, 100);
    const newNode = node('new', 0, 0);
    const edges = [
      { id: 'e1', source: 'a', target: 'new', type: 'smoothstep', data: {} },
    ];
    const existingById = new Map([['a', a]]);
    const result = positionNewNodesSmartly([a, newNode], edges, new Set(['new']), existingById);
    const placed = result.find((n) => n.id === 'new')!;
    const dist = Math.sqrt(
      (placed.position.x - 100) ** 2 + (placed.position.y - 100) ** 2
    );
    expect(dist).toBe(200);
  });

  it('places orphan nodes to the right of the bounding box', () => {
    const a = node('a', 100, 100);
    const orphan = node('orphan', 0, 0);
    const existingById = new Map([['a', a]]);
    const result = positionNewNodesSmartly([a, orphan], [], new Set(['orphan']), existingById);
    const placed = result.find((n) => n.id === 'orphan')!;
    expect(placed.position.x).toBe(180); // 100 + 80
  });
});

describe('restoreExistingPositions', () => {
  it('restores existing node positions after ELK, keeps ELK position for new nodes', () => {
    const existingById = new Map([['old', node('old', 99, 88)]]);
    const newNodeIds = new Set(['fresh']);

    const elkNodes = [
      node('old', 0, 0),   // ELK moved it — should be restored
      node('fresh', 5, 5), // new node — keep ELK position
    ];

    const result = restoreExistingPositions(elkNodes, newNodeIds, existingById);

    expect(result.find((n) => n.id === 'old')?.position).toEqual({ x: 99, y: 88 });
    expect(result.find((n) => n.id === 'fresh')?.position).toEqual({ x: 5, y: 5 });
  });
});
