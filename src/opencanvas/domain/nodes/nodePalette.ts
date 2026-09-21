import { NODE_EXPORT_COLORS, NODE_FILLED_COLORS } from '../../../theme/palettes';
import type { NodeExportColor } from '../../../theme/types';
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

// ---------------------------------------------------------------------------
// Diagram palettes. A palette is a compile-time appearance default: the DSL
// stays colour-word based and the palette decides which hex a word means. The
// `pastel` palette *is* the tables above, so an untouched document compiles
// byte for byte. Non-default palettes are derived from those tables by a small
// recipe (paper base, ink, saturation) rather than 20 hand-written swatches.
// ---------------------------------------------------------------------------

export type DiagramPaletteName = 'pastel' | 'paper' | 'builder' | 'mono';
export type SwatchResolver = (key: PaletteKey, mode: PaletteMode) => PaletteSwatch;
export type PaletteTables = Readonly<Record<PaletteKey, NodeExportColor>>;

export const DEFAULT_DIAGRAM_PALETTE: DiagramPaletteName = 'pastel';

export interface DiagramPaletteInfo {
  readonly id: DiagramPaletteName;
  readonly label: string;
  readonly hint: string;
}

export const DIAGRAM_PALETTES: readonly DiagramPaletteInfo[] = [
  { id: 'pastel', label: 'Pastel', hint: 'Soft fills, slate ink' },
  { id: 'paper', label: 'Paper', hint: 'Warm paper with dark ink' },
  { id: 'builder', label: 'Builder', hint: 'Neutral cards, orange accent' },
  { id: 'mono', label: 'Mono', hint: 'Greyscale for print' },
];

export const DIAGRAM_PALETTE_NAMES: readonly DiagramPaletteName[] = DIAGRAM_PALETTES.map(({ id }) => id);

export function isDiagramPalette(value: unknown): value is DiagramPaletteName {
  return typeof value === 'string' && (DIAGRAM_PALETTE_NAMES as readonly string[]).includes(value);
}

/** Unknown or absent falls back to the default palette. */
export function diagramPalette(value: unknown): DiagramPaletteName {
  return isDiagramPalette(value) ? value : DEFAULT_DIAGRAM_PALETTE;
}

/** The palette a node was compiled with; canvas-created nodes use the default. */
export function nodePaletteName(node: { readonly metadata: { readonly dsl?: unknown } }): DiagramPaletteName {
  const dsl = node.metadata.dsl;
  if (!dsl || typeof dsl !== 'object' || Array.isArray(dsl)) return DEFAULT_DIAGRAM_PALETTE;
  const appearance = (dsl as Record<string, unknown>).appearance;
  if (!appearance || typeof appearance !== 'object' || Array.isArray(appearance)) return DEFAULT_DIAGRAM_PALETTE;
  return diagramPalette((appearance as Record<string, unknown>).palette);
}

interface PaletteRecipe {
  /** Pastel fills mix this far toward `paper`. */
  readonly paper: string;
  readonly pastelMix: number;
  /** Strokes and text mix this far toward `ink`. */
  readonly ink: string;
  readonly inkMix: number;
  /** Solid fills mix this far toward `ink`. */
  readonly solidMix: number;
  readonly solidText: string;
  /** 0..1; pulls every hue toward its luminance before mixing. */
  readonly desaturate?: number;
  /**
   * Grey palettes: fills are pure greys ramped between two luminance levels
   * per mode, ranked by the base key's luminance. Ranking instead of a per-key
   * offset guarantees ten distinct swatches.
   */
  readonly lightnessRamp?: Readonly<Record<PaletteMode, readonly [number, number]>>;
  readonly overrides?: Partial<Record<PaletteKey, Partial<Record<PaletteMode, Partial<PaletteSwatch>>>>>;
}

