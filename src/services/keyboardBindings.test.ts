import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_KEYBOARD_BINDINGS,
  KEYBOARD_ACTION_IDS,
  KEYBOARD_ACTION_LABEL_KEYS,
  KEYBOARD_BINDINGS_STORAGE_KEY,
  chordFromEvent,
  diffKeyboardBindings,
  findBindingConflicts,
  formatChord,
  loadKeyboardBindings,
  mergeKeyboardBindings,
  normalizeChord,
  resetKeyboardBindings,
  resolveKeyboardAction,
  saveKeyboardBindings,
  type KeyboardBindings,
} from './keyboardBindings';

function keyEvent(init: KeyboardEventInit & { code?: string }): KeyboardEvent {
  return new KeyboardEvent('keydown', init);
}

describe('chordFromEvent', () => {
  it('reads the physical key so modifiers cannot rewrite the chord', () => {
    // Shift+1 reports key '!', Ctrl+= reports key '+'.
    expect(chordFromEvent(keyEvent({ key: '!', code: 'Digit1', shiftKey: true }))).toBe(
      'shift+digit1'
    );
    expect(chordFromEvent(keyEvent({ key: '+', code: 'Equal', ctrlKey: true }))).toBe('mod+equal');
    expect(chordFromEvent(keyEvent({ key: '?', code: 'Slash', shiftKey: true }))).toBe(
      'shift+slash'
    );
  });

  it('treats Cmd and Ctrl as one `mod` modifier', () => {
    expect(chordFromEvent(keyEvent({ key: 'k', code: 'KeyK', metaKey: true }))).toBe('mod+k');
    expect(chordFromEvent(keyEvent({ key: 'k', code: 'KeyK', ctrlKey: true }))).toBe('mod+k');
  });

  it('orders modifiers canonically regardless of press order', () => {
    expect(
      chordFromEvent(keyEvent({ key: 'c', code: 'KeyC', shiftKey: true, altKey: true, metaKey: true }))
    ).toBe('mod+alt+shift+c');
  });

  it('returns null while only modifiers are held', () => {
    expect(chordFromEvent(keyEvent({ key: 'Shift', code: 'ShiftLeft', shiftKey: true }))).toBeNull();
    expect(chordFromEvent(keyEvent({ key: 'Meta', code: 'MetaLeft', metaKey: true }))).toBeNull();
  });
});

describe('normalizeChord', () => {
  it('accepts platform modifier aliases and canonicalizes order', () => {
    expect(normalizeChord('Cmd+K')).toBe('mod+k');
    expect(normalizeChord('ctrl+k')).toBe('mod+k');
    expect(normalizeChord('shift + Alt + mod + z')).toBe('mod+alt+shift+z');
  });

  it('rejects chords with no key or with two keys', () => {
    expect(normalizeChord('mod+shift')).toBeNull();
    expect(normalizeChord('')).toBeNull();
    expect(normalizeChord('+++')).toBeNull();
    expect(normalizeChord('mod+k+j')).toBeNull();
  });

  it('collapses duplicate modifiers', () => {
    expect(normalizeChord('mod+cmd+ctrl+k')).toBe('mod+k');
  });
});

describe('formatChord', () => {
  it('labels the primary modifier per platform', () => {
    expect(formatChord('mod+alt+c', true)).toEqual(['Cmd', 'Opt', 'C']);
    expect(formatChord('mod+alt+c', false)).toEqual(['Ctrl', 'Alt', 'C']);
  });

  it('labels physical key tokens as printed key caps', () => {
    expect(formatChord('shift+digit1', true)).toEqual(['Shift', '1']);
    expect(formatChord('shift+slash', true)).toEqual(['Shift', '/']);
    expect(formatChord('mod+equal', true)).toEqual(['Cmd', '+']);
    expect(formatChord('mod+minus', true)).toEqual(['Cmd', '-']);
  });

  it('returns nothing for a malformed chord', () => {
    expect(formatChord('mod+shift', true)).toEqual([]);
  });
});

describe('resolveKeyboardAction', () => {
  it('resolves defaults, including alternate chords', () => {
    expect(resolveKeyboardAction('mod+k', DEFAULT_KEYBOARD_BINDINGS)).toBe('commandBar');
    expect(resolveKeyboardAction('mod+shift+z', DEFAULT_KEYBOARD_BINDINGS)).toBe('redo');
    expect(resolveKeyboardAction('mod+y', DEFAULT_KEYBOARD_BINDINGS)).toBe('redo');
  });

  it('accepts an unnormalized chord', () => {
    expect(resolveKeyboardAction('Cmd+K', DEFAULT_KEYBOARD_BINDINGS)).toBe('commandBar');
  });

  it('returns null for an unbound or malformed chord', () => {
    expect(resolveKeyboardAction('mod+shift+q', DEFAULT_KEYBOARD_BINDINGS)).toBeNull();
    expect(resolveKeyboardAction('mod+shift', DEFAULT_KEYBOARD_BINDINGS)).toBeNull();
  });

  it('every default chord resolves back to its own action', () => {
    for (const actionId of KEYBOARD_ACTION_IDS) {
      for (const chord of DEFAULT_KEYBOARD_BINDINGS[actionId]) {
        expect(resolveKeyboardAction(chord, DEFAULT_KEYBOARD_BINDINGS)).toBe(actionId);
      }
    }
  });
});

