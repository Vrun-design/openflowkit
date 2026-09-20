import { describe, expect, it } from 'vitest';
import { buildInsertShapeCommand } from '@/opencanvas/domain/commands/sceneEdits';
import { createTestDocument, createTestNode } from '@/opencanvas/testing/builders/documentBuilder';
import { resolveAgentActionCommand } from '../runAction';
import { addNode } from './addNode';

describe('add_node', () => {
  it('creates the same rectangle, ellipse and text nodes the v2 toolbar creates', () => {
    const document = createTestDocument({ nodes: [createTestNode('a', { zIndex: 4 })] });
    const page = document.pages[0];
    for (const kind of ['rectangle', 'ellipse', 'text'] as const) {
      const manual = buildInsertShapeCommand(page, { kind, id: `n-${kind}`, at: { x: 10, y: 20 } });
      const agent = resolveAgentActionCommand(addNode, { kind, id: `n-${kind}`, x: 10, y: 20 }, document, 'page-1');
      expect(agent.command).toEqual(manual);
      expect(manual.node.zIndex).toBe(5);
    }
  });

  it('keeps catalog kinds and labels for existing callers', () => {
    const document = createTestDocument();
    const { command, output } = resolveAgentActionCommand(addNode, { kind: 'decision', label: 'Ok?', id: 'd' }, document, 'page-1');
    expect(output).toEqual({ id: 'd' });
    expect(command).toMatchObject({ kind: 'insert-node', node: { id: 'd', kind: 'decision', content: { label: 'Ok?' } } });
    const rect = resolveAgentActionCommand(addNode, { kind: 'rectangle', label: 'Named', id: 'r' }, document, 'page-1');
    expect(rect.command).toMatchObject({ node: { content: { shape: 'rectangle', label: 'Named' } } });
  });
});
