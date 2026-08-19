import { describe, expect, it } from 'vitest';
import { applyDocumentCommand } from '../../domain/commands/execute';
import { createTestConnector, createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { assertSemanticConnectorConstraint, lintStructuredPage } from './diagramValidation';

describe('structured diagram validation', () => {
  it('enforces family endpoint constraints', () => {
    const classNode = createTestNode('class', { kind: 'class' });
    const process = createTestNode('process');
    const page = { ...createTestDocument({ nodes: [classNode, process] }).pages[0], diagramKind: 'classDiagram' };
    expect(() => assertSemanticConnectorConstraint(page, classNode, process)).toThrow(/class nodes/);
    expect(() => assertSemanticConnectorConstraint(page, classNode, classNode)).not.toThrow();
  });

  it('returns deterministic fixable journey and architecture lint', () => {
    const a = createTestNode('a', { kind: 'journey', content: { journeyScore: 9 } });
    const b = createTestNode('b', { kind: 'architecture' });
    const document = createTestDocument({ nodes: [a, b], connectors: [createTestConnector('edge', 'a', 'b')] });
    const page = { ...document.pages[0], diagramKind: 'architecture' };
    const issues = lintStructuredPage(page);
    expect(issues.map(({ id }) => id)).toEqual(['architecture-protocol:edge', 'journey-score:a']);
    const journeyFix = issues.find(({ nodeId }) => nodeId === 'a')!.fix!;
    const fixedDocument = applyDocumentCommand({ ...document, pages: [page] }, journeyFix).document;
    expect(fixedDocument.pages[0].nodes[0].content.journeyScore).toBe(5);
  });
});
