import { describe, expect, it } from 'vitest';
import { applyDocumentCommand } from '../../domain/commands/execute';
import { projectLegacyDocument } from '../../domain/document/legacyProjection';
import { createBounds2d } from '../../domain/geometry/bounds';
import { buildProductionTransformCommand } from './productionTransformBridge';

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
    const command = buildProductionTransformCommand(source, 'page', {
      nodes: [transformed], bounds: createBounds2d(42, 64, 180, 90), snappedX: false, snappedY: false,
    });
    const page = applyDocumentCommand(source, command).document.pages[0];
    expect(page.nodes[0]).toMatchObject({
      id: 'a', content: { label: 'A', opaque: 'keep' },
      transform: { translation: { x: 42, y: 64 } }, size: { width: 180, height: 90 },
    });
    expect(page.nodes[1]).toMatchObject({ id: 'b', transform: { translation: { x: 200, y: 20 } } });
    expect(page.connectors[0]).toMatchObject({ id: 'e' });
  });

  it('rejects unknown or duplicate transformed nodes', () => {
    const source = document();
    const node = source.pages[0].nodes[0];
    const result = { nodes: [{ ...node, id: 'missing' }], bounds: createBounds2d(0, 0, 1, 1), snappedX: false, snappedY: false };
    expect(() => buildProductionTransformCommand(source, 'page', result)).toThrow(/unknown node/);
    expect(() => buildProductionTransformCommand(source, 'page', { ...result, nodes: [node, node] })).toThrow(/duplicate/);
  });
});
