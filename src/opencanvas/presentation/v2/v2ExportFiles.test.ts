import { describe, expect, it, vi } from 'vitest';
import { createEmptyV2Document } from './v2Document';
import { buildCanonicalFixtureDocument } from './v2Export.testFixtures';
import { buildV2Export, printV2Export } from './v2Export';

vi.mock('../../infrastructure/export/raster', () => ({
  rasterizeSvgToPng: vi.fn(async () => new Uint8Array([137, 80, 78, 71])),
}));
vi.mock('../../infrastructure/export/print', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../infrastructure/export/print')>();
  return { ...actual, printSvgDocument: vi.fn() };
});

/** Ids can contain characters the serializer escapes inside attributes. */
const attr = (id: string): string =>
  id.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

describe('v2 export', () => {
  it('exports the active page as SVG at the requested scale', async () => {
    const document = await buildCanonicalFixtureDocument();
    const [file] = await buildV2Export({ document, format: 'svg', scope: 'page', pageId: document.pages[0]!.id, scale: 2 });
    expect(file?.filename).toMatch(/\.svg$/);
    expect(file?.mime).toBe('image/svg+xml');
    expect(file?.text).toContain('data-pixel-ratio="2"');
    expect(file?.text).toContain('data-page="page-1"');
  });

  it('exports a selected frame with everything inside it, and refuses an empty selection', async () => {
    const document = await buildCanonicalFixtureDocument();
    const page = document.pages[0]!;
    const frame = page.nodes.find(({ kind }) => kind === 'frame')!;
    const [selected] = await buildV2Export({ document, format: 'svg', scope: 'selection', pageId: page.id, selectedNodeIds: [frame.id] });
    expect(selected?.filename).toBe('diagram-frame.svg');
    for (const node of page.nodes.filter(({ id }) => id !== frame.id)) {
      expect(selected?.text).toContain(`data-node-id="${attr(node.id)}"`);
    }
    for (const connector of page.connectors) {
      expect(selected?.text).toContain(`data-connector-id="${attr(connector.id)}"`);
    }
    await expect(buildV2Export({ document, format: 'svg', scope: 'selection', pageId: page.id, selectedNodeIds: ['missing'] }))
      .rejects.toThrow(/visible node/);
  });

  it('exports a lone connection without its endpoints', async () => {
    const document = await buildCanonicalFixtureDocument();
    const page = document.pages[0]!;
    const edge = page.connectors[0]!;
    const [file] = await buildV2Export({ document, format: 'svg', scope: 'selection', pageId: page.id, selectedNodeIds: [], selectedConnectorIds: [edge.id] });
    expect(file?.text).toContain(`data-connector-id="${attr(edge.id)}"`);
    for (const node of page.nodes) expect(file?.text).not.toContain(`data-node-id="${attr(node.id)}"`);
  });

  it('emits one file per page for document scope', async () => {
    const document = await buildCanonicalFixtureDocument();
    const second = { ...document.pages[0]!, id: 'page-2', name: 'Second Page' };
    const twoPage = { ...document, pages: [...document.pages, second] };
    const files = await buildV2Export({ document: twoPage, format: 'png', scope: 'document', pageId: 'page-1', scale: 2 });
    expect(files.map(({ filename }) => filename)).toEqual(['diagram-document-1-page-1.png', 'diagram-document-2-second-page.png']);
    expect(files.every(({ mime }) => mime === 'image/png')).toBe(true);
  });

  it('always exports JSON as the whole document', async () => {
    const document = createEmptyV2Document('doc-1', 'My Doc');
    const [file] = await buildV2Export({ document, format: 'json', scope: 'document', pageId: document.pages[0]!.id });
    expect(file?.filename).toBe('my-doc-document.json');
    expect(JSON.parse(file?.text ?? '{}')).toMatchObject({ id: 'doc-1', name: 'My Doc' });
  });

  it('prints the page instead of downloading for PDF', async () => {
    const document = await buildCanonicalFixtureDocument();
    expect(() => printV2Export({ document, format: 'pdf', scope: 'page', pageId: document.pages[0]!.id })).not.toThrow();
    expect(buildV2Export({ document, format: 'pdf', scope: 'page', pageId: document.pages[0]!.id })).resolves.toEqual([]);
  });
});
