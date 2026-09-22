import type { DslAttribute, DslDiagnostic } from './ast';
import { diagnostic, tokenDiagnostic } from './diagnostics';
import type { CanonicalAttribute } from './sceneMeta';
import { joinTokens } from './segments';
import type { DslToken } from './tokenize';
import {
  ATTRIBUTE_KEYS, COLOR_ALIASES, COLOR_WORDS, DIRECTIONS, EDGE_FLAG_WORDS, FILL_WORDS,
  NODE_FLAG_WORDS, SHAPE_ALIASES, SHAPE_WORDS, SIDE_WORDS, attributeSlot,
  canonicalColorWord, canonicalShapeWord, isHexColor, isIconWord, sortAttributes,
} from './vocabulary';
import type { Side } from './vocabulary';

/** The typed view of a canonical attribute list, recomputed after any merge. */
export interface TypedAttributes {
  entries: CanonicalAttribute[];
  shape?: string;
  color?: string;
  fill: 'pastel' | 'bold' | 'outline';
  icon?: string;
  flags: Set<string>;
  head: string;
  tail: string;
  from?: Side;
  to?: Side;
  label?: string;
  pin?: { x: number; y: number };
  width?: number;
  height?: number;
}

/** Attributes kept in `metadata.dsl.attrs` because no scene property holds them. */
export const NON_VISUAL_KEYS = new Set(['tech', 'desc', 'kind', 'tags', 'link', 'pin', 'rank', 'width', 'height', 'order']);

// Derived from the vocabulary tables so a new shape or colour word can never
// ship without its attribute spelling being recognised (W131 would hide it).
const KNOWN_ATTRIBUTE_WORDS = new Set([
  ...Object.keys(SHAPE_WORDS), ...Object.keys(SHAPE_ALIASES),
  ...Object.keys(COLOR_WORDS), ...Object.keys(COLOR_ALIASES),
  ...FILL_WORDS, ...NODE_FLAG_WORDS, ...EDGE_FLAG_WORDS, ...Object.keys(DIRECTIONS),
  'fork', 'join', 'choice',
  'highlight', 'revert', 'interface', 'abstract', 'enum', 'class', 'entity',
]);

const KNOWN_ATTRIBUTE_KEYS = new Set([...ATTRIBUTE_KEYS, 'tag', 'type', 'id']);

/**
 * Reads a `[…]` list off a token run: body tokens (everything outside the
 * brackets) plus typed entries. Warns W131 for words outside the vocabulary;
 * `canonicalizeAttributes` then folds aliases and dedupes slots.
 */
export function readAttributes(tokens: readonly DslToken[], diagnostics: DslDiagnostic[]): { body: DslToken[]; attributes: DslAttribute[] } {
  const start = tokens.findIndex((token) => token.value === '[');
  if (start < 0) return { body: [...tokens], attributes: [] };
  const end = tokens.findIndex((token, index) => index > start && token.value === ']');
  if (end < 0) {
    diagnostics.push(tokenDiagnostic('W101', 'warning', tokens[start], 'Unclosed attribute list; statement dropped', 'Add ]'));
    return { body: [], attributes: [] };
  }
  const attributes: DslAttribute[] = [];
  let part: DslToken[] = [];
  const commit = () => {
    if (part.length === 0) return;
    const colon = part.findIndex((token) => token.value === ':');
    const first = part[0]!;
    const last = part.at(-1)!;
    // `[pin: 240,80]` splits on the comma; rejoin the coordinate pair.
    if (colon < 0 && /^-?\d+(?:\.\d+)?$/.test(first.value) && part.length === 1) {
      const previous = attributes.at(-1);
      if (previous?.key === 'pin' && !previous.value.includes(',')) {
        previous.value = `${previous.value},${first.value}`;
        previous.endCol = last.endCol;
        part = [];
        return;
      }
    }
    const key = colon >= 0 ? joinTokens(part.slice(0, colon)) : undefined;
    const value = joinTokens(colon >= 0 ? part.slice(colon + 1) : part);
    const known = (key && KNOWN_ATTRIBUTE_KEYS.has(key.toLowerCase()))
      || (!key && (KNOWN_ATTRIBUTE_WORDS.has(value.toLowerCase()) || isHexColor(value)
        || canonicalShapeWord(value) !== undefined || canonicalColorWord(value) !== undefined || isIconWord(value)));
    if (!known) diagnostics.push(tokenDiagnostic('W131', 'warning', first, `Unknown attribute ${key ?? value}; kept verbatim`));
    attributes.push({ ...(key ? { key } : {}), value, line: first.line, col: first.col, endCol: last.endCol });
    part = [];
  };
  for (const token of tokens.slice(start + 1, end)) {
    if (token.value === ',') commit();
    else part.push(token);
  }
  commit();
  return { body: [...tokens.slice(0, start), ...tokens.slice(end + 1)], attributes };
}