const RECIPES: Readonly<Record<Exclude<DiagramPaletteName, 'pastel'>, PaletteRecipe>> = {
  paper: {
    paper: '#fbf7f0', pastelMix: 0.55, ink: '#2f2a24', inkMix: 0.78, solidMix: 0.72, solidText: '#fdfbf7',
  },
  builder: {
    paper: '#ffffff', pastelMix: 0.42, ink: '#1c1917', inkMix: 0.82, solidMix: 0.58, solidText: '#ffffff',
    desaturate: 0.3,
    overrides: {
      white: {
        pastel: { fill: '#ffffff', stroke: '#d6d3d1', textColor: '#1c1917' },
        solid: { fill: '#1c1917', stroke: '#1c1917', textColor: '#ffffff' },
      },
      slate: {
        pastel: { fill: '#f5f5f4', stroke: '#a8a29e', textColor: '#292524' },
        solid: { fill: '#44403c', stroke: '#292524', textColor: '#ffffff' },
      },
      amber: {
        pastel: { fill: '#fdece2', stroke: '#e95420', textColor: '#9a3412' },
        solid: { fill: '#e95420', stroke: '#c2410c', textColor: '#ffffff' },
      },
    },
  },
  mono: {
    paper: '#ffffff', pastelMix: 0.62, ink: '#18181b', inkMix: 0.88, solidMix: 0.78, solidText: '#fafafa',
    lightnessRamp: { pastel: [0.94, 0.62], solid: [0.46, 0.16] },
  },
};

function parseHex(value: string): [number, number, number] | null {
  const hex = value.replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((character) => character + character).join('') : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return [Number.parseInt(full.slice(0, 2), 16), Number.parseInt(full.slice(2, 4), 16), Number.parseInt(full.slice(4, 6), 16)];
}

function toHex(rgb: readonly [number, number, number]): string {
  return `#${rgb.map((channel) => Math.round(Math.min(255, Math.max(0, channel))).toString(16).padStart(2, '0')).join('')}`;
}

function mix(from: string, to: string, amount: number): string {
  const a = parseHex(from);
  const b = parseHex(to);
  if (!a || !b) return from;
  return toHex(a.map((channel, index) => channel + (b[index]! - channel) * amount) as [number, number, number]);
}

/** Luminance-preserving desaturation: `amount` 1 is fully grey. */
function greyscale(value: string, amount: number): string {
  const rgb = parseHex(value);
  if (!rgb) return value;
  // Rounded first so a full desaturation lands on exact #rrggbb greys.
  const luminance = Math.round(0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]);
  return toHex(rgb.map((channel) => channel + (luminance - channel) * amount) as [number, number, number]);
}

function luminance(hex: string): number {
  const rgb = parseHex(hex);
  return rgb ? 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2] : 255;
}

function greyAt(level: number): string {
  const channel = Math.round(Math.min(1, Math.max(0, level)) * 255);
  return toHex([channel, channel, channel]);
}

const RANK_CACHE = new Map<PaletteMode, ReadonlyMap<PaletteKey, number>>();

function luminanceRanks(mode: PaletteMode): ReadonlyMap<PaletteKey, number> {
  const cached = RANK_CACHE.get(mode);
  if (cached) return cached;
  const sorted = [...PALETTE_KEYS].sort((a, b) => luminance(paletteSwatch(a, mode).fill) - luminance(paletteSwatch(b, mode).fill));
  const ranks = new Map(sorted.map((key, index) => [key, index / (PALETTE_KEYS.length - 1)]));
  RANK_CACHE.set(mode, ranks);
  return ranks;
}

