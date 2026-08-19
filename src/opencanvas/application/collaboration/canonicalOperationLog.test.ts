import { describe, expect, it } from 'vitest';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import type { DocumentCommand } from '../../domain/commands/types';
import type { SceneDocumentV1, SceneNode } from '../../domain/document/types';
import {
  replayCanonicalOperationLog,
  type CanonicalCollaborationOperation,
} from './canonicalOperationLog';

function operation(
  command: DocumentCommand,
  clientId: string,
  lamport: number,
  opId = `${clientId}:${lamport}`
): CanonicalCollaborationOperation {
  return { opId, documentId: 'document-1', clientId, lamport, command };
}

function setNode(before: SceneNode, after: SceneNode, id: string): DocumentCommand {
  return { kind: 'set-node', id, label: id, pageId: 'page-1', before, after };
}

function replayEveryOrder(
  document: SceneDocumentV1,
  operations: readonly CanonicalCollaborationOperation[]
) {
  return [
    replayCanonicalOperationLog(document, operations),
    replayCanonicalOperationLog(document, [...operations].reverse()),
  ];
}

describe('canonical collaboration operation log', () => {
  it('converges independent concurrent node edits regardless of arrival order', () => {
    const document = createTestDocument({ nodes: [createTestNode('node-1'), createTestNode('node-2')] });
    const [first, second] = document.pages[0].nodes;
    const operations = [
      operation(setNode(first, { ...first, content: { label: 'Alpha' } }, 'rename-a'), 'a', 1),
      operation(setNode(second, { ...second, content: { label: 'Beta' } }, 'rename-b'), 'b', 1),
    ];
    const results = replayEveryOrder(document, operations);
    expect(results[0]).toEqual(results[1]);
    expect(results[0].document.pages[0].nodes.map((node) => node.content.label)).toEqual(['Alpha', 'Beta']);
    expect(results[0].rejected).toEqual([]);
  });

  it('resolves conflicting edits deterministically and reports the loser', () => {
    const document = createTestDocument({ nodes: [createTestNode('node-1'), createTestNode('node-2')] });
    const node = document.pages[0].nodes[0];
    const operations = [
      operation(setNode(node, { ...node, content: { label: 'Zulu' } }, 'rename-z'), 'z', 4),
      operation(setNode(node, { ...node, content: { label: 'Alpha' } }, 'rename-a'), 'a', 4),
    ];
    const results = replayEveryOrder(document, operations);
    expect(results[0]).toEqual(results[1]);
    expect(results[0].document.pages[0].nodes[0].content.label).toBe('Alpha');
    expect(results[0].rejected.map((item) => item.operation.opId)).toEqual(['z:4']);
    expect(results[0].rejected[0].reason).toBe('precondition-failed');
  });

  it('deduplicates retransmission and rejects cross-document operations', () => {
    const document = createTestDocument({ nodes: [createTestNode('node-1'), createTestNode('node-2')] });
    const node = document.pages[0].nodes[0];
    const edit = operation(setNode(node, { ...node, content: { label: 'Once' } }, 'rename'), 'a', 1);
    const wrongDocument = { ...edit, opId: 'wrong', documentId: 'other-document' };
    const result = replayCanonicalOperationLog(document, [wrongDocument, edit, edit]);
    expect(result.document.pages[0].nodes[0].content.label).toBe('Once');
    expect(result.appliedOperationIds).toEqual(['a:1']);
    expect(result.rejected.map((item) => item.reason).sort()).toEqual(['duplicate', 'wrong-document']);
  });
});
