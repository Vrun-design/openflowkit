import { describe, expect, it, vi } from 'vitest';
import { createEmptyV2Document } from './v2Document';
import { buildCanonicalFixtureDocument } from './v2Export.testFixtures';
import { buildV2Export, printV2Export } from './v2Export';
import { printSvgDocument } from '../../infrastructure/export/print';

vi.mock('../../infrastructure/export/raster', () => ({
  rasterizeSvgToPng: vi.fn(async () => new Uint8Array([137, 80, 78, 71])),
  withEmbeddedInter: vi.fn(async (svg: string) => svg.replace(/<svg\b[^>]*>/, (open) => `${open}<style>@font-face{}</style>`)),
}));
vi.mock('../../infrastructure/export/print', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../infrastructure/export/print')>();
  return { ...actual, printSvgDocument: vi.fn() };
});

/** Ids can contain characters the serializer escapes inside attributes. */
const attr = (id: string): string =>
  id.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

describe('v2 export file names', () => {
  it('says the repo name once when the page repeats the document name', async () => {
    const fixture = await buildCanonicalFixtureDocument();
    const named = (doc: string, page: string) => ({ ...fixture, name: doc, pages: fixture.pages.slice(0, 1).map((p) => ({ ...p, name: page })) });
    const png = async (doc: string, page: string) => {
      const document = named(doc, page);
      return (await buildV2Export({ document, format: 'png', scope: 'page', pageId: document.pages[0]!.id }))[0]!.filename;
    };
    expect(await png('GoogleCloudPlatform/microservices-demo', 'microservices-demo')).toBe('googlecloudplatform-microservices-demo.png');
    expect(await png('acme/shop', 'acme/shop (drawing)')).toBe('acme-shop-drawing.png');
    expect(await png('My doc', 'Page 1')).toBe('my-doc-page-1.png');
  });
});

describe('v2 export', () => {
  it('exports the active page as SVG at the requested scale', async () => {
    const document = await buildCanonicalFixtureDocument();
    const [file] = await buildV2Export({ document, format: 'svg', scope: 'page', pageId: document.pages[0]!.id, scale: 2 });
    expect(file?.filename).toMatch(/\.svg$/);
    expect(file?.mime).toBe('image/svg+xml');
    expect(file?.text).toContain('data-pixel-ratio="2"');
    expect(file?.text).toContain('data-page="page-1"');
    expect(file?.text).toContain('<style>@font-face{}</style>');
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
    // Named after the pages, the way a page-scope export is: a page id or a "document-1" prefix says nothing.
    expect(files.map(({ filename }) => filename)).toEqual(['diagram-page-1.png', 'diagram-second-page.png']);
    expect(files.every(({ mime }) => mime === 'image/png')).toBe(true);
  });

  it('keeps same-named pages apart and skips empty pages in document scope', async () => {
    const document = await buildCanonicalFixtureDocument();
    const page = document.pages[0]!;
    const pages = [page, { ...page, id: 'page-2' }, { ...page, id: 'page-3', name: 'Blank', nodes: [], connectors: [] }];
    const files = await buildV2Export({ document: { ...document, pages }, format: 'svg', scope: 'document', pageId: 'page-1' });
    expect(files.map(({ filename }) => filename)).toEqual(['diagram-page-1.svg', 'diagram-page-1-2.svg']);
  });

  it('prints every page of "All pages", one sheet each, in the picked theme', async () => {
    vi.mocked(printSvgDocument).mockClear();
    const document = await buildCanonicalFixtureDocument();
    const second = { ...document.pages[0]!, id: 'page-2', name: 'Future state' };
    await printV2Export({ document: { ...document, pages: [...document.pages, second] }, format: 'pdf', scope: 'document', pageId: 'page-2', theme: 'dark' });
    const [svgs, title, options] = vi.mocked(printSvgDocument).mock.calls[0]!;
    expect(svgs.map((svg) => /data-page="([^"]+)"/.exec(svg)?.[1])).toEqual(['page-1', 'page-2']);
    expect(svgs.every((svg) => svg.includes('data-theme="dark"'))).toBe(true);
    expect(title).toBe('Diagram');
    expect(options).toEqual({ theme: 'dark' });
  });

  it('refuses a page that is not in the document instead of exporting page 1 under its name', async () => {
    const document = await buildCanonicalFixtureDocument();
    await expect(buildV2Export({ document, format: 'svg', scope: 'page', pageId: 'page-gone' })).rejects.toThrow(/no longer in this document/);
    await expect(printV2Export({ document, format: 'pdf', scope: 'page', pageId: 'page-gone' })).rejects.toThrow(/no longer in this document/);
  });

  it('always exports JSON as the whole document', async () => {
    const document = createEmptyV2Document('doc-1', 'My Doc');
    const [file] = await buildV2Export({ document, format: 'json', scope: 'document', pageId: document.pages[0]!.id });
    expect(file?.filename).toBe('my-doc-document.json');
    expect(JSON.parse(file?.text ?? '{}')).toMatchObject({ id: 'doc-1', name: 'My Doc' });
  });

  it('prints the page, with its font, instead of downloading for PDF', async () => {
    vi.mocked(printSvgDocument).mockClear();
    const document = await buildCanonicalFixtureDocument();
    await printV2Export({ document, format: 'pdf', scope: 'page', pageId: document.pages[0]!.id });
    expect(vi.mocked(printSvgDocument).mock.calls[0]?.[0]).toEqual([expect.stringContaining('<style>@font-face{}</style>')]);
    await expect(buildV2Export({ document, format: 'pdf', scope: 'page', pageId: document.pages[0]!.id })).resolves.toEqual([]);
  });
});
