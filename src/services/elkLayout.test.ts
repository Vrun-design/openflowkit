import { describe, expect, it } from 'vitest';
import type { FlowEdge, FlowNode } from '@/lib/types';
import {
  buildResolvedLayoutConfiguration,
  getDeterministicSeedOptions,
  normalizeElkEdgeBoundaryFanout,
  normalizeLayoutInputsForDeterminism,
  resolveLayoutedEdgeHandles,
  resolveLayoutPresetOptions,
  shouldUseLightweightLayoutPostProcessing,
} from './elkLayout';

function createNode(id: string, parentId?: string): FlowNode {
  return {
    id,
    type: 'process',
    position: { x: 0, y: 0 },
    data: { label: id },
    parentId,
  } as FlowNode;
}

function createEdge(id: string, source: string, target: string): FlowEdge {
  return { id, source, target } as FlowEdge;
}

function createPositionMap(entries: Array<[string, { x: number; y: number; width?: number; height?: number }]>) {
  return new Map(entries);
}

describe('normalizeLayoutInputsForDeterminism', () => {
  it('sorts top-level nodes, child nodes, and edges deterministically', () => {
    const nodes = [
      createNode('z'),
      createNode('a'),
      createNode('c-child', 'group-1'),
      createNode('group-1'),
      createNode('b-child', 'group-1'),
    ];
    const edges = [
      createEdge('e2', 'z', 'a'),
      createEdge('e1', 'a', 'z'),
      createEdge('e3', 'a', 'z'),
    ];

    const normalized = normalizeLayoutInputsForDeterminism(nodes, edges);
    const childIds = (normalized.childrenByParent.get('group-1') || []).map((node) => node.id);

    expect(normalized.topLevelNodes.map((node) => node.id)).toEqual(['a', 'z', 'group-1']);
    expect(childIds).toEqual(['b-child', 'c-child']);
    expect(normalized.sortedEdges.map((edge) => edge.id)).toEqual(['e1', 'e3', 'e2']);
  });

  it('returns empty child list for parents without children', () => {
    const normalized = normalizeLayoutInputsForDeterminism([createNode('a')], []);
    expect(normalized.childrenByParent.get('a')).toBeUndefined();
    expect(normalized.topLevelNodes).toHaveLength(1);
    expect(normalized.sortedEdges).toHaveLength(0);
  });

  it('uses deterministic component tie-break ordering for top-level nodes and edges', () => {
    const nodes = [
      createNode('z1'),
      createNode('b1'),
      createNode('a1'),
      createNode('c1'),
    ];
    const edges = [
      createEdge('edge-bc', 'b1', 'c1'),
      createEdge('edge-za', 'z1', 'a1'),
    ];

    const normalized = normalizeLayoutInputsForDeterminism(nodes, edges);

    expect(normalized.topLevelNodes.map((node) => node.id)).toEqual(['a1', 'z1', 'b1', 'c1']);
    expect(normalized.sortedEdges.map((edge) => edge.id)).toEqual(['edge-za', 'edge-bc']);
  });

  it('keeps grouped diagram child ordering deterministic across interleaved input order', () => {
    const nodes = [
      createNode('group-b'),
      createNode('a-child-2', 'group-a'),
      createNode('group-a'),
      createNode('b-child-2', 'group-b'),
      createNode('a-child-1', 'group-a'),
      createNode('b-child-1', 'group-b'),
    ];
    const edges = [
      createEdge('edge-b', 'b-child-1', 'b-child-2'),
      createEdge('edge-a', 'a-child-1', 'a-child-2'),
    ];

    const normalized = normalizeLayoutInputsForDeterminism(nodes, edges);

    expect(normalized.topLevelNodes.map((node) => node.id)).toEqual(['group-a', 'group-b']);
    expect((normalized.childrenByParent.get('group-a') || []).map((node) => node.id)).toEqual(['a-child-1', 'a-child-2']);
    expect((normalized.childrenByParent.get('group-b') || []).map((node) => node.id)).toEqual(['b-child-1', 'b-child-2']);
  });
});

describe('getDeterministicSeedOptions', () => {
  it('adds deterministic seed for algorithms that support randomized layouts', () => {
    expect(getDeterministicSeedOptions('force')).toEqual({ 'elk.randomSeed': '1337' });
    expect(getDeterministicSeedOptions('stress')).toEqual({ 'elk.randomSeed': '1337' });
    expect(getDeterministicSeedOptions('radial')).toEqual({ 'elk.randomSeed': '1337' });
  });

  it('falls back to deterministic-input-only path for non-seeded algorithms', () => {
    expect(getDeterministicSeedOptions('layered')).toEqual({});
    expect(getDeterministicSeedOptions('mrtree')).toEqual({});
  });
});

