import { describe, expect, it } from 'vitest';
import { stripComments } from './strip';

describe('stripComments', () => {
  it('blanks line and block comments but keeps every newline', () => {
    const source = "a // x\n/* y\nz */ b\n";
    const out = stripComments(source);
    expect(out).toHaveLength(source.length);
    expect(out.split('\n')).toHaveLength(4);
    expect(out).not.toMatch(/[xyz]/);
  });

  it('leaves comment markers inside strings alone', () => {
    expect(stripComments("import x from 'http://a//b'; // gone")).toBe("import x from 'http://a//b';        ");
  });

  it('blanks template bodies, and not code after an escaped backtick', () => {
    const out = stripComments("const s = `import a from 'x'\\``; import b from 'y';");
    expect(out).not.toContain("'x'");
    expect(out).toContain("import b from 'y'");
  });

  it('keeps backticks as code in JSONC mode', () => {
    expect(stripComments('{"a": "`", /* c */ "b": 1}', false)).toBe(`{"a": "\`",${' '.repeat(9)}"b": 1}`);
  });
});
