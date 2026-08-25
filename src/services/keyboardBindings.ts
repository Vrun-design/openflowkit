import {
  readLocalStorageJson,
  removeLocalStorageKey,
  writeLocalStorageJson,
} from './storage/uiLocalStorage';

/**
 * Remappable editor actions.
 *
 * ponytail: contextual keys stay out of this registry on purpose. Delete,
 * Escape, arrow nudge, F2, mindmap Tab/Enter, annotation digits, and
 * type-to-rename are selection- or text-context behaviours, not discrete named
 * commands; remapping them would break inline editing rather than personalise
 * it. Add one here only once it has a stable context-free meaning.
 */
export type KeyboardActionId =
  | 'commandBar'
  | 'search'
  | 'shortcutsHelp'
  | 'undo'
  | 'redo'
  | 'selectAll'
  | 'duplicate'
  | 'copy'
  | 'paste'
  | 'copyStyle'
  | 'pasteStyle'
  | 'selectMode'
  | 'panMode'
  | 'fitView'
  | 'zoomIn'
  | 'zoomOut'
  | 'togglePinPosition';

export type KeyboardBindings = Record<KeyboardActionId, readonly string[]>;

export const KEYBOARD_BINDINGS_STORAGE_KEY = 'openflowkit.keyboardBindings.v1';

/**
 * `mod` is Cmd on Apple platforms and Ctrl elsewhere, matching the single
 * `metaKey || ctrlKey` test the editor has always used.
 */
export const DEFAULT_KEYBOARD_BINDINGS: KeyboardBindings = {
  commandBar: ['mod+k'],
  search: ['mod+f'],
  shortcutsHelp: ['shift+slash'],
  undo: ['mod+z'],
  redo: ['mod+shift+z', 'mod+y'],
  selectAll: ['mod+a'],
  duplicate: ['mod+d'],
  copy: ['mod+c'],
  paste: ['mod+v'],
  copyStyle: ['mod+alt+c'],
  pasteStyle: ['mod+alt+v'],
  selectMode: ['v'],
  panMode: ['h'],
  fitView: ['shift+digit1'],
  zoomIn: ['mod+equal'],
  zoomOut: ['mod+minus'],
  togglePinPosition: ['p'],
};

export const KEYBOARD_ACTION_IDS = Object.keys(
  DEFAULT_KEYBOARD_BINDINGS
) as readonly KeyboardActionId[];

/** Localization key per action, reusing the labels the reference sheet ships. */
export const KEYBOARD_ACTION_LABEL_KEYS: Record<KeyboardActionId, string> = {
  commandBar: 'common.commandBar',
  search: 'common.searchNodes',
  shortcutsHelp: 'common.keyboardShortcuts',
  undo: 'common.undo',
  redo: 'common.redo',
  selectAll: 'common.selectAll',
  duplicate: 'common.duplicate',
  copy: 'common.copy',
  paste: 'common.paste',
  copyStyle: 'common.copyStyle',
  pasteStyle: 'common.pasteStyle',
  selectMode: 'common.selectTool',
  panMode: 'common.handTool',
  fitView: 'common.fitView',
  zoomIn: 'common.zoomIn',
  zoomOut: 'common.zoomOut',
  togglePinPosition: 'common.togglePinPosition',
};

function isKeyboardActionId(value: string): value is KeyboardActionId {
  return Object.prototype.hasOwnProperty.call(DEFAULT_KEYBOARD_BINDINGS, value);
}

/**
 * Physical-key tokens. Reading `event.code` for letters, digits, and
 * punctuation keeps a chord stable when a modifier rewrites `event.key`
 * (Shift+1 reports `!`, Ctrl+= reports `+`).
 */
const CODE_KEY_TOKENS: Record<string, string> = {
  Slash: 'slash',
  Backslash: 'backslash',
  Equal: 'equal',
  Minus: 'minus',
  Comma: 'comma',
  Period: 'period',
  Semicolon: 'semicolon',
  Quote: 'quote',
  BracketLeft: 'bracketleft',
  BracketRight: 'bracketright',
  Backquote: 'backquote',
  Space: 'space',
};

/**
 * Fallback tokens for when `event.code` is absent (synthetic events, some
 * virtual keyboards). Both the shifted and unshifted character map to the same
 * physical key so `-`/`_` and `/`/`?` cannot produce two different chords.
 */
