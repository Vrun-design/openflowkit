import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { serializeCanonicalJson } from '../../../opencanvas/infrastructure/export/canonicalJson';
import { createEmptyV2Document } from '../../../opencanvas/presentation/v2/v2Document';
import { documentFromFileText } from './openDocumentFile';

type V1Page = { diagramType?: string; nodes: unknown[]; edges: unknown[] };
const fixture = (name: string) => JSON.parse(readFileSync(`src/services/storage/v2/__fixtures__/v1/${name}`, 'utf8'));

// Every page phase 12.0 captured from a real v1 (main and the last pre-March build).
function capturedV1Pages(): V1Page[] {
  type Doc = { pages: { diagramType?: string; content: V1Page }[] };
  const fromDocs = (docs: Doc[]) => docs.flatMap((doc) => doc.pages.map((page) => ({ ...page.content, diagramType: page.diagramType })));
  const premarch = fixture('premarch-tabs.json').indexedDb.flowMetadata.find((row: { id: string }) => row.id === 'openflowkit-storage');
  return [
    ...fromDocs(fixture('indexeddb.json').indexedDb.documents),
    ...fromDocs(JSON.parse(fixture('localstorage-fallback.json').localStorage['openflowkit-documents-fallback'])),
    ...JSON.parse(premarch.value).state.tabs,
  ];
}

const OPENS = 'OpenFlowKit opens the .json files it exports, from this version or the previous one.';

describe('documentFromFileText', () => {
  it('opens every captured v1 page with every node and connector, each node sized', () => {
    const pages = capturedV1Pages();
    expect(pages.length).toBeGreaterThan(30);
    for (const page of pages) {
      const opened = documentFromFileText(JSON.stringify(page), 'doc-v1');
      if (!('document' in opened)) throw new Error(opened.error);
      const [projected] = opened.document.pages;
      expect(projected.nodes).toHaveLength(page.nodes.length);
      expect(projected.connectors).toHaveLength(page.edges.length);
      expect(projected.nodes.filter((node) => !(node.size.width > 0 && node.size.height > 0)).map((node) => node.kind)).toEqual([]);
    }
  });

  it('opens our own JSON export under a fresh id', () => {
    const exported = serializeCanonicalJson({ ...createEmptyV2Document('doc-old', 'Shipped'), updatedAt: '2020-01-01T00:00:00.000Z' });
    const opened = documentFromFileText(exported, 'doc-new', '2026-09-22T00:00:00.000Z');
    expect('document' in opened && opened.document).toMatchObject({ id: 'doc-new', name: 'Shipped', updatedAt: '2026-09-22T00:00:00.000Z' });
  });

  it('projects a V1 file (nodes + edges) into a one-page document', () => {
    const legacy = JSON.stringify({
      name: 'Old flow',
      nodes: [
        { id: 'a', type: 'process', position: { x: 0, y: 0 }, data: { label: 'A' } },
        { id: 'b', type: 'process', position: { x: 200, y: 0 }, data: { label: 'B' } },
      ],
      edges: [{ id: 'e1', source: 'a', target: 'b' }],
    });
    const opened = documentFromFileText(legacy, 'doc-v1');
    if (!('document' in opened)) throw new Error(opened.error);
    expect(opened.document.name).toBe('Old flow');
    expect(opened.document.pages[0]!.nodes.map((node) => node.id)).toEqual(['a', 'b']);
    expect(opened.document.pages[0]!.connectors).toHaveLength(1);
  });

  it('explains what it cannot open', () => {
    // Each reason says what the file is not and what does open.
    expect(documentFromFileText('{not json', 'x')).toEqual({ error: `It isn’t valid JSON. ${OPENS}` });
    expect(documentFromFileText('[1,2]', 'x')).toEqual({ error: `It isn’t an OpenFlowKit diagram. ${OPENS}` });
    expect(documentFromFileText(JSON.stringify({ format: 'openflowkit.scene', schemaVersion: 99, pages: [] }), 'x'))
      .toMatchObject({ error: expect.stringContaining('newer') });
  });
});
