import { describe, expect, it } from 'vitest';
import { createTestConnector, createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { buildPasteStyleCommand, copyConnectorStyle, copyNodeStyle } from './styleClipboard';

describe('style clipboard', () => {
  it('copies the resolved node style and pastes it as flat keys', () => {
    const page = createTestDocument({ nodes: [
      createTestNode('src', { content: { label: 'S', color: 'red', shape: 'diamond' }, appearance: { fontSize: 20 } }),
      createTestNode('dst', { content: { label: 'D', shape: 'rounded' } }),
    ] }).pages[0];
    const clip = copyNodeStyle(page.nodes[0]);
    expect(clip).toMatchObject({ fontSize: 20, fill: '#fef2f2' });
    expect(clip).not.toHaveProperty('dash');
    const command = buildPasteStyleCommand(page, ['dst'], null, { node: clip });
    expect(command?.kind).toBe('batch');
    const after = command?.kind === 'batch' && command.commands[0].kind === 'set-node' ? command.commands[0].after : null;
    expect(after?.appearance).toMatchObject({ fontSize: 20, fill: '#fef2f2' });
    expect(after?.content.shape).toBe('rounded');
  });

  it('copies connector presentation as a patch', () => {
    const page = createTestDocument({
      nodes: [createTestNode('a'), createTestNode('b')],
      connectors: [createTestConnector('e', 'a', 'b', { appearance: { stroke: '#ff0000', dashPattern: 'dotted', markerEnd: 'cross' } })],
    }).pages[0];
    expect(copyConnectorStyle(page.connectors[0])).toMatchObject({ color: '#ff0000', dash: 'dotted', markerEnd: 'cross', markerStart: 'none' });
    expect(buildPasteStyleCommand(page, [], 'e', { node: {} })).toBeNull();
  });
});