const CHAR_KEY_TOKENS: Record<string, string> = {
  '=': 'equal',
  '+': 'equal',
  '-': 'minus',
  _: 'minus',
  '/': 'slash',
  '?': 'slash',
  '\\': 'backslash',
  '|': 'backslash',
  ',': 'comma',
  '<': 'comma',
  '.': 'period',
  '>': 'period',
  ';': 'semicolon',
  ':': 'semicolon',
  "'": 'quote',
  '"': 'quote',
  '[': 'bracketleft',
  '{': 'bracketleft',
  ']': 'bracketright',
  '}': 'bracketright',
  '`': 'backquote',
  '~': 'backquote',
  ' ': 'space',
};

const MODIFIER_KEYS = new Set(['Control', 'Meta', 'Alt', 'Shift', 'CapsLock']);

/** Canonical modifier order, so one chord has exactly one spelling. */
const MODIFIER_ORDER = ['mod', 'alt', 'shift'] as const;

function keyTokenFromEvent(event: KeyboardEvent): string | null {
  if (MODIFIER_KEYS.has(event.key)) return null;

  const code = event.code;
  if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
  if (/^Digit[0-9]$/.test(code)) return `digit${code.slice(5)}`;
  if (/^Numpad[0-9]$/.test(code)) return `numpad${code.slice(6)}`;
  if (/^F([1-9]|1[0-2])$/.test(code)) return code.toLowerCase();
  if (CODE_KEY_TOKENS[code]) return CODE_KEY_TOKENS[code];

  const key = event.key;
  if (key.length === 0) return null;
  if (CHAR_KEY_TOKENS[key]) return CHAR_KEY_TOKENS[key];
  if (/^[0-9]$/.test(key)) return `digit${key}`;
  return key.toLowerCase();
}

/**
 * Normalized chord for a keydown, or null when only modifiers are held.
 */
export function chordFromEvent(event: KeyboardEvent): string | null {
  const keyToken = keyTokenFromEvent(event);
  if (!keyToken) return null;

  const parts: string[] = [];
  if (event.metaKey || event.ctrlKey) parts.push('mod');
  if (event.altKey) parts.push('alt');
  if (event.shiftKey) parts.push('shift');
  parts.push(keyToken);
  return parts.join('+');
}

/**
 * Canonicalize a stored or user-entered chord. Returns null when the chord is
 * malformed, duplicates a modifier, or carries no non-modifier key.
 */
export function normalizeChord(raw: string): string | null {
  if (typeof raw !== 'string') return null;

  const segments = raw
    .split('+')
    .map((segment) => segment.trim().toLowerCase())
    .filter((segment) => segment.length > 0);
  if (segments.length === 0) return null;

  const modifiers = new Set<string>();
  let keyToken: string | null = null;

  for (const segment of segments) {
    if (segment === 'mod' || segment === 'cmd' || segment === 'ctrl' || segment === 'meta') {
      modifiers.add('mod');
      continue;
    }
    if (segment === 'alt' || segment === 'opt' || segment === 'option') {
      modifiers.add('alt');
      continue;
    }
    if (segment === 'shift') {
      modifiers.add('shift');
      continue;
    }
    // Two non-modifier keys in one chord is not a chord.
    if (keyToken !== null) return null;
    keyToken = segment;
  }

  if (!keyToken) return null;

  // Same aliasing as live events, so `mod+=` and `mod+equal` are one binding.
  if (CHAR_KEY_TOKENS[keyToken]) keyToken = CHAR_KEY_TOKENS[keyToken];
  else if (/^[0-9]$/.test(keyToken)) keyToken = `digit${keyToken}`;

  const ordered = MODIFIER_ORDER.filter((modifier) => modifiers.has(modifier));
  return [...ordered, keyToken].join('+');
}

const KEY_TOKEN_LABELS: Record<string, string> = {
  slash: '/',
  backslash: '\\',
  equal: '+',
  minus: '-',
  comma: ',',
  period: '.',
  semicolon: ';',
  quote: "'",
  bracketleft: '[',
  bracketright: ']',
  backquote: '`',
  space: 'Space',
  escape: 'Esc',
  enter: 'Enter',
  tab: 'Tab',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
};

function keyTokenLabel(token: string): string {
  if (KEY_TOKEN_LABELS[token]) return KEY_TOKEN_LABELS[token];
  const digit = /^digit([0-9])$/.exec(token);
  if (digit) return digit[1];
  const numpad = /^numpad([0-9])$/.exec(token);
  if (numpad) return `Num ${numpad[1]}`;
  return token.length === 1 ? token.toUpperCase() : token.toUpperCase();
}

