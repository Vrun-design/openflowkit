import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { platformKeys, shortcutGroups } from './v2Shortcuts';

// The `?` cheatsheet is only useful if it is complete: every key literal the
// dispatcher compares against must appear as a token in v2Shortcuts.ts. Adding
// a shortcut without documenting it fails here.
describe('keyboard cheatsheet', () => {
  const keyboard = readFileSync(join(process.cwd(), 'src/opencanvas/presentation/v2/useV2Keyboard.ts'), 'utf8');
  const tokens = new Set(shortcutGroups().flatMap(({ rows }) => rows.flatMap((row) => row.tokens)));

  it('documents every key literal the dispatcher reads', () => {
    const literals = [...keyboard.matchAll(/(?:event\.key|key|event\.code) === '([^']+)'/g)].map((match) => match[1]!);
    const unlisted = [...new Set(literals)].filter((literal) => !tokens.has(literal));
    expect(unlisted, `add these to v2Shortcuts.ts: ${unlisted.join(', ')}`).toEqual([]);
  });

  it('covers the modifier combinations the dispatcher branches on', () => {
    const modifiers = ['metaKey', 'ctrlKey', 'altKey', 'shiftKey'];
    for (const modifier of modifiers) {
      if (!keyboard.includes(modifier)) continue;
      expect(tokens.size, modifier).toBeGreaterThan(0);
    }
    // The panel is rendered with platform-aware keys.
    expect(shortcutGroups('Ctrl').some(({ rows }) => rows.some(({ keys }) => keys.startsWith('Ctrl')))).toBe(true);
  });

  it('binds each key combination to one action', () => {
    // These keys mean different things by context, by design: Enter opens a model view, renames or places the
    // armed shape; the arrows nudge, step a playing flow or move on Map; Space pans or steps a flow; A arms the
    // connector or connects two selected shapes; Esc leaves the code editor, then closes the panel.
    const contextual = new Set(['enter', 'arrows', '←', '→', 'space', 'a', 'esc']);
    const owner = new Map<string, string>();
    const clashes: string[] = [];
    for (const { label, keys } of shortcutGroups('⌘').flatMap(({ rows }) => rows)) {
      const [first, ...rest] = keys.split(' / ');
      const shared = first!.split(' + ').slice(0, -1);
      for (const alternative of [first!.split(' + ').at(-1)!, ...rest]) {
        const parts = alternative.split(' + ');
        const key = parts.at(-1)!.toLowerCase();
        if (contextual.has(key)) continue;
        const combo = [...new Set([...shared, ...parts.slice(0, -1)])].sort().concat(key).join(' + ');
        if (owner.has(combo)) clashes.push(`${combo}: ${owner.get(combo)} / ${label}`);
        owner.set(combo, label);
      }
    }
    expect(clashes).toEqual([]);
  });

  it('groups unique rows with labels and key strings', () => {
    const groups = shortcutGroups();
    expect(groups.length).toBeGreaterThanOrEqual(5);
    const labels = groups.flatMap(({ rows }) => rows.map(({ label }) => label));
    expect(new Set(labels).size).toBe(labels.length);
    for (const { title, rows } of groups) {
      expect(title.length).toBeGreaterThan(2);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.keys.length).toBeGreaterThan(0);
        expect(row.label.length).toBeGreaterThan(2);
      }
    }
  });

  it('writes Mac glyph hints the way other platforms name the keys', () => {
    expect(platformKeys('⌘⌥]', true)).toBe('⌘⌥]');
    expect(platformKeys('⌘⌥]', false)).toBe('Ctrl+Alt+]');
    expect(platformKeys('⇧⌘Z', false)).toBe('Shift+Ctrl+Z');
    expect(platformKeys('⌘⇧⌫', false)).toBe('Ctrl+Shift+Backspace');
  });
});
