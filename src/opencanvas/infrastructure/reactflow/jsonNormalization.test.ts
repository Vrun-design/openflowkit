import { describe, expect, it } from 'vitest';
import { normalizeJsonObject } from './jsonNormalization';

describe('normalizeJsonObject', () => {
  it('clones JSON and omits undefined object properties', () => {
    const input = { id: 'node-1', optional: undefined, nested: { values: [1, true, null] } };
    const result = normalizeJsonObject(input);

    expect(result).toEqual({ id: 'node-1', nested: { values: [1, true, null] } });
    expect(result).not.toBe(input);
    expect(result.nested).not.toBe(input.nested);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, () => undefined, 1n])(
    'rejects non-JSON value %s',
    (value) => {
      expect(() => normalizeJsonObject({ value })).toThrow(TypeError);
    }
  );

  it('rejects cycles and undefined array entries', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;

    expect(() => normalizeJsonObject(cyclic)).toThrow(/cycle/);
    expect(() => normalizeJsonObject({ values: [undefined] })).toThrow(/JSON-compatible/);
  });
});
