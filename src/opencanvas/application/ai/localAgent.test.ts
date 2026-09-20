import { describe, expect, it } from 'vitest';
import type { DocumentCommand } from '../../domain/commands/types';
import type { SceneDocumentV1 } from '../../domain/document/types';
import { commitSessionCommand, createDocumentSession } from '../session/session';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { LOCAL_AGENT_SOURCE, proposeFromIntent } from './localAgent';
import { applyCommand, createProposal } from './proposalSession';

function fixture(): SceneDocumentV1 {
  return createTestDocument({ nodes: [
    createTestNode('a', { transform: { translation: { x: 0, y: 0 }, rotationRadians: 0, scale: { x: 1, y: 1 } } }),
    createTestNode('b', { content: { label: '' }, transform: { translation: { x: 300, y: 80 }, rotationRadians: 0, scale: { x: 1, y: 1 } } }),
    createTestNode('c', { content: {}, transform: { translation: { x: 150, y: -40 }, rotationRadians: 0, scale: { x: 1, y: 1 } } }),
  ] });
}

let counter = 0;
const mintId = (prefix: string) => `${prefix}-${++counter}`;

function commitViaAgent(document: SceneDocumentV1, changes: ReturnType<typeof proposeFromIntent>) {
  const proposal = createProposal({ document, revision: 0, source: LOCAL_AGENT_SOURCE, intent: 'test',
    scope: { kind: 'page', pageId: 'page-1', objectIds: [] }, changes });
  expect(proposal.error).toBeUndefined();
  return commitSessionCommand(createDocumentSession(document), applyCommand(proposal, 0, document)!, 0);
}

describe('local agent', () => {
  it('adds a connected step to the right of the primary selection', () => {
    const document = fixture();
    const changes = proposeFromIntent(document, 'page-1', 'add-step-after-selection',
      { selection: { primaryNodeId: 'a', nodeIds: ['a'] }, mintId });
    expect(changes).toHaveLength(2);
    expect(changes.every(({ explanation }) => explanation.length > 0)).toBe(true);
    const session = commitViaAgent(document, changes);
    const page = session.document.pages[0];
    const added = page.nodes[3];
    expect(added.transform.translation).toEqual({ x: 100 + 48, y: 0 });
    expect(added.content.label).toBe('Step 4');
    expect(page.connectors.at(-1)).toMatchObject({ source: { nodeId: 'a' }, target: { nodeId: added.id } });
    expect(session.revision).toBe(1);
    expect(session.history.past).toHaveLength(1);
  });

  it('refuses add-step without a primary node', () => {
    expect(() => proposeFromIntent(fixture(), 'page-1', 'add-step-after-selection',
      { selection: { primaryNodeId: null, nodeIds: [] }, mintId })).toThrow(/select/i);
  });

  it('labels every unlabeled node identically to manual renames', () => {
    const document = fixture();
    const changes = proposeFromIntent(document, 'page-1', 'label-unlabeled',
      { selection: { primaryNodeId: null, nodeIds: [] }, mintId });
    expect(changes.map(({ command }) => command.kind)).toEqual(['set-node', 'set-node']);
    const page = document.pages[0];
    const manual: DocumentCommand = { kind: 'batch', id: 'manual', label: 'manual', commands: [
      { kind: 'set-node', id: 'm1', label: 'Rename node', pageId: 'page-1', before: page.nodes[1],
        after: { ...page.nodes[1], content: { ...page.nodes[1].content, label: 'Step 2' } } },
      { kind: 'set-node', id: 'm2', label: 'Rename node', pageId: 'page-1', before: page.nodes[2],
        after: { ...page.nodes[2], content: { ...page.nodes[2].content, label: 'Step 3' } } },
    ] };
    const viaManual = commitSessionCommand(createDocumentSession(document), manual, 0);
    const viaAgent = commitViaAgent(document, changes);
    expect(viaAgent.document).toEqual(viaManual.document);
    expect(viaAgent.revision).toBe(viaManual.revision);
    expect(viaAgent.history.past).toHaveLength(1);
    expect(() => proposeFromIntent(viaAgent.document, 'page-1', 'label-unlabeled',
      { selection: { primaryNodeId: null, nodeIds: [] }, mintId })).toThrow(/already/i);
  });

  it('tidies selected nodes into one row at the primary y with 48px gaps', () => {
    const document = fixture();
    const changes = proposeFromIntent(document, 'page-1', 'tidy-row',
      { selection: { primaryNodeId: 'b', nodeIds: ['a', 'b', 'c'] }, mintId });
    const positions = commitViaAgent(document, changes).document.pages[0].nodes
      .map((node) => [node.id, node.transform.translation.x, node.transform.translation.y]);
    // Sorted by x: a(0) c(150) b(300); each 100 wide; y snaps to b's 80.
    expect(positions).toEqual([['a', 0, 80], ['b', 296, 80], ['c', 148, 80]]);
    expect(() => proposeFromIntent(document, 'page-1', 'tidy-row',
      { selection: { primaryNodeId: 'a', nodeIds: ['a'] }, mintId })).toThrow(/two/i);
  });
});
