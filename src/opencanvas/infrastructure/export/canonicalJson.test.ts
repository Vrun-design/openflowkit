import { describe, expect, it } from 'vitest';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { importCanonicalJson } from '../import/canonicalJson';
import { serializeCanonicalJson } from './canonicalJson';

describe('canonical JSON export', () => {
  it('round-trips validated documents deterministically through canonical import', () => {
    const document = createTestDocument({ nodes: [createTestNode('node-a')] });
    const serialized = serializeCanonicalJson(document);
    expect(serializeCanonicalJson(importCanonicalJson(serialized).document)).toBe(serialized);
    expect(serialized.endsWith('\n')).toBe(true);
  });

  it('rejects invalid documents before producing a file', () => {
    const invalid = { ...createTestDocument(), pages: [] };
    expect(() => serializeCanonicalJson(invalid)).toThrow(/invalid canonical document/);
  });
});