describe('resolveLayoutPresetOptions', () => {
  it('keeps explicit options when no preset is provided', () => {
    expect(
      resolveLayoutPresetOptions({ algorithm: 'mrtree', direction: 'BT', spacing: 'compact' })
    ).toEqual({
      algorithm: 'mrtree',
      direction: 'BT',
      spacing: 'compact',
    });
  });

  it('maps hierarchical preset to layered defaults', () => {
    expect(resolveLayoutPresetOptions({ preset: 'hierarchical' })).toEqual({
      algorithm: 'layered',
      direction: 'TB',
      spacing: 'normal',
    });
  });

  it('maps orthogonal compact and spacious presets deterministically', () => {
    expect(resolveLayoutPresetOptions({ preset: 'orthogonal-compact' })).toEqual({
      algorithm: 'layered',
      direction: 'LR',
      spacing: 'compact',
    });
    expect(resolveLayoutPresetOptions({ preset: 'orthogonal-spacious' })).toEqual({
      algorithm: 'layered',
      direction: 'LR',
      spacing: 'loose',
    });
  });
});

describe('buildResolvedLayoutConfiguration', () => {
  it('keeps orthogonal presets direction-consistent and spacing-distinct', () => {
    const compact = buildResolvedLayoutConfiguration({ preset: 'orthogonal-compact' });
    const spacious = buildResolvedLayoutConfiguration({ preset: 'orthogonal-spacious' });

    expect(compact.direction).toBe('LR');
    expect(spacious.direction).toBe('LR');
    expect(compact.layoutOptions['elk.direction']).toBe('RIGHT');
    expect(spacious.layoutOptions['elk.direction']).toBe('RIGHT');

    expect(Number(compact.dims.nodeNode)).toBeLessThan(Number(spacious.dims.nodeNode));
    expect(Number(compact.dims.nodeLayer)).toBeLessThan(Number(spacious.dims.nodeLayer));
    expect(Number(compact.dims.component)).toBeLessThan(Number(spacious.dims.component));
    expect(compact.layoutOptions['elk.layered.nodePlacement.favorStraightEdges']).toBe('true');
    expect(compact.layoutOptions['elk.layered.mergeEdges']).toBe('true');
    expect(compact.layoutOptions['elk.layered.unnecessaryBendpoints']).toBe('true');
  });

  it('applies more spacious layered heuristics for architecture diagrams', () => {
    const standard = buildResolvedLayoutConfiguration({
      algorithm: 'layered',
      direction: 'LR',
      spacing: 'normal',
    });
    const architecture = buildResolvedLayoutConfiguration({
      algorithm: 'layered',
      direction: 'LR',
      spacing: 'normal',
      diagramType: 'architecture',
    });

    expect(Number(architecture.dims.nodeNode)).toBeGreaterThan(Number(standard.dims.nodeNode));
    expect(Number(architecture.dims.nodeLayer)).toBeGreaterThan(Number(standard.dims.nodeLayer));
    expect(Number(architecture.dims.component)).toBeGreaterThan(Number(standard.dims.component));
    expect(architecture.layoutOptions['elk.spacing.edgeNode']).toBe('24');
    expect(architecture.layoutOptions['elk.spacing.edgeEdge']).toBe('18');
    expect(architecture.layoutOptions['elk.layered.spacing.edgeEdgeBetweenLayers']).toBe('42');
    expect(architecture.layoutOptions['elk.layered.nodePlacement.bk.fixedAlignment']).toBe('BALANCED');
  });
});

