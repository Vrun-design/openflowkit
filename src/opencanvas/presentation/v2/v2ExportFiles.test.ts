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

describe('v2 export', () => {
  it('exports the active page as SVG at the requested scale', async () => {
    const document = await buildCanonicalFixtureDocument();
    const [file] = await buildV2Export({ document, format: 'svg', scope: 'page', pageId: document.pages[0]!.id, scale: 2 });
    expect(file?.filename).toMatch(/\.svg$/);
    expect(file?.mime).toBe('image/svg+xml');
    expect(file?.text).toContain('data-pixel-ratio="2"');
    expect(file?.text).toContain('data-page="page-1"');
  });

  it('narrows to the selection when asked and refuses an empty one', async () => {
    const document = await buildCanonicalFixtureDocument();
    const pageId = document.pages[0]!.id;
    const first = document.pages[0]!.nodes[0]!;
    const [selected] = await buildV2Export({ document, format: 'svg', scope: 'selection', pageId, selectedNodeIds: [first.id] });
    expect(selected?.filename).toContain('-selection');
    expect(selected?.text).toContain(`data-node-id="${first.id}"`);
    await expect(buildV2Export({ document, format: 'svg', scope: 'selection', pageId, selectedNodeIds: ['missing'] }))
      .rejects.toThrow(/visible node/);
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
