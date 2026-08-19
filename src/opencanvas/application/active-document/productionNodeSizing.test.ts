import { describe, expect, it } from 'vitest';
import { applyDocumentCommand } from '../../domain/commands/execute';
import { DEFAULT_NODE_SIZING_POLICY } from '../../domain/node-sizing/model';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { buildProductionNodeSizingCommand } from './productionNodeSizing';

describe('production node sizing', () => {
  it('emits one exact reversible size and policy command', () => {
    const node = createTestNode('node', { content: { label: 'Long responsive content for wrapping' } });
    const document = createTestDocument({ nodes: [node] });
    const command = buildProductionNodeSizingCommand(document.pages[0], node.id, {
      ...DEFAULT_NODE_SIZING_POLICY, mode: 'responsive', overflow: 'wrap',
      minSize: { width: 80, height: 40 }, maxSize: { width: 140, height: 180 },
    })!;
    const applied = applyDocumentCommand(document, command);
    expect(applied.document.pages[0].nodes[0].size.width).toBeLessThanOrEqual(140);
    expect(applied.document.pages[0].nodes[0].content.sizingPolicy).toMatchObject({
      mode: 'responsive', overflow: 'wrap',
    });
    expect(applyDocumentCommand(applied.document, applied.inverse).document).toEqual(document);
  });
});