describe('normalizeElkEdgeBoundaryFanout', () => {
  it('spreads dense same-side source fan-out along the node boundary', () => {
    const nodes = [
      {
        id: 'source',
        type: 'process',
        position: { x: 0, y: 0 },
        width: 200,
        height: 120,
        data: { label: 'Source' },
      } as FlowNode,
      {
        id: 'a',
        type: 'process',
        position: { x: 300, y: 0 },
        width: 120,
        height: 80,
        data: { label: 'A' },
      } as FlowNode,
      {
        id: 'b',
        type: 'process',
        position: { x: 300, y: 100 },
        width: 120,
        height: 80,
        data: { label: 'B' },
      } as FlowNode,
      {
        id: 'c',
        type: 'process',
        position: { x: 300, y: 200 },
        width: 120,
        height: 80,
        data: { label: 'C' },
      } as FlowNode,
    ];
    const edges = [
      { id: 'e1', source: 'source', target: 'a', sourceHandle: 'right' },
      { id: 'e2', source: 'source', target: 'b', sourceHandle: 'right' },
      { id: 'e3', source: 'source', target: 'c', sourceHandle: 'right' },
    ] as FlowEdge[];
    const edgePointsMap = new Map<string, { x: number; y: number }[]>([
      ['e1', [{ x: 200, y: 60 }, { x: 260, y: 60 }]],
      ['e2', [{ x: 200, y: 60 }, { x: 260, y: 60 }]],
      ['e3', [{ x: 200, y: 60 }, { x: 260, y: 60 }]],
    ]);
    const positionMap = createPositionMap([
      ['source', { x: 0, y: 0, width: 200, height: 120 }],
      ['a', { x: 300, y: 0, width: 120, height: 80 }],
      ['b', { x: 300, y: 100, width: 120, height: 80 }],
      ['c', { x: 300, y: 200, width: 120, height: 80 }],
    ]);

    const normalized = normalizeElkEdgeBoundaryFanout(edges, nodes, positionMap, edgePointsMap);

    expect(normalized.get('e1')?.[0].y).toBeLessThan(60);
    expect(normalized.get('e2')).toBeUndefined();
    expect(normalized.get('e3')?.[0].y).toBeGreaterThan(60);
    expect(normalized.get('e1')).toHaveLength(4);
    expect(normalized.get('e1')?.[1].y).toBe(normalized.get('e1')?.[0].y);
    expect(normalized.get('e1')?.[2].y).toBe(60);
    expect(normalized.get('e1')?.[3]).toEqual({ x: 260, y: 60 });
    expect(normalized.get('e3')?.[1].y).toBe(normalized.get('e3')?.[0].y);
    expect(normalized.get('e3')?.[2].y).toBe(60);
    expect(normalized.get('e3')?.[3]).toEqual({ x: 260, y: 60 });
  });

  it('spreads dense bottom-side source fan-out horizontally', () => {
    const nodes = [
      {
        id: 'source',
        type: 'process',
        position: { x: 0, y: 0 },
        width: 200,
        height: 120,
        data: { label: 'Source' },
      } as FlowNode,
      {
        id: 'a',
        type: 'process',
        position: { x: -80, y: 240 },
        width: 120,
        height: 80,
        data: { label: 'A' },
      } as FlowNode,
      {
        id: 'b',
        type: 'process',
        position: { x: 40, y: 240 },
        width: 120,
        height: 80,
        data: { label: 'B' },
      } as FlowNode,
      {
        id: 'c',
        type: 'process',
        position: { x: 160, y: 240 },
        width: 120,
        height: 80,
        data: { label: 'C' },
      } as FlowNode,
    ];
    const edges = [
      { id: 'e1', source: 'source', target: 'a', sourceHandle: 'bottom' },
      { id: 'e2', source: 'source', target: 'b', sourceHandle: 'bottom' },
      { id: 'e3', source: 'source', target: 'c', sourceHandle: 'bottom' },
    ] as FlowEdge[];
    const edgePointsMap = new Map<string, { x: number; y: number }[]>([
      ['e1', [{ x: 100, y: 120 }, { x: 100, y: 180 }]],
      ['e2', [{ x: 100, y: 120 }, { x: 100, y: 180 }]],
      ['e3', [{ x: 100, y: 120 }, { x: 100, y: 180 }]],
    ]);
    const positionMap = createPositionMap([
      ['source', { x: 0, y: 0, width: 200, height: 120 }],
      ['a', { x: -80, y: 240, width: 120, height: 80 }],
      ['b', { x: 40, y: 240, width: 120, height: 80 }],
      ['c', { x: 160, y: 240, width: 120, height: 80 }],
    ]);

    const normalized = normalizeElkEdgeBoundaryFanout(edges, nodes, positionMap, edgePointsMap);

    expect(normalized.get('e1')?.[0].x).toBeLessThan(100);
    expect(normalized.get('e2')).toBeUndefined();
    expect(normalized.get('e3')?.[0].x).toBeGreaterThan(100);
    expect(normalized.get('e1')).toHaveLength(4);
    expect(normalized.get('e1')?.[1].x).toBe(normalized.get('e1')?.[0].x);
    expect(normalized.get('e1')?.[2].x).toBe(100);
    expect(normalized.get('e1')?.[3]).toEqual({ x: 100, y: 180 });
    expect(normalized.get('e3')?.[1].x).toBe(normalized.get('e3')?.[0].x);
    expect(normalized.get('e3')?.[2].x).toBe(100);
    expect(normalized.get('e3')?.[3]).toEqual({ x: 100, y: 180 });
  });

  it('clamps fan-out spacing to the available node boundary span for dense groups', () => {
    const nodes = [
      {
        id: 'source',
        type: 'process',
        position: { x: 0, y: 0 },
        width: 180,
        height: 60,
        data: { label: 'Source' },
      } as FlowNode,
      ...Array.from({ length: 5 }, (_, index) => ({
        id: `target-${index}`,
        type: 'process',
        position: { x: 280, y: index * 40 },
        width: 120,
        height: 80,
        data: { label: `Target ${index}` },
      } as FlowNode)),
    ];
    const edges = Array.from({ length: 5 }, (_, index) => ({
      id: `e${index}`,
      source: 'source',
      target: `target-${index}`,
      sourceHandle: 'right',
    })) as FlowEdge[];
    const edgePointsMap = new Map(
      edges.map((edge) => [edge.id, [{ x: 180, y: 30 }, { x: 240, y: 30 }]])
    );
    const positionMapEntries: Array<[string, { x: number; y: number; width?: number; height?: number }]> = [
      ['source', { x: 0, y: 0, width: 180, height: 60 }],
      ...Array.from({ length: 5 }, (_, index) => ([
        `target-${index}`,
        { x: 280, y: index * 40, width: 120, height: 80 },
      ] as [string, { x: number; y: number; width?: number; height?: number }])),
    ];
    const positionMap = createPositionMap(positionMapEntries);

    const normalized = normalizeElkEdgeBoundaryFanout(edges, nodes, positionMap, edgePointsMap);
    const top = normalized.get('e0')?.[0];
    const bottom = normalized.get('e4')?.[0];

    expect(top).toBeDefined();
    expect(bottom).toBeDefined();
    expect(top!.y).toBeGreaterThanOrEqual(14);
    expect(bottom!.y).toBeLessThanOrEqual(46);
  });
});

