import { NODE_EXPORT_COLORS, NODE_FILLED_COLORS } from '../../../theme/palettes';
import type { JsonObject } from '../document/json';

// The grammar's palette (docs/plan/grammar.md §5.1) mapped onto the theme
// tables. Swatches write concrete hex into `appearance`; the document never
// stores palette names, the DSL serializer snaps hex back to a name.
export type PaletteKey = 'white' | 'slate' | 'blue' | 'emerald' | 'red' | 'amber'
  | 'violet' | 'pink' | 'yellow' | 'cyan';
export type PaletteMode = 'pastel' | 'solid';

export const PALETTE_KEYS: readonly PaletteKey[] = [
  'white', 'slate', 'blue', 'emerald', 'red', 'amber', 'violet', 'pink', 'yellow', 'cyan',
];
export const PALETTE_LABELS: Readonly<Record<PaletteKey, string>> = {
  white: 'White', slate: 'Gray', blue: 'Blue', emerald: 'Green', red: 'Red', amber: 'Orange',
  violet: 'Violet', pink: 'Pink', yellow: 'Yellow', cyan: 'Teal',
};

export interface PaletteSwatch {
  readonly fill: string;
  readonly stroke: string;
  readonly textColor: string;
}

export function paletteSwatch(key: PaletteKey, mode: PaletteMode): PaletteSwatch {
  const table = mode === 'solid' ? NODE_FILLED_COLORS : NODE_EXPORT_COLORS;
  const colors = table[key] ?? table.white;
  return { fill: colors.bg.toLowerCase(), stroke: colors.border.toLowerCase(), textColor: colors.text.toLowerCase() };
}

/** Patch a fill swatch click writes; `transparent` keeps the current outline. */
export function paletteFillPatch(key: PaletteKey | 'transparent', mode: PaletteMode): JsonObject {
  if (key === 'transparent') return { fill: 'transparent' };
  return { ...paletteSwatch(key, mode) };
}

/** Which swatch a fill hex came from, for the selected ring; null for custom. */
export function paletteKeyForFill(fill: string | null): { key: PaletteKey; mode: PaletteMode } | null {
  if (!fill) return null;
  for (const mode of ['pastel', 'solid'] as const) {
    for (const key of PALETTE_KEYS) {
      if (paletteSwatch(key, mode).fill === fill.toLowerCase()) return { key, mode };
    }
  }
  return null;
}

/** Strong colours for outlines, text and lines: the solid table's fill. */
export const INK_PRESETS: readonly { readonly key: PaletteKey; readonly hex: string }[] = PALETTE_KEYS
  .filter((key) => key !== 'white')
  .map((key) => ({ key, hex: key === 'slate' ? '#0f172a' : paletteSwatch(key, 'solid').fill }));
