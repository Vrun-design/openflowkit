import { describe, expect, it } from 'vitest';
import type { FlowEdge, FlowNode } from '@/lib/types';
import { buildDiagramDocumentJson, importDiagramDocumentJson } from './diagramDocumentTransfer';

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
  it('builds diagram document json from the current graph', () => {
    const json = buildDiagramDocumentJson({
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
    const json = buildDiagramDocumentJson({
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