describe('resolveLayoutedEdgeHandles', () => {
  it('reassigns handles from layouted geometry instead of preserving stale sides', () => {
    const nodes = [
      {
        id: 'source',
        type: 'process',
        position: { x: 0, y: 0 },
        width: 200,
        height: 120,
        data: { label: 'Source' },
      } as FlowNode,
      {
        id: 'target',
        type: 'process',
        position: { x: 0, y: 260 },
        width: 120,
        height: 80,
        data: { label: 'Target' },
      } as FlowNode,
    ];
    const edges = [
      {
        id: 'e1',
        source: 'source',
        target: 'target',
        sourceHandle: 'right',
        targetHandle: 'left',
      } as FlowEdge,
    ];

    const rerouted = resolveLayoutedEdgeHandles(nodes, edges);

    expect(rerouted[0].sourceHandle).toBe('bottom');
    expect(rerouted[0].targetHandle).toBe('top');
  });

  it('keeps sibling layouted edges on the same canonical side pair', () => {
    const nodes = [
      {
        id: 'source',
        type: 'process',
        position: { x: 0, y: 0 },
        width: 200,
        height: 120,
        data: { label: 'Source' },
      } as FlowNode,
      {
        id: 'a',
        type: 'process',
        position: { x: 280, y: 0 },
        width: 120,
        height: 80,
        data: { label: 'A' },
      } as FlowNode,
      {
        id: 'b',
        type: 'process',
        position: { x: 280, y: 120 },
        width: 120,
        height: 80,
        data: { label: 'B' },
      } as FlowNode,
      {
        id: 'c',
        type: 'process',
        position: { x: 280, y: 240 },
        width: 120,
        height: 80,
        data: { label: 'C' },
      } as FlowNode,
    ];
    const edges = [
      { id: 'e1', source: 'source', target: 'a' } as FlowEdge,
      { id: 'e2', source: 'source', target: 'b' } as FlowEdge,
      { id: 'e3', source: 'source', target: 'c' } as FlowEdge,
    ];

    const rerouted = resolveLayoutedEdgeHandles(nodes, edges);

    expect(rerouted.every((edge) => edge.sourceHandle === 'right')).toBe(true);
    expect(rerouted.every((edge) => edge.targetHandle === 'left')).toBe(true);
  });
});

describe('shouldUseLightweightLayoutPostProcessing', () => {
  it('keeps smaller standard diagrams on the full post-processing path', () => {
    expect(shouldUseLightweightLayoutPostProcessing(20, 24, 'flowchart')).toBe(false);
  });

  it('switches larger diagrams to the lightweight post-processing path', () => {
    expect(shouldUseLightweightLayoutPostProcessing(48, 20, 'flowchart')).toBe(true);
    expect(shouldUseLightweightLayoutPostProcessing(16, 72, 'flowchart')).toBe(true);
  });

  it('switches architecture diagrams earlier because icon-heavy edge normalization is expensive', () => {
    expect(shouldUseLightweightLayoutPostProcessing(24, 20, 'architecture')).toBe(true);
    expect(shouldUseLightweightLayoutPostProcessing(12, 36, 'infrastructure')).toBe(true);
  });
});
