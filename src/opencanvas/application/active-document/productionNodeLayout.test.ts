import { describe, expect, it } from 'vitest';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { DEFAULT_NODE_CONTENT_LAYOUT } from '../../domain/node-layout/model';
import { applyDocumentCommand } from '../../domain/commands/execute';
import { setNodeContentLayout } from '../../domain/node-layout/editing';
import { buildProductionNodeLayoutCommand } from './productionNodeLayout';

describe('production node content layout', () => {
  it('builds one reversible validated command', () => {
    const node = createTestNode('node', { content: { label: 'Node', opaque: 'keep' } });
    const document = createTestDocument({ nodes: [node] });
    const layout = { ...DEFAULT_NODE_CONTENT_LAYOUT, iconPlacement: 'right' as const, gap: 12 };
    const command = buildProductionNodeLayoutCommand(document.pages[0], node.id, layout, 'Layout')!;
    const applied = applyDocumentCommand(document, command);
    expect(applied.document.pages[0].nodes[0].content).toMatchObject({
      opaque: 'keep', contentLayout: { iconPlacement: 'right', gap: 12 },
    });
    expect(applyDocumentCommand(applied.document, applied.inverse).document).toEqual(document);
  });

  it('rejects invalid layout and skips exact no-ops', () => {
    const node = createTestNode('node');
    const page = createTestDocument({ nodes: [node] }).pages[0];
    expect(() => buildProductionNodeLayoutCommand(page, node.id, {
      ...DEFAULT_NODE_CONTENT_LAYOUT, iconScale: 10,
    }, 'Bad')).toThrow(/Invalid node content layout/);
    const authored = setNodeContentLayout(node, DEFAULT_NODE_CONTENT_LAYOUT);
    const authoredPage = createTestDocument({ nodes: [authored] }).pages[0];
    expect(buildProductionNodeLayoutCommand(
      authoredPage, authored.id, DEFAULT_NODE_CONTENT_LAYOUT, 'Same'
    )).toBeNull();
  });
});
