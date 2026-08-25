import { describe, expect, it } from 'vitest';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import {
  CanonicalDocumentRepairAvailableError,
  importCanonicalJson,
} from './canonicalJson';

describe('canonical JSON import and migration', () => {
  it('imports current documents without migration', () => {
    const document = createTestDocument({ nodes: [createTestNode('a')] });
    expect(importCanonicalJson(document)).toEqual({
      document,
      sourceVersion: 1,
      migrations: [],
      repairs: [],
    });
  });

  it('migrates v0 missing portable fields and rejects future or invalid documents', () => {
    const current = createTestDocument({ nodes: [createTestNode('a')] });
    const legacy = structuredClone(current) as unknown as Record<string, unknown>;
    legacy.schemaVersion = 0;
    const page = (legacy.pages as Record<string, unknown>[])[0];
    delete page.layers; delete page.metadata; delete page.extensions;
    const node = (page.nodes as Record<string, unknown>[])[0];
    delete node.layerId; delete node.zIndex; delete node.metadata; delete node.extensions;
    const result = importCanonicalJson(legacy);
    expect(result.sourceVersion).toBe(0);
    expect(result.migrations).toEqual(['v0-to-v1-default-portable-fields']);
    expect(result.document.pages[0].nodes[0]).toMatchObject({ layerId: 'default', zIndex: 0 });
    expect(() => importCanonicalJson({ ...current, schemaVersion: 99 })).toThrow(/newer/);
    expect(() => importCanonicalJson({ ...current, pages: [] })).toThrow(/invalid/);
  });

  it('requires explicit consent before repairing invalid references', () => {
    const document = createTestDocument({ nodes: [createTestNode('a')] });
    const page = document.pages[0];
    const invalid = {
      ...document,
      pages: [{
        ...page,
        nodes: [{ ...page.nodes[0], layerId: 'missing-layer' }],
      }],
    };

    expect(() => importCanonicalJson(invalid)).toThrow(CanonicalDocumentRepairAvailableError);
    const repaired = importCanonicalJson(invalid, { repairInvalidReferences: true });
    expect(repaired.document.pages[0].nodes[0].layerId).toBe('default');
    expect(repaired.repairs.map(({ kind }) => kind)).toEqual(['reset-layer']);
  });
});
