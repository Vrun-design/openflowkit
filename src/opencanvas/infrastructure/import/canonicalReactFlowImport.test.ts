import { describe, expect, it } from 'vitest';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import {
  importCanonicalJsonToReactFlow,
  isCanonicalJsonDocument,
} from './canonicalReactFlowImport';

describe('canonical React Flow import boundary', () => {
  it('detects and projects a current canonical document', () => {
    const document = createTestDocument({ nodes: [createTestNode('node-a')] });

    expect(isCanonicalJsonDocument(document)).toBe(true);
    expect(isCanonicalJsonDocument({ nodes: [], edges: [] })).toBe(false);

    const result = importCanonicalJsonToReactFlow(JSON.stringify(document));
    expect(result.nodes.map((node) => node.id)).toEqual(['node-a']);
    expect(result.edges).toEqual([]);
    expect(result.diagramType).toBe('flowchart');
    expect(result.warnings).toEqual([]);
  });

  it('reports migrations, first-page projection, and unsupported diagram kinds', () => {
    const current = createTestDocument({ nodes: [createTestNode('node-a')] });
    const legacy = structuredClone(current) as unknown as Record<string, unknown>;
    legacy.schemaVersion = 0;
    const pages = legacy.pages as Record<string, unknown>[];
    const firstPage = pages[0];
    firstPage.diagramKind = 'future-diagram';
    pages.push({ ...structuredClone(firstPage), id: 'page-2', name: 'Page 2' });

    const result = importCanonicalJsonToReactFlow(JSON.stringify(legacy));
    expect(result.diagramType).toBe('flowchart');
    expect(result.warnings).toEqual([
      'Canonical document migration applied: v0-to-v1-default-portable-fields.',
      'Canonical document contains 2 pages; imported the first page "Page 1" into the current workspace.',
      'Canonical diagram kind "future-diagram" is not supported by the current workspace; using flowchart.',
    ]);
  });

  it('projects an explicitly repaired document and reports every repair', () => {
    const document = createTestDocument({ nodes: [createTestNode('node-a')] });
    const page = document.pages[0];
    const invalid = {
      ...document,
      pages: [{
        ...page,
        nodes: [{ ...page.nodes[0], layerId: 'missing-layer' }],
      }],
    };

    const result = importCanonicalJsonToReactFlow(JSON.stringify(invalid), {
      repairInvalidReferences: true,
    });
    expect(result.nodes.map((node) => node.id)).toEqual(['node-a']);
    expect(result.warnings).toEqual([
      'Canonical integrity repair for page-1/node-a: Moved to layer "default".',
    ]);
  });
});
