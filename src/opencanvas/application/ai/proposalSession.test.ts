import { describe, expect, it } from 'vitest';
import { findAgentAction } from '../../../agent/actions';
import { resolveAgentActionCommand } from '../../../agent/runAction';
import { applyDocumentCommand } from '../../domain/commands/execute';
import type { BatchDocumentCommand, DocumentCommand } from '../../domain/commands/types';
import type { SceneDocumentV1 } from '../../domain/document/types';
import { createTestConnector, createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import {
  applyCommand, createProposal, decideChange, StaleProposalError, summarizeChanges,
} from './proposalSession';

const PAGE = { kind: 'page', pageId: 'page-1', objectIds: [] } as const;

function fixture(): SceneDocumentV1 {
  return createTestDocument({
    nodes: [createTestNode('a'), createTestNode('b', { content: { label: '' } })],
    connectors: [createTestConnector('ab', 'a', 'b')],
  });
}

function agent(name: string, input: unknown, document: SceneDocumentV1): DocumentCommand {
  const { command } = resolveAgentActionCommand(findAgentAction(name)!, input, document, 'page-1');
  if (!command) throw new Error(`${name} produced no command`);
  return command;
}

function threeChanges(document: SceneDocumentV1) {
  return [
    { id: 'c1', explanation: 'Add a step.', command: agent('add_node', { id: 'c', label: 'C', x: 200, y: 0 }, document) },
    { id: 'c2', explanation: 'Name it.', command: agent('set_label', { id: 'b', label: 'B' }, document) },
    { id: 'c3', explanation: 'Line it up.', command: agent('move_node', { id: 'a', x: 0, y: 100 }, document) },
  ];
}

function build(document = fixture(), revision = 4) {
  return createProposal({ document, revision, source: 'local-agent', scope: { kind: 'selection', pageId: 'page-1', objectIds: ['a'] },
    intent: 'add-step-after-selection', changes: threeChanges(document) });
}

describe('proposal session', () => {
  it('rejects empty and duplicate change sets', () => {
    const document = fixture();
    expect(createProposal({ document, revision: 0, source: 's', scope: PAGE, intent: 'test', changes: [] }).error?.code)
      .toBe('INVALID_PROPOSAL');
    const [change] = threeChanges(document);
    expect(createProposal({ document, revision: 0, source: 's', scope: PAGE, intent: 'test', changes: [change, change] })
      .error?.code).toBe('INVALID_PROPOSAL');
  });

  it('accepts every change by default and previews their sequential application', () => {
    const document = fixture();
    const proposal = build(document);
    expect(proposal.baseRevision).toBe(4);
    expect(proposal.status).toBe('pending');
    expect(proposal.intent).toBe('add-step-after-selection');
    expect(proposal.scope.objectIds).toEqual(['a']);
    expect(proposal.error).toBeUndefined();
    expect(proposal.changes.map(({ status }) => status)).toEqual(['accepted', 'accepted', 'accepted']);
    let expected = document;
    for (const change of threeChanges(document)) expected = applyDocumentCommand(expected, change.command).document;
    expect(proposal.preview).toEqual(expected);
  });

  it('drops a rejected change from the preview and from the applied batch', () => {
    const document = fixture();
    const proposal = decideChange(build(document), 'c2', 'rejected', document);
    expect(proposal.preview.pages[0].nodes.find(({ id }) => id === 'b')?.content.label).toBe('');
    expect(proposal.preview.pages[0].nodes.map(({ id }) => id)).toEqual(['a', 'b', 'c']);
    const command = applyCommand(proposal, 4, document) as BatchDocumentCommand;
    expect(command.kind).toBe('batch');
    expect(command.commands.map(({ kind }) => kind)).toEqual(['insert-node', 'set-node']);
    expect(command.label).toBe('Apply agent proposal (2 changes)');
    expect(command.attribution).toEqual({ kind: 'agent', source: 'local-agent', proposalId: proposal.id });
    expect(applyDocumentCommand(document, command).inverse).toMatchObject({ attribution: command.attribution });
    const applied = applyDocumentCommand(document, command);
    expect(applied.document).toEqual(proposal.preview);
    expect(applyDocumentCommand(applied.document, applied.inverse).document).toEqual(document);
  });

  it('returns null when nothing is accepted', () => {
    const document = fixture();
    let proposal = build(document);
    for (const id of ['c1', 'c2', 'c3']) proposal = decideChange(proposal, id, 'rejected', document);
    expect(applyCommand(proposal, 4, document)).toBeNull();
  });

  it('refuses to apply at any revision other than the base', () => {
    const document = fixture();
    const proposal = build(document);
    expect(() => applyCommand(proposal, 5, document)).toThrow(StaleProposalError);
    try { applyCommand(proposal, 5, document); } catch (error) {
      expect((error as StaleProposalError).name).toBe('StaleProposalError');
      expect((error as StaleProposalError).baseRevision).toBe(4);
      expect((error as StaleProposalError).currentRevision).toBe(5);
    }
    expect(applyCommand(proposal, 4, document)).not.toBeNull();
  });

  it('flattens action batches so the applied command is one level deep', () => {
    const document = createTestDocument({ nodes: [createTestNode('a'), createTestNode('b'), createTestNode('z')] });
    const changes = [
      { id: 'k', explanation: 'Link.', command: agent('connect', { id: 'ab', source: 'a', target: 'b', sourceSide: 'bottom', targetSide: 'top' }, document) },
      { id: 'd', explanation: 'Drop.', command: agent('delete_node', { id: 'z' }, document) },
    ];
    const proposal = createProposal({ document, revision: 0, source: 's', scope: PAGE, intent: 'test', changes });
    expect(proposal.error).toBeUndefined();
    const command = applyCommand(proposal, 0, document) as BatchDocumentCommand;
    expect(command.commands.every(({ kind }) => kind !== 'batch')).toBe(true);
    const applied = applyDocumentCommand(document, command);
    expect(applied.document).toEqual(proposal.preview);
    expect(applyDocumentCommand(applied.document, applied.inverse).document).toEqual(document);
  });

  it('summarizes every action kind for the review list', () => {
    const document = fixture();
    const changes = [
      { id: '1', explanation: 'add', command: agent('add_node', { id: 'c', label: 'Étape ✓', x: 0, y: 0 }, document) },
      { id: '2', explanation: 'connect', command: agent('connect', { id: 'ac', source: 'a', target: 'b', sourceSide: 'bottom', targetSide: 'top' }, document) },
      { id: '3', explanation: 'label', command: agent('set_label', { id: 'b', label: 'B' }, document) },
      { id: '4', explanation: 'move', command: agent('move_node', { id: 'a', x: 9, y: 9 }, document) },
      { id: '5', explanation: 'delete', command: agent('delete_node', { id: 'b' }, document) },
    ];
    const page = { ...document.pages[0], nodes: document.pages[0].nodes.map((node) =>
      node.id === 'b' ? { ...node, content: { label: 'Bee' } } : node) };
    expect(summarizeChanges(changes, page)).toEqual([
      { id: '1', kind: 'addition', label: 'Étape ✓', reason: 'add' },
      { id: '2', kind: 'addition', label: 'a → Bee', reason: 'connect' },
      { id: '3', kind: 'modification', label: 'B', reason: 'label' },
      { id: '4', kind: 'modification', label: 'a', reason: 'move' },
      { id: '5', kind: 'removal', label: 'b', reason: 'delete' },
    ]);
  });
});