function deriveSwatch(recipe: PaletteRecipe, key: PaletteKey, mode: PaletteMode): PaletteSwatch {
  const base = paletteSwatch(key, mode);
  if (recipe.lightnessRamp) {
    const [lightest, darkest] = recipe.lightnessRamp[mode];
    const rank = luminanceRanks(mode).get(key) ?? 0;
    const fill = greyAt(lightest + (darkest - lightest) * rank);
    return mode === 'pastel'
      ? { fill, stroke: recipe.ink, textColor: recipe.ink }
      : { fill, stroke: mix(fill, '#000000', 0.22), textColor: recipe.solidText };
  }
  const fill = recipe.desaturate ? greyscale(base.fill, recipe.desaturate) : base.fill;
  const stroke = recipe.desaturate ? greyscale(base.stroke, recipe.desaturate) : base.stroke;
  const swatch: PaletteSwatch = mode === 'pastel'
    ? {
        fill: mix(fill, recipe.paper, recipe.pastelMix),
        stroke: mix(stroke, recipe.ink, recipe.inkMix),
        textColor: mix(base.textColor ?? stroke, recipe.ink, recipe.inkMix),
      }
    : {
        fill: mix(fill, recipe.ink, recipe.solidMix),
        stroke: mix(stroke, recipe.ink, Math.max(recipe.solidMix * 0.8, 0.35)),
        textColor: recipe.solidText,
      };
  const override = recipe.overrides?.[key]?.[mode];
  return override ? { ...swatch, ...override } : swatch;
}

const TABLE_CACHE = new Map<string, PaletteTables>();

function deriveTable(recipe: PaletteRecipe, mode: PaletteMode): PaletteTables {
  const table = {} as Record<PaletteKey, NodeExportColor>;
  for (const key of PALETTE_KEYS) {
    const swatch = deriveSwatch(recipe, key, mode);
    table[key] = mode === 'solid'
      ? {
          bg: swatch.fill, border: swatch.stroke, text: swatch.textColor,
          subText: mix(swatch.textColor, swatch.fill, 0.3),
          iconBg: mix(swatch.fill, swatch.textColor, 0.16), iconColor: swatch.textColor,
        }
      : {
          bg: swatch.fill, border: swatch.stroke, text: swatch.textColor,
          subText: mix(swatch.textColor, swatch.fill, 0.38),
          iconBg: mix(swatch.fill, '#ffffff', 0.55), iconColor: swatch.stroke,
        };
  }
  return table;
}

export function paletteResolver(name: DiagramPaletteName = DEFAULT_DIAGRAM_PALETTE): SwatchResolver {
  if (name === 'pastel') return paletteSwatch;
  const recipe = RECIPES[name];
  return (key, mode) => deriveSwatch(recipe, key, mode);
}

/** Renderer-side read: the fuller `NodeExportColor` table for one mode. */
export function paletteTablesForMode(name: DiagramPaletteName, mode: PaletteMode): PaletteTables {
  if (name === 'pastel') {
    return (mode === 'solid' ? NODE_FILLED_COLORS : NODE_EXPORT_COLORS) as unknown as PaletteTables;
  }
  const cacheKey = `${name}:${mode}`;
  const cached = TABLE_CACHE.get(cacheKey);
  if (cached) return cached;
  const table = deriveTable(RECIPES[name], mode);
  TABLE_CACHE.set(cacheKey, table);
  return table;
}

/** Snap a concrete fill hex back to a palette word; null when it is custom. */
export function paletteKeyForFillIn(fill: string, swatch: SwatchResolver): { key: PaletteKey; mode: PaletteMode } | null {
  const target = fill.toLowerCase();
  for (const mode of ['pastel', 'solid'] as const) {
    for (const key of PALETTE_KEYS) if (swatch(key, mode).fill === target) return { key, mode };
  }
  return null;
}

/** Snap a stroke hex back to the palette word whose solid swatch it is. */
export function paletteKeyForStrokeIn(stroke: string, swatch: SwatchResolver): PaletteKey | null {
  const target = stroke.toLowerCase();
  for (const key of PALETTE_KEYS) {
    const solid = swatch(key, 'solid');
    if (solid.stroke === target || solid.fill === target) return key;
  }
  return null;
}
