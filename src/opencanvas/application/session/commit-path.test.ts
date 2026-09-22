import { describe, expect, it } from 'vitest';
import { findAgentOp } from '../../../agent/ops';
import { createTestCapabilities } from '../../../agent/ops/testHost';
import { resolveAgentOpCommand } from '../../../agent/runAction';
import type { DocumentCommand } from '../../domain/commands/types';
import { buildMoveNodesCommand } from '../../domain/commands/sceneEdits';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { commitSessionCommand, createDocumentSession } from './session';

function baseDocument() {
  return createTestDocument({ nodes: [createTestNode('node-1')] });
}

/** The command the canvas commits when the user drags node-1 by 40px. */
function manualMove(): DocumentCommand {
  return buildMoveNodesCommand(baseDocument().pages[0]!, ['node-1'], { x: 40, y: 0 });
}

describe('single session commit path', () => {
  it('produces identical state for manual, agent-op, and import commits', async () => {
    const manual = manualMove();
    const agent = await resolveAgentOpCommand(
      findAgentOp('move')!,
      { ids: ['node-1'], delta: { x: 40, y: 0 } },
      { document: baseDocument(), pageId: 'page-1', capabilities: createTestCapabilities() },
    );
    expect(agent.command).toEqual(manual);

    const importBatch: DocumentCommand = {
      kind: 'batch',
      id: 'import:move-node-1',
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
    expect(viaManual.document.pages[0].nodes[0].transform.translation.x).toBe(createTestNode('node-1').transform.translation.x + 40);
    for (const session of [viaManual, viaAgent, viaImport]) {
      expect(session.revision).toBe(1);
      expect(session.history.past).toHaveLength(1);
    }
  });

  it('commits nothing for read-only agent ops', async () => {
    const read = await resolveAgentOpCommand(
      findAgentOp('get_document')!,
      {},
      { document: baseDocument(), pageId: 'page-1', capabilities: createTestCapabilities() },
    );
    expect(read.command).toBeNull();
  });
});
