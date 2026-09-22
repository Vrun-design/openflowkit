import { describe, expect, it } from 'vitest';
import { applyDocumentCommand } from './execute';
import { createEmptyV2Document } from '../../presentation/v2/v2Document';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { buildSetInkCommand } from './inkCommands';

const page = () => createTestDocument({
  nodes: [
    createTestNode('stroke', { kind: 'pen', content: { points: [{ x: 0, y: 0 }, { x: 10, y: 10 }] } }),
    createTestNode('shape', { kind: 'process' }),
  ],
}).pages[0];

describe('buildSetInkCommand', () => {
  it('writes colour and width on strokes only, as one batch', () => {
    const command = buildSetInkCommand(page(), ['stroke', 'shape'], {
      strokeColor: '#e95420', strokeWidth: 8,
    })!;
    expect(command.kind).toBe('batch');
    const applied = applyDocumentCommand(
      { ...createEmptyV2Document('doc-1'), pages: [page()] }, command
    );
    expect(applied.document.pages[0].nodes[0]!.content).toMatchObject({
      strokeColor: '#e95420', strokeWidth: 8,
    });
    expect(applied.document.pages[0].nodes[1]!.content.strokeColor).toBeUndefined();
  });

  it('is null when nothing selected can take ink', () => {
    expect(buildSetInkCommand(page(), ['shape'], { strokeWidth: 4 })).toBeNull();
    expect(buildSetInkCommand(page(), [], { strokeWidth: 4 })).toBeNull();
  });

  it('skips a locked stroke', () => {
    const source = page();
    const locked = {
      ...source,
      nodes: source.nodes.map((node) => node.id === 'stroke'
        ? { ...node, content: { ...node.content, sectionLocked: true } } : node),
    };
    expect(buildSetInkCommand(locked, ['stroke'], { strokeWidth: 4 })).toBeNull();
  });
});
