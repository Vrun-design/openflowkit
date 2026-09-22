import { describe, expect, it } from 'vitest';
import { serializeCanonicalJson } from '../../../opencanvas/infrastructure/export/canonicalJson';
import { createEmptyV2Document } from '../../../opencanvas/presentation/v2/v2Document';
import { documentFromFileText } from './openDocumentFile';

describe('documentFromFileText', () => {
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
    expect(documentFromFileText('{not json', 'x')).toEqual({ error: 'Not a JSON file.' });
    expect(documentFromFileText('[1,2]', 'x')).toEqual({ error: 'Not an OpenFlowKit document.' });
    expect(documentFromFileText(JSON.stringify({ format: 'openflowkit.scene', schemaVersion: 99, pages: [] }), 'x'))
      .toMatchObject({ error: expect.stringContaining('newer') });
  });
});
