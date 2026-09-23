import { describe, expect, it } from 'vitest';
import { parseInline, parseMarkdown } from './assistantMarkdown';

describe('assistant markdown', () => {
  it('reads the inline marks replies use, and only http links', () => {
    expect(parseInline('Use **bold**, *em*, `code` and [docs](https://x.dev) — not [x](javascript:alert(1))')).toEqual([
      { kind: 'text', text: 'Use ' }, { kind: 'strong', text: 'bold' }, { kind: 'text', text: ', ' },
      { kind: 'em', text: 'em' }, { kind: 'text', text: ', ' }, { kind: 'code', text: 'code' },
      { kind: 'text', text: ' and ' }, { kind: 'link', text: 'docs', href: 'https://x.dev' },
      { kind: 'text', text: ' — not [x](javascript:alert(1))' },
    ]);
  });

  it('splits headings, lists, fences and paragraphs', () => {
    const blocks = parseMarkdown('## Plan\nFirst line\nsecond line\n\n- one\n- two\n1. a\n2. b\n```ts\nconst x = 1;\n```\nend');
    expect(blocks.map(({ kind }) => kind)).toEqual(['h', 'p', 'ul', 'ol', 'pre', 'p']);
    expect(blocks[1]).toEqual({ kind: 'p', lines: [[{ kind: 'text', text: 'First line' }], [{ kind: 'text', text: 'second line' }]] });
    expect(blocks[4]).toEqual({ kind: 'pre', lang: 'ts', text: 'const x = 1;' });
  });

  it('keeps an unterminated fence as code while it streams', () => {
    expect(parseMarkdown('```\npartial')).toEqual([{ kind: 'pre', lang: '', text: 'partial' }]);
  });
});
