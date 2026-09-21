import { describe, expect, it } from 'vitest';
import { INK_PRESETS, PALETTE_KEYS, paletteFillPatch, paletteKeyForFill, paletteSwatch } from './nodePalette';

describe('node palette', () => {
  it('round-trips every swatch fill back to its key (white is the same in both modes)', () => {
    for (const key of PALETTE_KEYS) {
      for (const mode of ['pastel', 'solid'] as const) {
        expect(paletteKeyForFill(paletteSwatch(key, mode).fill)).toEqual({ key, mode: key === 'white' ? 'pastel' : mode });
      }
    }
    expect(paletteKeyForFill('#123456')).toBeNull();
    expect(paletteKeyForFill(null)).toBeNull();
  });
  it('writes fill, stroke and text together; transparent keeps the outline', () => {
    expect(paletteFillPatch('blue', 'pastel')).toEqual({ fill: '#eff6ff', stroke: '#60a5fa', textColor: '#1e293b' });
    expect(paletteFillPatch('transparent', 'solid')).toEqual({ fill: 'transparent' });
    expect(INK_PRESETS.map((ink) => ink.key)).not.toContain('white');
  });
});
