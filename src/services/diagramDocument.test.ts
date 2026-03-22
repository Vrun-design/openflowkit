import { describe, expect, it } from 'vitest';
import type { FlowEdge, FlowNode } from '@/lib/types';
import {
  createDiagramDocument,
  DEFAULT_DIAGRAM_TYPE,
  DIAGRAM_DOCUMENT_VERSION,
  EXTENDED_DIAGRAM_DOCUMENT_VERSION,
  parseDiagramDocumentImport,
} from './diagramDocument';
import { buildImportFidelityReport, mapWarningToIssue } from './importFidelity';

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

describe('diagramDocument', () => {
  it('creates export document with version metadata', () => {
    const doc = createDiagramDocument([createNode('n1')], [createEdge('e1', 'n1', 'n1')], DEFAULT_DIAGRAM_TYPE, { extendedDocumentModel: false });
    expect(doc.version).toBe(DIAGRAM_DOCUMENT_VERSION);
    expect(doc.name).toBe('OpenFlowKit Diagram');
    expect(doc.diagramType).toBe(DEFAULT_DIAGRAM_TYPE);
    expect(typeof doc.createdAt).toBe('string');
  });

  it('creates and imports extended document metadata when explicitly enabled', () => {
    const doc = createDiagramDocument(
      [createNode('n1')],
      [createEdge('e1', 'n1', 'n1')],
      DEFAULT_DIAGRAM_TYPE,
      {
        extendedDocumentModel: true,
        documentCapabilities: { animationTimeline: true, playbackStudio: false },
        scenes: [{ id: 'scene-1', name: 'Scene 1', stepIds: ['step-1'] }],
        timeline: [{ id: 'step-1', nodeId: 'n1', durationMs: 1200 }],
        exportPresets: [{ id: 'preset-1', name: 'Docs Loop', format: 'webm' }],
        bindings: [{ id: 'binding-1', targetId: 'n1', type: 'readonly-http' }],
      }
    );

    expect(doc.version).toBe(EXTENDED_DIAGRAM_DOCUMENT_VERSION);

    const parsed = parseDiagramDocumentImport(doc, { extendedDocumentModel: true });
    expect(parsed.warnings).toEqual([]);
    expect(parsed.documentCapabilities).toEqual({ animationTimeline: true, playbackStudio: false });
    expect(parsed.scenes?.[0]?.name).toBe('Scene 1');
    expect(parsed.timeline?.[0]?.nodeId).toBe('n1');
    expect(parsed.exportPresets?.[0]?.format).toBe('webm');
    expect(parsed.bindings?.[0]?.type).toBe('readonly-http');
    expect(parsed.playback?.timeline?.[0]?.nodeId).toBe('n1');
  });

  it('imports current major version without warnings', () => {
    const parsed = parseDiagramDocumentImport({
      version: '1.2',
      nodes: [createNode('n1')],
      edges: [createEdge('e1', 'n1', 'n1')],
    });
    expect(parsed.warnings).toEqual([]);
    expect(parsed.diagramType).toBe(DEFAULT_DIAGRAM_TYPE);
    expect(parsed.nodes).toHaveLength(1);
    expect(parsed.edges).toHaveLength(1);
  });

  it('imports legacy unversioned documents with warning', () => {
    const parsed = parseDiagramDocumentImport({
      nodes: [createNode('n1')],
      edges: [createEdge('e1', 'n1', 'n1')],
    });
    expect(parsed.warnings).toHaveLength(1);
    expect(parsed.warnings[0]).toContain('legacy JSON');
    expect(parsed.diagramType).toBe(DEFAULT_DIAGRAM_TYPE);

    const report = buildImportFidelityReport({
      source: 'json',
      nodeCount: parsed.nodes.length,
      edgeCount: parsed.edges.length,
      elapsedMs: 5,
      issues: parsed.warnings.map((warning) => mapWarningToIssue(warning)),
    });
    expect(report.status).toBe('success_with_warnings');
  });

  it('warns and strips extended metadata when extended document support is disabled', () => {
    const parsed = parseDiagramDocumentImport({
      version: EXTENDED_DIAGRAM_DOCUMENT_VERSION,
      documentCapabilities: { animationTimeline: true },
      scenes: [{ id: 'scene-1', name: 'Scene 1', stepIds: ['step-1'] }],
      timeline: [{ id: 'step-1', nodeId: 'n1' }],
      exportPresets: [{ id: 'preset-1', name: 'Demo', format: 'gif' }],
      bindings: [{ id: 'binding-1', targetId: 'n1', type: 'readonly-http' }],
      nodes: [createNode('n1')],
      edges: [createEdge('e1', 'n1', 'n1')],
    }, { extendedDocumentModel: false });

    expect(parsed.warnings).toContain(
      'Imported document metadata was preserved only at the core graph level because extended document support is disabled.'
    );
    expect(parsed.documentCapabilities).toBeUndefined();
    expect(parsed.scenes).toBeUndefined();
    expect(parsed.timeline).toBeUndefined();
    expect(parsed.exportPresets).toBeUndefined();
    expect(parsed.bindings).toBeUndefined();
  });

  it('rejects unsupported future major versions', () => {
    expect(() =>
      parseDiagramDocumentImport({
        version: '2.0',
        nodes: [createNode('n1')],
        edges: [createEdge('e1', 'n1', 'n1')],
      })
    ).toThrow(/Unsupported flow file version/);
  });

  it('rejects malformed payloads', () => {
    expect(() => parseDiagramDocumentImport({ version: '1.0', nodes: [] })).toThrow(
      /missing nodes or edges arrays/
    );
  });

  it('imports diagramType when present', () => {
    const parsed = parseDiagramDocumentImport({
      version: '1.0',
      diagramType: 'erDiagram',
      nodes: [createNode('n1')],
      edges: [],
    });

    expect(parsed.diagramType).toBe('erDiagram');
    expect(parsed.warnings).toEqual([]);
  });
});
