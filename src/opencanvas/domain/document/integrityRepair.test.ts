import { describe, expect, it } from 'vitest';
import { createTestConnector, createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { inspectDocumentIntegrity } from './integrityRepair';
import { validateSceneDocumentV1 } from './validation';

describe('document integrity repair', () => {
  it('reports valid documents without cloning or mutation', () => {
    const document = createTestDocument();
    expect(inspectDocumentIntegrity(document)).toEqual({ status: 'healthy', document, issues: [] });
  });

  it('deterministically repairs invalid references and drops only orphan connectors', () => {
    const document = createTestDocument({ nodes: [createTestNode('a'), createTestNode('b')],
      connectors: [createTestConnector('edge', 'a', 'b')] }); const page = document.pages[0];
    const invalid = { ...document, pages: [{ ...page,
      nodes: page.nodes.map((node, index) => index === 0
        ? { ...node, layerId: 'missing', parentId: node.id } : node),
      connectors: [...page.connectors, { ...page.connectors[0], id: 'orphan',
        target: { ...page.connectors[0].target, nodeId: 'missing-node' } }],
    }] };
    const report = inspectDocumentIntegrity(invalid);
    expect(report.status).toBe('repairable');
    if (report.status !== 'repairable') return;
    expect(validateSceneDocumentV1(report.document).success).toBe(true);
    expect(report.actions.map(({ kind }) => kind)).toEqual([
      'reset-layer', 'detach-parent', 'remove-connector',
    ]);
    expect(report.document.pages[0].connectors.some(({ id }) => id === 'orphan')).toBe(false);
  });

  it('refuses structural corruption instead of guessing missing content', () => {
    const document = createTestDocument();
    expect(inspectDocumentIntegrity({ ...document, pages: [] }).status).toBe('unrepairable');
  });
});
