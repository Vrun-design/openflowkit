import { describe, expect, it } from 'vitest';
import { nodePaletteName } from '../opencanvas/domain/nodes/nodePalette';
import { createAgentDocument } from './index';
import { createFileCapabilities, grammarSection } from './host';
import { findAgentOp } from './ops';

const GRAMMAR = `# OpenFlow DSL

## 4. Core statements

flowchart

## 8. Families

### 8.2 Sequence
`;

const document = () => createAgentDocument('Host fixture', 'doc-host');

describe('file host', () => {
  it('narrows the grammar to the requested family and returns it whole otherwise', () => {
    expect(grammarSection(GRAMMAR)).toBe(GRAMMAR);
    const sequence = grammarSection(GRAMMAR, 'sequence');
    expect(sequence).toContain('### 8.2 Sequence');
    expect(sequence).not.toContain('## 4. Core statements');
    expect(sequence).not.toContain('## 8. Families');
    // A `##` heading that names the family wins over its `###` subsections.
    expect(grammarSection(GRAMMAR, 'families')).toContain('## 8. Families');
    // An unknown family degrades to the full reference rather than nothing.
    expect(grammarSection(GRAMMAR, 'bpmn')).toBe(GRAMMAR);
  });

  it('honours a palette override and records it on the frame', async () => {
    const host = createFileCapabilities({ grammar: GRAMMAR });
    const pageWith = async (input: Record<string, unknown>) => {
      const outcome = await findAgentOp('create_diagram')!.run(input, {
        document: document(), pageId: 'doc-host:page-1', capabilities: host,
      });
      if (!outcome.command || outcome.command.kind !== 'set-page') throw new Error('expected a page command');
      return outcome.command.after;
    };
    const plain = await pageWith({ dsl: 'flowchart\n  A [blue] -> B' });
    expect(nodePaletteName(plain.nodes.find((node) => node.kind === 'frame')!)).toBe('pastel');

    const themed = await pageWith({ dsl: 'flowchart\n  A [blue] -> B', palette: 'mono' });
    expect(nodePaletteName(themed.nodes.find((node) => node.kind === 'frame')!)).toBe('mono');
    expect(nodePaletteName(themed.nodes.find((node) => node.id === 'a')!)).toBe('mono');
  });

  it('searches icons by provider, slug, label and token overlap', async () => {
    const host = createFileCapabilities({
      grammar: GRAMMAR,
      icons: [
        { provider: 'aws', slug: 'lambda', label: 'Lambda', category: 'Compute' },
        { provider: 'aws', slug: 'rds', label: 'RDS', category: 'Database' },
        { provider: 'azure', slug: 'functions', label: 'Functions', category: 'Compute' },
      ],
    });
    expect((await host.searchIcons('lambda', 5)).map(({ slug }) => slug)).toEqual(['lambda']);
    // Category matches tie, so the order is the documented slug tiebreak.
    expect((await host.searchIcons('compute', 5)).map(({ slug }) => slug).sort()).toEqual(['functions', 'lambda']);
    expect((await host.searchIcons('rds', 5)).map(({ provider }) => provider)).toEqual(['aws']);
    expect(await host.searchIcons('kubernetes', 5)).toEqual([]);
    expect((await host.searchIcons('aws lambda', 1)).length).toBe(1);
  });

  it('exports svg, json and print html from the same source, and refuses png', async () => {
    const host = createFileCapabilities({ grammar: GRAMMAR });
    const created = await findAgentOp('create_diagram')!.run(
      { dsl: 'flowchart\n  A [blue] -> B' },
      { document: document(), pageId: 'doc-host:page-1', capabilities: host });
    if (!created.command || created.command.kind !== 'set-page') throw new Error('expected a page command');
    const documentWithFrame = { ...document(), pages: [created.command.after] };

    const svg = await host.exportFiles!({ document: documentWithFrame, format: 'svg', scope: 'page', pageId: 'doc-host:page-1', scale: 2 });
    expect(svg[0]?.text).toContain('<svg');
    expect(svg[0]?.text).toContain('data-pixel-ratio="2"');

    const json = await host.exportFiles!({ document: documentWithFrame, format: 'json', scope: 'document', pageId: 'doc-host:page-1' });
    expect(JSON.parse(json[0]!.text!)).toMatchObject({ id: 'doc-host' });

    const pdf = await host.exportFiles!({ document: documentWithFrame, format: 'pdf', scope: 'page', pageId: 'doc-host:page-1' });
    expect(pdf[0]?.mime).toBe('text/html');
    expect(pdf[0]?.text).toContain('@page');

    await expect(host.exportFiles!({ document: documentWithFrame, format: 'png', scope: 'page', pageId: 'doc-host:page-1' }))
      .rejects.toThrow(/live editor/);
  });

  it('has no viewport to fit', () => {
    expect(createFileCapabilities({ grammar: GRAMMAR }).fitView).toBeUndefined();
  });
});
