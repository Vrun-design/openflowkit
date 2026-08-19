import { describe, expect, it } from 'vitest';
import { applyDocumentCommand } from '../../domain/commands/execute';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { classifyAiError, redactAiText } from './safeErrors';
import { acceptedAiProposalCommand, buildAiSceneProposal, decideAiProposalChange } from './sceneProposal';

describe('AI scene proposals', () => {
  it('previews validated canonical changes and applies only individually accepted edits', () => {
    const a = createTestNode('a'); const b = createTestNode('b');
    const document = createTestDocument({ nodes: [a, b] });
    const changes = [a, b].map((node) => ({ id: `rename-${node.id}`, explanation: `Rename ${node.id}`,
      command: { kind: 'set-node' as const, id: `set-${node.id}`, label: 'Rename', pageId: 'page-1',
        before: node, after: { ...node, content: { ...node.content, label: node.id.toUpperCase() } } } }));
    let proposal = buildAiSceneProposal(document, 'proposal', changes);
    expect(proposal.preview.pages[0].nodes.map(({ content }) => content.label)).toEqual(['A', 'B']);
    proposal = decideAiProposalChange(proposal, 'rename-a', 'accepted', document);
    proposal = decideAiProposalChange(proposal, 'rename-b', 'rejected', document);
    const command = acceptedAiProposalCommand(proposal, document)!;
    const applied = applyDocumentCommand(document, command);
    expect(applied.document.pages[0].nodes.map(({ content }) => content.label)).toEqual(['A', 'b']);
    expect(applyDocumentCommand(applied.document, applied.inverse).document).toEqual(document);
  });

  it('rejects stale or invalid proposals without exposing secrets', () => {
    const document = createTestDocument();
    expect(buildAiSceneProposal(document, '', []).error?.code).toBe('INVALID_PROPOSAL');
    const proposal = buildAiSceneProposal(document, 'p', [{ id: 'bad', explanation: 'bad', command: {
      kind: 'remove-node', id: 'remove', label: 'Remove', pageId: 'page-1', index: 0,
      node: createTestNode('missing'),
    } }]);
    expect(proposal.error?.code).toBe('PRECONDITION_FAILED');
    expect(() => acceptedAiProposalCommand({ ...proposal, error: undefined },
      { ...document, updatedAt: 'later' })).toThrow(/document changed/);
    expect(redactAiText('token sk-test_ABCDEFGHIJKLMNOPQRSTUVWXYZ')).not.toContain('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    expect(classifyAiError(new Error('429 sk-test_ABCDEFGHIJKLMNOPQRSTUVWXYZ')).message).not.toContain('sk-test');
  });
});
