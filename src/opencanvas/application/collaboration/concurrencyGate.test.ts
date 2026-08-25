import { describe, expect, it } from 'vitest';
import type { DocumentCommand } from '../../domain/commands/types';
import type { SceneNode } from '../../domain/document/types';
import { createTestConnector, createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import type { CanonicalCollaborationOperation } from './canonicalOperationLog';
import { evaluateCanonicalConcurrency } from './concurrencyGate';

function operation(
  command: DocumentCommand,
  clientId: string,
  lamport: number
): CanonicalCollaborationOperation {
  return {
    opId: `${clientId}:${lamport}:${command.id}`,
    documentId: 'document-1',
    clientId,
    lamport,
    command,
  };
}

function rename(node: SceneNode, label: string): DocumentCommand {
  return {
    kind: 'set-node', id: `rename-${node.id}`, label: `Rename ${node.id}`,
    pageId: 'page-1', before: node, after: { ...node, content: { label } },
  };
}

describe('canonical collaboration concurrency gate', () => {
  it('exhaustively converges independent edits across four peers', () => {
    const document = createTestDocument({
      nodes: ['a', 'b', 'c', 'd'].map((id) => createTestNode(id)),
    });
    const operations = document.pages[0].nodes.map((node, index) => operation(
      rename(node, node.id.toUpperCase()), `peer-${index}`, 1
    ));

    const result = evaluateCanonicalConcurrency(document, operations);
    expect(result.converged).toBe(true);
    expect(result.ordersEvaluated).toBe(24);
    expect(result.reference.document.pages[0].nodes.map((node) => node.content.label))
      .toEqual(['A', 'B', 'C', 'D']);
  });

  it('converges dependent node/connector creation and deterministic conflicts', () => {
    const original = createTestNode('original');
    const insertedA = createTestNode('inserted-a');
    const insertedB = createTestNode('inserted-b');
    const document = createTestDocument({ nodes: [original] });
    const operations = [
      operation({
        kind: 'insert-node', id: 'insert-a', label: 'Insert A', pageId: 'page-1',
        index: 1, node: insertedA,
      }, 'a', 1),
      operation({
        kind: 'insert-node', id: 'insert-b', label: 'Insert B', pageId: 'page-1',
        index: 2, node: insertedB,
      }, 'b', 1),
      operation({
        kind: 'insert-connector', id: 'connect', label: 'Connect', pageId: 'page-1', index: 0,
        connector: createTestConnector('a-b', insertedA.id, insertedB.id),
      }, 'c', 2),
      operation(rename(original, 'Winning rename'), 'd', 1),
      operation({
        kind: 'remove-node', id: 'remove-original', label: 'Remove original',
        pageId: 'page-1', index: 0, node: original,
      }, 'z', 1),
    ];

    const result = evaluateCanonicalConcurrency(document, operations);
    expect(result.converged).toBe(true);
    expect(result.ordersEvaluated).toBe(120);
    expect(result.reference.document.pages[0].connectors.map((connector) => connector.id))
      .toEqual(['a-b']);
    expect(result.reference.rejected.map((item) => item.operation.clientId)).toEqual(['z']);
  });

  it('bounds factorial corpus growth', () => {
    const document = createTestDocument();
    const command = {
      kind: 'insert-node' as const,
      id: 'insert', label: 'Insert', pageId: 'page-1', index: 0, node: createTestNode('x'),
    };
    const operations = Array.from({ length: 8 }, (_, index) => operation(
      { ...command, id: `insert-${index}`, node: createTestNode(`node-${index}`) },
      `peer-${index}`,
      1
    ));
    expect(() => evaluateCanonicalConcurrency(document, operations)).toThrow(/at most 7/);
  });
});
