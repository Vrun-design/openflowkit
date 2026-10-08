import { describe, expect, it } from 'vitest';
import { attributeText } from './text';
import { tokenize } from './tokenize';

describe('attributeText', () => {
  it('quotes a value with a line break so it stays one attribute on one line', () => {
    for (const value of ['a\nb', 'a\rb', 'a\r\nb']) {
      const text = attributeText([{ key: 'note', value }]);
      expect(text).not.toMatch(/[\r\n]/);
      expect(text).toMatch(/^ \[note: ".*"\]$/);
    }
    expect(attributeText([{ key: 'note', value: 'x\ny' }, { key: 'k', value: 'v' }])).toBe(' [note: "x\\ny", k: v]');
  });

  // CR folds to \n: a `\r` escape would change hand-written text like "C:\root".
  it('round-trips a line break through the tokenizer as one string and no extra line', () => {
    for (const value of ['a\nb', 'a\rb', 'a\r\nb']) {
      const strings = tokenize(`n${attributeText([{ key: 'note', value }])}`).tokens.filter((token) => token.kind === 'string');
      expect(strings.map((token) => token.value)).toEqual(['a\nb']);
    }
  });

  it('keeps a hand-written backslash-r as written', () => {
    const strings = tokenize('n [path: "C:\\root"]').tokens.filter((token) => token.kind === 'string');
    expect(strings.map((token) => token.value)).toEqual(['C:\\root']);
  });
});
