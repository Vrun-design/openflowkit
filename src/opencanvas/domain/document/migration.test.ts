import { describe, expect, it } from 'vitest';
import { projectLegacyDocument } from './legacyProjection';
import { migrateSceneDocument } from './migration';

function createDocument() {
  return projectLegacyDocument(
    { nodes: [{ id: 'node-1', position: { x: 0, y: 0 }, data: { label: 'Node' } }], edges: [] },
    { documentId: 'document-1', pageId: 'page-1', now: '2026-08-07T00:00:00.000Z' }
  );
}

describe('migrateSceneDocument', () => {
  it('clones and validates V1 without mutating its input', () => {
    const input = createDocument();
    const before = structuredClone(input);
    const result = migrateSceneDocument(input);

    expect(result).toEqual({ success: true, document: input, migrated: false });
    expect(input).toEqual(before);
    if (result.success) {
      expect(result.document).not.toBe(input);
      expect(result.document.pages[0]).not.toBe(input.pages[0]);
    }
  });

  it('is idempotent', () => {
    const first = migrateSceneDocument(createDocument());
    expect(first.success).toBe(true);
    if (first.success === false) return;

    const second = migrateSceneDocument(first.document);
    expect(second).toEqual(first);
  });

  it('rejects future versions without rewriting the payload', () => {
    const input = { ...createDocument(), schemaVersion: 99 };
    const before = structuredClone(input);
    const result = migrateSceneDocument(input);

    expect(result.success).toBe(false);
    expect(input).toEqual(before);
    if (result.success === false) expect(result.issues[0].path).toBe('$.schemaVersion');
  });

  it('rejects non-JSON values', () => {
    expect(
      migrateSceneDocument({ ...createDocument(), metadata: { value: undefined } }).success
    ).toBe(false);
  });
});
