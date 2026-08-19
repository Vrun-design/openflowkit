import { describe, expect, it } from 'vitest';
import { projectLegacyDocument } from '../../domain/document/legacyProjection';
import { createBounds2d } from '../../domain/geometry/bounds';
import { projectProductionTransform } from './productionTransformBridge';

function document() {
  return projectLegacyDocument({
    name: 'Production',
    diagramType: 'flowchart',
    nodes: [
      { id: 'a', type: 'process', position: { x: 10, y: 20 }, data: { label: 'A', opaque: 'keep' }, style: { width: 100, height: 50 }, selected: true },
      { id: 'b', type: 'process', position: { x: 200, y: 20 }, data: { label: 'B' }, style: { width: 100, height: 50 } },
    ],
    edges: [{ id: 'e', source: 'a', target: 'b', data: { opaqueEdge: true } }],
  }, { documentId: 'doc', pageId: 'page', now: '2026-08-13T00:00:00.000Z' });
}

describe('production transform bridge', () => {
  it('updates transformed geometry while preserving untouched legacy fields', () => {
    const source = document();
    const transformed = {
      ...source.pages[0].nodes[0],
      transform: { ...source.pages[0].nodes[0].transform, translation: { x: 42, y: 64 } },
      size: { width: 180, height: 90 },
    };
    const projection = projectProductionTransform(source, 'page', {
      nodes: [transformed], bounds: createBounds2d(42, 64, 180, 90), snappedX: false, snappedY: false,
    }, '2026-08-13T00:01:00.000Z');
    expect(projection.nodes[0]).toMatchObject({
      id: 'a', position: { x: 42, y: 64 }, data: { label: 'A', opaque: 'keep' },
      style: { width: 180, height: 90 }, selected: true,
    });
    expect(projection.nodes[1]).toMatchObject({ id: 'b', position: { x: 200, y: 20 } });
    expect(projection.edges[0]).toMatchObject({ id: 'e', data: { opaqueEdge: true } });
  });

  it('rejects unknown or duplicate transformed nodes', () => {
    const source = document();
    const node = source.pages[0].nodes[0];
    const result = { nodes: [{ ...node, id: 'missing' }], bounds: createBounds2d(0, 0, 1, 1), snappedX: false, snappedY: false };
    expect(() => projectProductionTransform(source, 'page', result, source.updatedAt)).toThrow(/unknown node/);
    expect(() => projectProductionTransform(source, 'page', { ...result, nodes: [node, node] }, source.updatedAt)).toThrow(/duplicate/);
  });
});
