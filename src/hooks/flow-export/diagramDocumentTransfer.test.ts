import { describe, expect, it } from 'vitest';
import type { FlowEdge, FlowNode } from '@/lib/types';
import { buildDiagramDocumentJson, importDiagramDocumentJson } from './diagramDocumentTransfer';
import { createTestDocument, createTestNode } from '@/opencanvas/testing/builders/documentBuilder';

function createNode(id: string): FlowNode {
  return {
    id,
    type: 'process',
    position: { x: 0, y: 0 },
    data: { label: id },
  } as FlowNode;
}

function createEdge(id: string, source: string, target: string): FlowEdge {
  return { id, source, target } as FlowEdge;
}

describe('diagramDocumentTransfer', () => {
  it('builds diagram document json from the current graph', async () => {
    const json = await buildDiagramDocumentJson({
      nodes: [createNode('n1')],
      edges: [createEdge('e1', 'n1', 'n1')],
      exportSerializationMode: 'deterministic',
      activeTab: { diagramType: 'flowchart' },
    });

    const parsed = JSON.parse(json) as { nodes: FlowNode[]; edges: FlowEdge[]; diagramType: string };
    expect(parsed.diagramType).toBe('flowchart');
    expect(parsed.nodes).toHaveLength(1);
    expect(parsed.edges).toHaveLength(1);
  });

  it('imports diagram document json into composed nodes and edges', async () => {
    const json = await buildDiagramDocumentJson({
      nodes: [createNode('n1')],
      edges: [createEdge('e1', 'n1', 'n1')],
      exportSerializationMode: 'deterministic',
      activeTab: { diagramType: 'flowchart' },
    });

    const result = await importDiagramDocumentJson({
      json,
      importStart: performance.now(),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.nodes).toHaveLength(1);
    expect(result.edges).toHaveLength(1);
    expect(result.outcome.status).toBe('success');
    expect(result.report.status).toBe('success');
  });

  it('imports canonical scene json through the validated projection boundary', async () => {
    const document = createTestDocument({ nodes: [createTestNode('canonical-node')] });
    const result = await importDiagramDocumentJson({
      json: JSON.stringify(document),
      importStart: performance.now(),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nodes.map((node) => node.id)).toEqual(['canonical-node']);
    expect(result.edges).toEqual([]);
    expect(result.diagramType).toBe('flowchart');
    expect(result.playback).toBeUndefined();
    expect(result.report.status).toBe('success');
  });

  it('returns canonical validation failures without falling back to legacy parsing', async () => {
    const document = createTestDocument();
    const result = await importDiagramDocumentJson({
      json: JSON.stringify({ ...document, schemaVersion: 99 }),
      importStart: performance.now(),
    });

    expect(result.ok).toBe(false);
    expect(result.report.issues[0]?.message).toContain('newer than supported');
    if (result.ok === false) expect(result.canonicalRepairAvailable).toBe(false);
  });

  it('requires explicit consent and reports canonical integrity repairs', async () => {
    const document = createTestDocument({ nodes: [createTestNode('canonical-node')] });
    const page = document.pages[0];
    const invalid = {
      ...document,
      pages: [{
        ...page,
        nodes: [{ ...page.nodes[0], layerId: 'missing-layer' }],
      }],
    };
    const first = await importDiagramDocumentJson({
      json: JSON.stringify(invalid),
      importStart: performance.now(),
    });
    expect(first.ok).toBe(false);
    if (first.ok === true) return;
    expect(first.canonicalRepairAvailable).toBe(true);

    const repaired = await importDiagramDocumentJson({
      json: JSON.stringify(invalid),
      importStart: performance.now(),
      repairCanonicalReferences: true,
    });
    expect(repaired.ok).toBe(true);
    if (!repaired.ok) return;
    expect(repaired.nodes.map((node) => node.id)).toEqual(['canonical-node']);
    expect(repaired.warnings).toEqual([
      'Canonical integrity repair for page-1/canonical-node: Moved to layer "default".',
    ]);
  });

  it('returns a structured failure report for invalid diagram json', async () => {
    const result = await importDiagramDocumentJson({
      json: JSON.stringify({ version: '1.0', nodes: [] }),
      importStart: performance.now(),
    });

    expect(result.ok).toBe(false);
    expect(result.outcome.status).toBe('error');
    expect(result.report.status).toBe('failed');
    expect(result.report.issues[0]?.message).toContain('missing nodes or edges arrays');
  });

  it('returns a structured failure report for non-object diagram envelopes', async () => {
    const result = await importDiagramDocumentJson({
      json: JSON.stringify(['not-a-document']),
      importStart: performance.now(),
    });

    expect(result.ok).toBe(false);
    expect(result.outcome.status).toBe('error');
    expect(result.report.status).toBe('failed');
    expect(result.report.issues[0]?.message).toContain('missing nodes or edges arrays');
  });
});
