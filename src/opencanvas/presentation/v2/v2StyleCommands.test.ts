import { describe, expect, it } from 'vitest';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { applyDocumentCommand } from '../../domain/commands/execute';
import { buildV2StyleCommand } from './v2StyleCommands';
import { buildV2SvgExport } from './v2Export';

it('styles a selection atomically, preserves unrelated nodes, exports stroke and alpha', () => {
  const document = createTestDocument({ nodes: [createTestNode('a'), createTestNode('b')] });
  const page = document.pages[0];
  const patch = { fill: '#c9b8ed80', stroke: '#252724', strokeWidth: 3, strokeStyle: 'dashed' };
  const command = buildV2StyleCommand(page, ['a'], patch)!;
  const applied = applyDocumentCommand(document, command);
  expect(applied.document.pages[0].nodes[0].appearance).toMatchObject(patch);
  expect(applied.document.pages[0].nodes[1]).toEqual(page.nodes[1]);
  const svg = buildV2SvgExport(applied.document).svg;
  expect(svg).toContain('fill="#c9b8ed80"');
  expect(svg).toContain('stroke-width="3" stroke-dasharray="12 9"');
  expect(applyDocumentCommand(applied.document, applied.inverse).document).toEqual(document);
});

describe('style no-ops', () => {
  it('does not create redundant history or mutate locked shapes', () => {
    const page = createTestDocument({ nodes: [createTestNode('a', { appearance: { fill: '#abcdef' } })] }).pages[0];
    expect(buildV2StyleCommand(page, ['a'], { fill: '#abcdef' })).toBeNull();
    expect(buildV2StyleCommand({ ...page, layers: page.layers.map((layer) => ({ ...layer, locked: true })) }, ['a'], { fill: '#fedcba' })).toBeNull();
  });
});