describe('findBindingConflicts', () => {
  it('reports no conflict among shipped defaults', () => {
    expect(findBindingConflicts(DEFAULT_KEYBOARD_BINDINGS)).toEqual([]);
  });

  it('reports a chord claimed by two actions', () => {
    const conflicted: KeyboardBindings = {
      ...DEFAULT_KEYBOARD_BINDINGS,
      search: ['mod+k'],
    };
    expect(findBindingConflicts(conflicted)).toEqual([
      { chord: 'mod+k', actions: ['commandBar', 'search'] },
    ]);
  });
});

describe('mergeKeyboardBindings', () => {
  it('falls back to defaults for corrupt, empty, or unknown input', () => {
    expect(mergeKeyboardBindings(null)).toEqual(DEFAULT_KEYBOARD_BINDINGS);
    expect(mergeKeyboardBindings('nonsense')).toEqual(DEFAULT_KEYBOARD_BINDINGS);
    expect(mergeKeyboardBindings([])).toEqual(DEFAULT_KEYBOARD_BINDINGS);
    expect(mergeKeyboardBindings({ notAnAction: ['mod+q'] })).toEqual(DEFAULT_KEYBOARD_BINDINGS);
  });

  it('never leaves an action unreachable when its override is unusable', () => {
    const merged = mergeKeyboardBindings({ undo: [], redo: ['mod+shift'], copy: [42] });
    expect(merged.undo).toEqual(DEFAULT_KEYBOARD_BINDINGS.undo);
    expect(merged.redo).toEqual(DEFAULT_KEYBOARD_BINDINGS.redo);
    expect(merged.copy).toEqual(DEFAULT_KEYBOARD_BINDINGS.copy);
  });

  it('applies and normalizes a valid override, dropping duplicates', () => {
    const merged = mergeKeyboardBindings({ commandBar: ['Ctrl+Shift+P', 'mod+shift+p'] });
    expect(merged.commandBar).toEqual(['mod+shift+p']);
    expect(merged.search).toEqual(DEFAULT_KEYBOARD_BINDINGS.search);
  });
});

describe('persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores only the actions that differ from default', () => {
    saveKeyboardBindings({ ...DEFAULT_KEYBOARD_BINDINGS, panMode: ['mod+shift+h'] });

    const stored = JSON.parse(localStorage.getItem(KEYBOARD_BINDINGS_STORAGE_KEY) ?? '{}');
    expect(stored).toEqual({ panMode: ['mod+shift+h'] });
    expect(loadKeyboardBindings().panMode).toEqual(['mod+shift+h']);
    expect(loadKeyboardBindings().selectMode).toEqual(DEFAULT_KEYBOARD_BINDINGS.selectMode);
  });

  it('clears storage when every binding matches default', () => {
    saveKeyboardBindings({ ...DEFAULT_KEYBOARD_BINDINGS, panMode: ['mod+shift+h'] });
    saveKeyboardBindings(DEFAULT_KEYBOARD_BINDINGS);
    expect(localStorage.getItem(KEYBOARD_BINDINGS_STORAGE_KEY)).toBeNull();
  });

  it('recovers defaults from corrupt stored JSON', () => {
    localStorage.setItem(KEYBOARD_BINDINGS_STORAGE_KEY, '{not json');
    expect(loadKeyboardBindings()).toEqual(DEFAULT_KEYBOARD_BINDINGS);
  });

  it('reset removes overrides and returns defaults', () => {
    saveKeyboardBindings({ ...DEFAULT_KEYBOARD_BINDINGS, panMode: ['mod+shift+h'] });
    expect(resetKeyboardBindings()).toEqual(DEFAULT_KEYBOARD_BINDINGS);
    expect(localStorage.getItem(KEYBOARD_BINDINGS_STORAGE_KEY)).toBeNull();
  });

  it('diff reports nothing for untouched defaults', () => {
    expect(diffKeyboardBindings(DEFAULT_KEYBOARD_BINDINGS)).toEqual({});
  });
});

describe('registry completeness', () => {
  it('gives every action a localized label key', () => {
    for (const actionId of KEYBOARD_ACTION_IDS) {
      expect(KEYBOARD_ACTION_LABEL_KEYS[actionId]).toBeTruthy();
    }
  });
});
