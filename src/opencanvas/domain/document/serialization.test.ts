import { describe, expect, it } from 'vitest';
import { createPixiSpikeDocument } from '../../infrastructure/pixi/spikeFixture';
import { serializeSceneDocument, stringifyCanonicalJson } from './serialization';

describe('canonical scene JSON serialization', () => {
  it('orders object keys recursively while preserving authored array order', () => {
    expect(stringifyCanonicalJson({ z: 1, a: { y: 2, b: 3 }, list: [{ z: 4, a: 5 }] }, 0))
      .toBe('{"a":{"b":3,"y":2},"list":[{"a":5,"z":4}],"z":1}');
  });

  it('is byte-stable across structurally equal documents', () => {
    const document = createPixiSpikeDocument(30);
    const reordered = JSON.parse(JSON.stringify(document)) as typeof document;
    expect(serializeSceneDocument(reordered)).toBe(serializeSceneDocument(document));
  });

  it('rejects undefined and non-finite values', () => {
    expect(() => stringifyCanonicalJson({ invalid: undefined })).toThrow(TypeError);
    expect(() => stringifyCanonicalJson({ invalid: Number.NaN })).toThrow(TypeError);
  });
});
