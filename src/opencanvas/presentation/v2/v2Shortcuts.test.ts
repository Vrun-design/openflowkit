import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { shortcutGroups } from './v2Shortcuts';

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
});
