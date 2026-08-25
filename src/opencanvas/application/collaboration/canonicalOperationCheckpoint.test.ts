import { describe, expect, it } from 'vitest';
import type { DocumentCommand } from '../../domain/commands/types';
import type { SceneNode } from '../../domain/document/types';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import type { CanonicalCollaborationOperation } from './canonicalOperationLog';
import { replayCanonicalOperationLog } from './canonicalOperationLog';
import {
  createCanonicalOperationCheckpoint,
  resumeCanonicalOperationCheckpoint,
} from './canonicalOperationCheckpoint';

function rename(before: SceneNode, label: string): DocumentCommand {
  return {
    kind: 'set-node',
    id: `rename-${label}`,
    label: `Rename to ${label}`,
    pageId: 'page-1',
    before,
    after: { ...before, content: { label } },
  };
}

function operation(
  command: DocumentCommand,
  lamport: number,
  clientId = 'peer-a'
): CanonicalCollaborationOperation {
  return {
    opId: `${clientId}:${lamport}`,
    documentId: 'document-1',
    clientId,
    lamport,
    command,
  };
}

function renameChain(node: SceneNode, count: number): CanonicalCollaborationOperation[] {
  const operations: CanonicalCollaborationOperation[] = [];
  let before = node;
  for (let index = 1; index <= count; index += 1) {
    const command = rename(before, `Version ${index}`);
    operations.push(operation(command, index));
    before = command.kind === 'set-node' ? command.after : before;
  }
  return operations;
}

describe('canonical operation checkpoint', () => {
  it('resumes to the same document as an uncompacted log', () => {
    const document = createTestDocument({ nodes: [createTestNode('node-1')] });
    const operations = renameChain(document.pages[0].nodes[0], 140);
    const checkpoint = createCanonicalOperationCheckpoint(document, operations.slice(0, 120));
    const resumed = resumeCanonicalOperationCheckpoint(checkpoint, operations.slice(120));
    const complete = replayCanonicalOperationLog(document, operations);

    expect(checkpoint.compactedOperationIds).toHaveLength(120);
    expect(resumed.document).toEqual(complete.document);
    expect(resumed.appliedOperationIds).toHaveLength(20);
    expect(resumed.rejected).toEqual([]);
  });

  it('is deterministic regardless of arrival order', () => {
    const document = createTestDocument({ nodes: [createTestNode('node-1')] });
    const operations = renameChain(document.pages[0].nodes[0], 12);
    expect(createCanonicalOperationCheckpoint(document, operations))
      .toEqual(createCanonicalOperationCheckpoint(document, [...operations].reverse()));
  });

  it('rejects compacted duplicates and late operations before the frontier', () => {
    const document = createTestDocument({ nodes: [createTestNode('node-1')] });
    const operations = renameChain(document.pages[0].nodes[0], 3);
    const checkpoint = createCanonicalOperationCheckpoint(document, operations);
    const late = operation(rename(document.pages[0].nodes[0], 'Late'), 2, 'peer-z');
    const result = resumeCanonicalOperationCheckpoint(checkpoint, [operations[0], late]);

    expect(result.document).toEqual(checkpoint.document);
    expect(result.rejected.map(({ reason }) => reason)).toEqual(['duplicate', 'before-checkpoint']);
  });

  it('refuses invalid checkpoint snapshots', () => {
    const document = createTestDocument();
    const checkpoint = createCanonicalOperationCheckpoint(document, []);
    expect(() => resumeCanonicalOperationCheckpoint({
      ...checkpoint,
      document: { ...checkpoint.document, pages: [] },
    }, [])).toThrow(/invalid document/);
  });
});
