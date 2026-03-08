import { describe, expect, it } from 'vitest';
import { getKeyboardShortcuts, isMacLikePlatform } from './constants';

describe('getKeyboardShortcuts', () => {
  it('returns mac-style labels when requested', () => {
    const shortcuts = getKeyboardShortcuts(true);

    expect(shortcuts[0].items[0].keys).toEqual(['Cmd', 'Z']);
    expect(shortcuts[0].items[3].keys).toEqual(['Delete']);
    expect(shortcuts[1].items[3].keys).toEqual(['Opt', 'Drag']);
  });

  it('returns non-mac labels when requested', () => {
    const shortcuts = getKeyboardShortcuts(false);

    expect(shortcuts[0].items[0].keys).toEqual(['Ctrl', 'Z']);
    expect(shortcuts[0].items[3].keys).toEqual(['Backspace']);
    expect(shortcuts[1].items[3].keys).toEqual(['Alt', 'Drag']);
  });

  it('detects mac-like platforms', () => {
    expect(isMacLikePlatform('MacIntel')).toBe(true);
    expect(isMacLikePlatform('iPhone')).toBe(true);
    expect(isMacLikePlatform('Win32')).toBe(false);
  });
});
