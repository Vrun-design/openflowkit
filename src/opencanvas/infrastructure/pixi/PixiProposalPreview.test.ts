import { expect, it } from 'vitest';
import { createTestConnector, createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { PixiProposalPreview } from './PixiProposalPreview';

it('ghosts only added or changed objects and marks removals', () => {
  const a = createTestNode('a'); const b = createTestNode('b'); const gone = createTestNode('gone');
  const current = createTestDocument({ nodes: [a, b, gone], connectors: [createTestConnector('ab', 'a', 'b')] }).pages[0];
  const preview = { ...current,
    nodes: [a, { ...b, content: { label: 'Bee' } }, createTestNode('c')],
    connectors: [...current.connectors, createTestConnector('bc', 'b', 'c')] };
  const ghost = new PixiProposalPreview();
  expect(ghost.container.visible).toBe(false);
  ghost.draw(current, { page: preview, highlightIds: ['c'] }, 1);
  expect(ghost.container.visible).toBe(true);
  expect(ghost.getDebugSnapshot()).toEqual({ nodes: 2, connectors: 1, removals: 1, highlights: 1 });
  ghost.clear();
  expect(ghost.container.visible).toBe(false);
});