export function finite(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Canonicalises an attribute list: alias folding, default removal, slot dedupe (last wins). */
export function canonicalizeAttributes(attributes: readonly DslAttribute[], diagnostics: DslDiagnostic[]): CanonicalAttribute[] {
  const slots = new Map<string, CanonicalAttribute>();
  for (const attribute of attributes) {
    const key = attribute.key?.trim().toLowerCase();
    const value = attribute.value.trim();
    if (!key && !value) continue;
    const where = { line: attribute.line, col: attribute.col, endCol: attribute.endCol };
    if (key) {
      slots.set(`key:${key}`, { key, value });
      continue;
    }
    const lower = value.toLowerCase();
    const shape = canonicalShapeWord(value);
    const color = canonicalColorWord(value);
    let entry: CanonicalAttribute;
    if (shape) entry = { value: shape };
    else if (color) entry = { value: color };
    else if (isHexColor(value)) entry = { value: lower };
    else if (FILL_WORDS.has(lower) || lower === 'shadow' || EDGE_FLAG_WORDS.has(lower) || DIRECTIONS[lower]) entry = { value: lower };
    else if (isIconWord(value)) entry = { value };
    else entry = { value };
    const slot = attributeSlot(entry);
    if (slots.has(slot)) diagnostics.push(diagnostic(where, 'W130', 'warning', `Two ${slot.replace(/^(?:key|flag|word):/, '')} attributes; last wins`));
    slots.set(slot, entry);
  }
  return sortAttributes([...slots.values()]);
}

/** Resolves the typed view of a canonical attribute list; recomputed after any merge. */
export function typedFrom(entries: readonly CanonicalAttribute[]): TypedAttributes {
  const slot = (name: string): string | undefined => entries.find((entry) => (name.startsWith('key:') ? entry.key === name.slice(4) : attributeSlot(entry) === name))?.value;
  const pinParts = slot('key:pin')?.split(/\s*,\s*/).map(Number);
  const head = slot('key:head')?.toLowerCase();
  const tail = slot('key:tail')?.toLowerCase();
  const from = slot('key:from')?.toLowerCase();
  const to = slot('key:to')?.toLowerCase();
  const shape = slot('shape');
  const color = slot('color');
  const fill = slot('fill')?.toLowerCase();
  return {
    entries: [...entries],
    ...(shape ? { shape } : {}),
    ...(color ? { color: color.toLowerCase() } : {}),
    fill: FILL_WORDS.has(fill ?? '') ? fill as TypedAttributes['fill'] : 'pastel',
    ...(slot('icon') ? { icon: slot('icon')! } : {}),
    flags: new Set(entries.filter((entry) => !entry.key && (EDGE_FLAG_WORDS.has(entry.value) || entry.value === 'shadow')).map((entry) => entry.value)),
    head: head && ['arrow', 'circle', 'cross', 'none'].includes(head) ? head : 'arrow',
    tail: tail && ['arrow', 'circle', 'cross', 'none'].includes(tail) ? tail : 'none',
    ...(from && SIDE_WORDS[from] ? { from: SIDE_WORDS[from]! } : {}),
    ...(to && SIDE_WORDS[to] ? { to: SIDE_WORDS[to]! } : {}),
    ...(slot('key:label') ? { label: slot('key:label')! } : {}),
    ...(pinParts && pinParts.length === 2 && pinParts.every(Number.isFinite) ? { pin: { x: pinParts[0]!, y: pinParts[1]! } } : {}),
    ...(finite(slot('key:width')) !== undefined ? { width: finite(slot('key:width'))! } : {}),
    ...(finite(slot('key:height')) !== undefined ? { height: finite(slot('key:height'))! } : {}),
  };
}

/** Attributes the serializer re-emits from metadata because no scene property holds them. */
export function nonVisualAttributes(typed: TypedAttributes, context: 'node' | 'edge'): CanonicalAttribute[] {
  return typed.entries.filter((entry) => {
    if (entry.key) return NON_VISUAL_KEYS.has(entry.key) || !ATTRIBUTE_KEYS.has(entry.key);
    if (canonicalShapeWord(entry.value) || canonicalColorWord(entry.value) || isHexColor(entry.value)) return false;
    if (FILL_WORDS.has(entry.value) || entry.value === 'shadow' || entry.value === 'dashed' || entry.value === 'thick' || entry.value === 'invisible') return false;
    if (context === 'edge' && entry.value === 'flow') return true;
    if (DIRECTIONS[entry.value] && !isIconWord(entry.value)) return false;
    if (isIconWord(entry.value)) return false;
    return true;
  });
}