/** Display labels for one chord, one entry per key cap. */
export function formatChord(chord: string, isMacLike: boolean): string[] {
  const normalized = normalizeChord(chord);
  if (!normalized) return [];

  return normalized.split('+').map((segment) => {
    if (segment === 'mod') return isMacLike ? 'Cmd' : 'Ctrl';
    if (segment === 'alt') return isMacLike ? 'Opt' : 'Alt';
    if (segment === 'shift') return 'Shift';
    return keyTokenLabel(segment);
  });
}

/**
 * First action bound to `chord`, scanned in registry order so resolution is
 * deterministic even when a conflicting override is still stored.
 */
export function resolveKeyboardAction(
  chord: string,
  bindings: KeyboardBindings
): KeyboardActionId | null {
  const normalized = normalizeChord(chord);
  if (!normalized) return null;

  for (const actionId of KEYBOARD_ACTION_IDS) {
    if (bindings[actionId]?.some((candidate) => candidate === normalized)) {
      return actionId;
    }
  }
  return null;
}

export interface BindingConflict {
  chord: string;
  actions: KeyboardActionId[];
}

/** Every chord claimed by more than one action. */
export function findBindingConflicts(bindings: KeyboardBindings): BindingConflict[] {
  const claims = new Map<string, KeyboardActionId[]>();

  for (const actionId of KEYBOARD_ACTION_IDS) {
    for (const chord of bindings[actionId] ?? []) {
      const normalized = normalizeChord(chord);
      if (!normalized) continue;
      const existing = claims.get(normalized);
      if (existing) {
        if (!existing.includes(actionId)) existing.push(actionId);
      } else {
        claims.set(normalized, [actionId]);
      }
    }
  }

  return [...claims.entries()]
    .filter(([, actions]) => actions.length > 1)
    .map(([chord, actions]) => ({ chord, actions }));
}

/**
 * Merge stored overrides onto defaults. Unknown actions, malformed chords, and
 * empty override lists fall back to the default binding rather than leaving an
 * action unreachable.
 */
export function mergeKeyboardBindings(overrides: unknown): KeyboardBindings {
  const merged = { ...DEFAULT_KEYBOARD_BINDINGS };
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
    return merged;
  }

  for (const [actionId, value] of Object.entries(overrides as Record<string, unknown>)) {
    if (!isKeyboardActionId(actionId)) continue;
    if (!Array.isArray(value)) continue;

    const chords: string[] = [];
    for (const candidate of value) {
      if (typeof candidate !== 'string') continue;
      const normalized = normalizeChord(candidate);
      if (normalized && !chords.includes(normalized)) chords.push(normalized);
    }
    if (chords.length > 0) merged[actionId] = chords;
  }

  return merged;
}

/** Only the actions that actually differ from their default. */
export function diffKeyboardBindings(bindings: KeyboardBindings): Partial<KeyboardBindings> {
  const overrides: Partial<KeyboardBindings> = {};
  for (const actionId of KEYBOARD_ACTION_IDS) {
    const current = bindings[actionId] ?? [];
    const fallback = DEFAULT_KEYBOARD_BINDINGS[actionId];
    const changed =
      current.length !== fallback.length ||
      current.some((chord, index) => chord !== fallback[index]);
    if (changed) overrides[actionId] = [...current];
  }
  return overrides;
}

export function loadKeyboardBindings(): KeyboardBindings {
  return mergeKeyboardBindings(
    readLocalStorageJson<unknown>(KEYBOARD_BINDINGS_STORAGE_KEY, null)
  );
}

/** Live listeners (the editor key handler) refresh on this event. */
export const KEYBOARD_BINDINGS_CHANGED_EVENT = 'flowmind:keyboard-bindings-changed';

function publishKeyboardBindingsChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(KEYBOARD_BINDINGS_CHANGED_EVENT));
}

export function saveKeyboardBindings(bindings: KeyboardBindings): void {
  const overrides = diffKeyboardBindings(bindings);
  if (Object.keys(overrides).length === 0) {
    removeLocalStorageKey(KEYBOARD_BINDINGS_STORAGE_KEY);
  } else {
    writeLocalStorageJson(KEYBOARD_BINDINGS_STORAGE_KEY, overrides);
  }
  publishKeyboardBindingsChanged();
}

export function resetKeyboardBindings(): KeyboardBindings {
  removeLocalStorageKey(KEYBOARD_BINDINGS_STORAGE_KEY);
  publishKeyboardBindingsChanged();
  return { ...DEFAULT_KEYBOARD_BINDINGS };
}
