import { describe, expect, it } from 'vitest';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { applyDocumentCommand } from './execute';
import { buildStyleNodesCommand } from './styleNodes';
import { buildV2SvgExport } from '../../presentation/v2/v2Export';

it('styles a selection atomically, preserves unrelated nodes, exports stroke and alpha', () => {
  const document = createTestDocument({ nodes: [createTestNode('a'), createTestNode('b')] });
  const page = document.pages[0];
  const patch = { fill: '#c9b8ed80', stroke: '#252724', strokeWidth: 3, strokeStyle: 'dashed' };
  const command = buildStyleNodesCommand(page, ['a'], patch)!;
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
    expect(buildStyleNodesCommand(page, ['a'], { fill: '#abcdef' })).toBeNull();
    expect(buildStyleNodesCommand({ ...page, layers: page.layers.map((layer) => ({ ...layer, locked: true })) }, ['a'], { fill: '#fedcba' })).toBeNull();
  });
});
