import { describe, expect, it } from 'vitest';
import { numericColorToHex, resolveAdaptiveInk } from './adaptiveColor';

describe('adaptive canvas colour', () => {
  it('chooses readable ink for light and dark canvas grounds', () => {
    expect(resolveAdaptiveInk(undefined, '#f7f7f5')).toBe('#0f172a');
    expect(resolveAdaptiveInk('auto', '#191b19')).toBe('#ffffff');
  });

  it('keeps explicit user colour overrides', () => {
    expect(resolveAdaptiveInk('#123ABC', '#191b19')).toBe('#123abc');
  });

  it('converts renderer colours to six-digit hex', () => {
    expect(numericColorToHex(0x191b19)).toBe('#191b19');
  });
});
