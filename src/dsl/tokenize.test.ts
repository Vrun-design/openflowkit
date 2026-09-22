import { describe, expect, it } from 'vitest';
import { MAX_DSL_LINES, tokenize } from './tokenize';

describe('tokenize', () => {
  it('tracks quoted strings, arrows, punctuation, and comments', () => {
    const result = tokenize('"API // Gateway" --> DB : reads // comment');
    expect(result.tokens.map(({ kind, value, col }) => ({ kind, value, col }))).toEqual([
      { kind: 'string', value: 'API // Gateway', col: 1 },
      { kind: 'arrow', value: '-->', col: 18 },
      { kind: 'word', value: 'DB', col: 22 },
      { kind: 'punctuation', value: ':', col: 25 },
      { kind: 'word', value: 'reads', col: 27 },
      { kind: 'comment', value: 'comment', col: 33 },
    ]);
  });

  it('reports unterminated strings without throwing', () => {
    expect(tokenize('A -> "broken').diagnostics).toMatchObject([{ code: 'W102', line: 1, col: 6 }]);
  });

  it('keeps URLs in one word; a comment needs a space before //', () => {
    const result = tokenize('Docs [link: https://example.com/adr/1] // note');
    expect(result.tokens.map(({ kind, value }) => ({ kind, value }))).toEqual([
      { kind: 'word', value: 'Docs' },
      { kind: 'punctuation', value: '[' },
      { kind: 'word', value: 'link' },
      { kind: 'punctuation', value: ':' },
      { kind: 'word', value: 'https://example.com/adr/1' },
      { kind: 'punctuation', value: ']' },
      { kind: 'comment', value: 'note' },
    ]);
    expect(tokenize('A//nospace').tokens[0]).toMatchObject({ kind: 'word', value: 'A//nospace' });
  });

  it('bounds work at 20,000 lines', () => {
    const result = tokenize(Array.from({ length: MAX_DSL_LINES + 1 }, () => 'A').join('\n'));
    expect(result.tokens).toHaveLength(MAX_DSL_LINES);
    expect(result.diagnostics.at(-1)?.code).toBe('E002');
  });
});
