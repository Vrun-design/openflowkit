import { describe, expect, it } from 'vitest';
import { findAgentAction } from '../../../agent/actions';
import { resolveAgentActionCommand } from '../../../agent/runAction';
import type { DocumentCommand } from '../../domain/commands/types';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { commitSessionCommand, createDocumentSession } from './session';

function baseDocument() {
  return createTestDocument({ nodes: [createTestNode('node-1')] });
}

function manualRename(): DocumentCommand {
  const before = createTestNode('node-1');
  return {
    kind: 'set-node',
    id: 'rename-node:node-1',
    label: 'Rename node',
    pageId: 'page-1',
    before,
    after: { ...before, content: { label: 'Renamed' } },
  };
}

describe('single session commit path', () => {
  it('produces identical state for manual, mock-agent, and import commits', () => {
    const manual = manualRename();
    const agent = resolveAgentActionCommand(
      findAgentAction('set_label')!,
      { id: 'node-1', label: 'Renamed' },
      baseDocument(),
      'page-1'
    );
    expect(agent.command).toEqual(manual);

    const importBatch: DocumentCommand = {
      kind: 'batch',
      id: 'import:rename-node-1',
      label: 'Apply import',
      commands: [manual],
    };

    const viaManual = commitSessionCommand(createDocumentSession(baseDocument()), manual, 0);
    const viaAgent = commitSessionCommand(
      createDocumentSession(baseDocument()), agent.command!, 0
    );
    const viaImport = commitSessionCommand(
      createDocumentSession(baseDocument()), importBatch, 0
    );

    expect(viaAgent.document).toEqual(viaManual.document);
    expect(viaImport.document).toEqual(viaManual.document);
    expect(viaManual.document.pages[0].nodes[0].content.label).toBe('Renamed');
    for (const session of [viaManual, viaAgent, viaImport]) {
      expect(session.revision).toBe(1);
      expect(session.history.past).toHaveLength(1);
    }
  });

  it('commits nothing for read-only agent actions', () => {
    const read = resolveAgentActionCommand(
      findAgentAction('get_document')!,
      {},
      baseDocument(),
      'page-1'
    );
    expect(read.command).toBeNull();
  });
});
