// Gate 2 in miniature: each editor operation and its agent action build the
// same record, so history, undo and persistence cannot tell them apart.
import { describe, expect, it, vi } from 'vitest';
import {
  buildDeleteSelectionCommand, buildDuplicateSelectionCommand, buildInsertConnectorCommand,
  buildMoveNodesCommand,
} from '@/opencanvas/domain/commands/sceneEdits';
import { createTestConnector, createTestDocument, createTestNode } from '@/opencanvas/testing/builders/documentBuilder';
import { findAgentAction } from './index';
import { resolveAgentActionCommand } from '../runAction';

function fixture() {
  return createTestDocument({
    nodes: [createTestNode('a'), createTestNode('b'), createTestNode('child', { parentId: 'b' })],
    connectors: [createTestConnector('ab', 'a', 'b')],
  });
}
const run = (name: string, input: unknown, document = fixture()) =>
  resolveAgentActionCommand(findAgentAction(name)!, input, document, 'page-1');

describe('agent/manual record parity', () => {
  it('connect without sides is the toolbar arrow; a free point end is allowed', () => {
    const document = fixture();
    const page = document.pages[0];
    expect(run('connect', { id: 'k', source: 'a', target: 'b' }, document).command)
      .toEqual(buildInsertConnectorCommand(page, { id: 'k', source: { nodeId: 'a' }, target: { nodeId: 'b' } }));
    expect(run('connect', { id: 'f', source: 'a', target: { x: 300, y: 40 } }, document).command)
      .toEqual(buildInsertConnectorCommand(page, { id: 'f', source: { nodeId: 'a' }, target: { point: { x: 300, y: 40 } } }));
    // Sides still bind ports (legacy MCP clients).
    expect(run('connect', { id: 'p', source: 'a', target: 'b', sourceSide: 'right', targetSide: 'left' }, document).command)
      .toMatchObject({ kind: 'batch', id: 'connect-ports:p' });
  });

  it('move_node is a keyboard nudge to the absolute position', () => {
    const document = fixture();
    expect(run('move_node', { id: 'a', x: 30, y: -10 }, document).command)
      .toEqual(buildMoveNodesCommand(document.pages[0], ['a'], { x: 30, y: -10 }));
  });

  it('delete_node removes the node, its descendants and attached connectors like Backspace', () => {
    const document = fixture();
    expect(run('delete_node', { id: 'b' }, document).command)
      .toEqual(buildDeleteSelectionCommand(document.pages[0], ['b', 'child'], []));
  });

  it('delete_connector matches the context-bar delete', () => {
    const document = fixture();
    expect(run('delete_connector', { id: 'ab' }, document).command)
      .toEqual(buildDeleteSelectionCommand(document.pages[0], [], ['ab']));
    expect(() => run('delete_connector', { id: 'nope' }, document)).toThrow(/not found/);
  });

  it('duplicate_nodes matches ⌘D with the same minted ids', () => {
    const document = fixture();
    let n = 0;
    const mint = (prefix: string) => `${prefix}-copy-${++n}`;
    const manual = buildDuplicateSelectionCommand(document.pages[0], ['a', 'b'], ['ab'], mint);
    n = 0;
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => `copy-${++n}` as `${string}-${string}-${string}-${string}-${string}`);
    const agent = run('duplicate_nodes', { ids: ['a', 'b'], connectorIds: ['ab'] }, document);
    vi.restoreAllMocks();
    expect(agent.command).toEqual(manual);
    expect(agent.output).toEqual({ ids: ['node-copy-1', 'node-copy-2'], connectorIds: ['connector-copy-3'] });
  });

  it('rename_document matches the inline title edit', () => {
    const document = fixture();
    expect(run('rename_document', { name: 'Checkout flow' }, document).command).toEqual({
      kind: 'set-document-name', id: 'rename-document:document-1', label: 'Rename document',
      before: 'Test document', after: 'Checkout flow',
    });
    expect(run('rename_document', { name: 'Test document' }, document).command).toBeNull();
    expect(() => run('rename_document', { name: '   ' }, document)).toThrow();
  });
});
