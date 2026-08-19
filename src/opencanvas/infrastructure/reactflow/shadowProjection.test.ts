import { describe, expect, it } from 'vitest';
import type { FlowEdge, FlowNode } from '@/lib/types';
import type { ReactFlowProjectionContext } from './contracts';
import { runOpenCanvasShadowProjection } from './shadowProjection';

const context: ReactFlowProjectionContext = {
  documentId: 'document-1',
  pageId: 'page-1',
  name: 'Production shadow',
  diagramType: 'flowchart',
  now: '2026-08-13T00:00:00.000Z',
};

describe('OpenCanvas production shadow projection', () => {
  it('proves semantic round-trip parity without mutating live graph arrays', () => {
    const nodes = [{
      id: 'node-1',
      type: 'process',
      position: { x: 20, y: 40 },
      selected: true,
      measured: { width: 160, height: 80 },
      data: { label: 'Live node', unknownFutureField: { preserved: true } },
    }] as FlowNode[];
    const edges = [{
      id: 'edge-1',
      source: 'node-1',
      target: 'node-1',
      selected: true,
      data: { curve: 'smoothstep', unknownFutureField: 'preserved' },
    }] as FlowEdge[];
    const before = structuredClone({ nodes, edges });
    const times = [10, 13];

    const result = runOpenCanvasShadowProjection(
      { nodes, edges },
      context,
      { now: () => times.shift() ?? 13 }
    );

    expect(result.status).toBe('passed');
    expect(result.durationMs).toBe(3);
    expect(result.nodeCount).toBe(1);
    expect(result.connectorCount).toBe(1);
    expect(result.status === 'passed' && result.document.format).toBe('openflowkit.scene');
    expect({ nodes, edges }).toEqual(before);
  });

  it('returns a safe code instead of leaking projection error details', () => {
    const invalidNode = {
      id: 'invalid',
      type: 'process',
      position: { x: Number.NaN, y: 0 },
      data: { label: 'Invalid', secret: 'must-not-appear-in-result' },
    } as FlowNode;

    const result = runOpenCanvasShadowProjection(
      { nodes: [invalidNode], edges: [] },
      context,
      { now: () => 1 }
    );

    expect(result).toEqual({
      status: 'failed',
      code: 'CANONICAL_PROJECTION_FAILED',
      nodeCount: 1,
      connectorCount: 0,
      durationMs: 0,
    });
    expect(JSON.stringify(result)).not.toContain('secret');
  });
});
