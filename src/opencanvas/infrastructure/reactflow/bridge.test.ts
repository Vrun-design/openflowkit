import { describe, expect, it } from 'vitest';
import type { FlowEdge, FlowNode } from '@/lib/types';
import { projectReactFlowGraphThroughOpenCanvas } from './bridge';
import type { ReactFlowProjectionContext } from './contracts';

const context: ReactFlowProjectionContext = {
  documentId: 'document-1',
  pageId: 'page-1',
  name: 'Bridge',
  diagramType: 'flowchart',
  now: '2026-08-07T12:00:00.000Z',
};

const nodes = [
  { id: 'node-1', type: 'process', position: { x: 0, y: 0 }, data: { label: 'Node' } },
] as FlowNode[];
const edges = [{ id: 'edge-1', source: 'node-1', target: 'node-1' }] as FlowEdge[];

describe('OpenCanvas React Flow bridge', () => {
  it('returns original renderer arrays when the flag path is disabled', () => {
    const result = projectReactFlowGraphThroughOpenCanvas({ nodes, edges }, context, {
      enabled: false,
    });

    expect(result.usedCanonicalDocument).toBe(false);
    expect(result.nodes).toBe(nodes);
    expect(result.edges).toBe(edges);
    expect(result.document).toBeNull();
  });

  it('uses the canonical projection only when explicitly enabled', () => {
    const result = projectReactFlowGraphThroughOpenCanvas({ nodes, edges }, context, {
      enabled: true,
    });

    expect(result.usedCanonicalDocument).toBe(true);
    expect(result.nodes).toEqual(nodes);
    expect(result.edges).toEqual(edges);
    expect(result.nodes).not.toBe(nodes);
    expect(result.document?.format).toBe('openflowkit.scene');
  });

  it('gives an unsized legacy node a drawable size without writing it back', () => {
    const result = projectReactFlowGraphThroughOpenCanvas({ nodes, edges }, context, {
      enabled: true,
    });
    const projected = result.document!.pages[0].nodes[0];
    expect(projected.size.width).toBeGreaterThan(0);
    expect(projected.size.height).toBeGreaterThan(0);
    expect(result.nodes[0]).not.toHaveProperty('width');
    expect(result.nodes[0].style).toBeUndefined();
  });

  it('uses the default-off rollout flag when no override is supplied', () => {
    const result = projectReactFlowGraphThroughOpenCanvas({ nodes, edges }, context);
    expect(result.usedCanonicalDocument).toBe(false);
  });
});
