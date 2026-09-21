import { describe, expect, it } from 'vitest';
import {
  DIAGRAM_PALETTES, diagramPalette, isDiagramPalette, nodePaletteName, PALETTE_KEYS,
  paletteKeyForFillIn, paletteKeyForStrokeIn, paletteResolver, paletteSwatch, paletteTablesForMode,
} from './nodePalette';
import type { SceneNode } from '../document/types';

const isHex = (value: string) => /^#[0-9a-f]{6}$/.test(value);
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const node = (metadata: SceneNode['metadata']): SceneNode => ({ metadata }) as SceneNode;

describe('diagram palettes', () => {
  it('names the four shipped palettes and validates values', () => {
    expect(DIAGRAM_PALETTES.map(({ id }) => id)).toEqual(['pastel', 'paper', 'builder', 'mono']);
    expect(isDiagramPalette('mono')).toBe(true);
    expect(isDiagramPalette('neon')).toBe(false);
    expect(diagramPalette('neon')).toBe('pastel');
  });

  it('keeps the pastel palette byte-identical to the theme tables', () => {
    const swatch = paletteResolver('pastel');
    for (const key of PALETTE_KEYS) {
      expect(swatch(key, 'pastel')).toEqual(paletteSwatch(key, 'pastel'));
      expect(swatch(key, 'solid')).toEqual(paletteSwatch(key, 'solid'));
    }
  });

  it('derives valid, mode-consistent swatches for every palette', () => {
    for (const { id } of DIAGRAM_PALETTES) {
      const swatch = paletteResolver(id);
      for (const key of PALETTE_KEYS) {
        for (const mode of ['pastel', 'solid'] as const) {
          const resolved = swatch(key, mode);
          expect(isHex(resolved.fill), `${id}/${key}/${mode} fill`).toBe(true);
          expect(isHex(resolved.stroke), `${id}/${key}/${mode} stroke`).toBe(true);
          expect(isHex(resolved.textColor), `${id}/${key}/${mode} text`).toBe(true);
          // Readable in both modes: ink always contrasts with the fill, and
          // the ink is dark on light fills, light on dark fills.
          const contrast = luminance(resolved.fill) - luminance(resolved.textColor);
          expect(Math.abs(contrast), `${id}/${key}/${mode} contrast`).toBeGreaterThan(60);
          if (contrast > 0) expect(luminance(resolved.textColor)).toBeLessThan(120);
          else expect(luminance(resolved.textColor)).toBeGreaterThan(160);
        }
        expect(luminance(swatch(key, 'pastel').fill)).toBeGreaterThanOrEqual(luminance(swatch(key, 'solid').fill));
      }
    }
  });

  it('gives paper, builder and mono their own character', () => {
    const pastel = paletteResolver('pastel');
    const paper = paletteResolver('paper');
    const mono = paletteResolver('mono');
    const builder = paletteResolver('builder');
    expect(paper('blue', 'pastel').fill).not.toBe(pastel('blue', 'pastel').fill);
    // Paper ink is warm: red channel above blue in the outline.
    const paperInk = paper('white', 'pastel').stroke;
    expect(Number.parseInt(paperInk.slice(1, 3), 16)).toBeGreaterThan(Number.parseInt(paperInk.slice(5, 7), 16));
    // Mono is grey for every key and mode, and keys stay distinguishable.
    for (const key of PALETTE_KEYS) {
      for (const mode of ['pastel', 'solid'] as const) {
        const fill = mono(key, mode).fill;
        expect(fill.slice(1, 3)).toBe(fill.slice(3, 5));
        expect(fill.slice(3, 5)).toBe(fill.slice(5, 7));
      }
    }
    for (const mode of ['pastel', 'solid'] as const) {
      expect(new Set(PALETTE_KEYS.map((key) => mono(key, mode).fill)).size, `mono ${mode}`).toBe(PALETTE_KEYS.length);
    }
    // Builder accent is the brand orange.
    expect(builder('amber', 'solid').fill).toBe('#e95420');
  });

  it('round-trips swatch hex back to its key and mode', () => {
    for (const { id } of DIAGRAM_PALETTES) {
      const swatch = paletteResolver(id);
      for (const key of PALETTE_KEYS) {
        for (const mode of ['pastel', 'solid'] as const) {
          const snap = paletteKeyForFillIn(swatch(key, mode).fill, swatch);
          expect(snap?.key, `${id}/${key}/${mode}`).toBe(key);
          // White pastel and solid share #ffffff; the first match (pastel) wins
          // by design, which is hex-stable through a recompile.
          const ambiguous = swatch(key, 'pastel').fill === swatch(key, 'solid').fill;
          if (!ambiguous) expect(snap?.mode).toBe(mode);
        }
        expect(paletteKeyForStrokeIn(swatch(key, 'solid').stroke, swatch)).toBe(key);
      }
      expect(paletteKeyForFillIn('#123456', swatch)).toBeNull();
    }
  });

  it('exposes full renderer tables and reads the palette off a node', () => {
    for (const { id } of DIAGRAM_PALETTES) {
      const table = paletteTablesForMode(id, 'solid');
      for (const key of PALETTE_KEYS) {
        expect(table[key]).toMatchObject({ bg: expect.any(String), border: expect.any(String), text: expect.any(String), iconBg: expect.any(String) });
      }
    }
    expect(nodePaletteName(node({}))).toBe('pastel');
    expect(nodePaletteName(node({ dsl: { appearance: { palette: 'mono' } } }))).toBe('mono');
    expect(nodePaletteName(node({ dsl: { appearance: { palette: 'nope' } } }))).toBe('pastel');
    expect(nodePaletteName(node({ dsl: 'nope' }))).toBe('pastel');
  });
});
