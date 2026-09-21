import { describe, expect, it } from 'vitest';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { buildInsertIconCommand, buildSetIconCommand } from './iconCommands';

const s3 = { provider: 'aws', packId: 'aws-official-starter-v1', shapeId: 'storage-s3', label: 'S3' };

describe('icon commands', () => {
  it('changes icons on unlocked selected nodes only', () => {
    const page = createTestDocument({ nodes: [
      createTestNode('a'), createTestNode('b', { content: { sectionLocked: true } }), createTestNode('c'),
    ] }).pages[0];
    const command = buildSetIconCommand(page, ['a', 'b'], s3);
    expect(command?.kind).toBe('batch');
    expect(command && command.kind === 'batch' ? command.commands.map((c) => c.id) : []).toEqual(['icon:a']);
    expect(buildSetIconCommand(page, ['zzz'], s3)).toBeNull();
  });

  it('inserts an icon node at the point', () => {
    const page = createTestDocument().pages[0];
    const command = buildInsertIconCommand(page, { id: 'n', at: { x: 5, y: 6 }, icon: s3 });
    expect(command.node.transform.translation).toEqual({ x: 5, y: 6 });
    expect(command.node.content.label).toBe('S3');
  });
});
