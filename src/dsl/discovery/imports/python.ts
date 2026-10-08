// Python import statements: `import a.b as x, c`, `from .m import (a,\n b)`, `from . import x`.
// Comments and strings are blanked first (line numbers kept) so docstrings and f-strings never hold imports.
import { floor, lineStarts, nextAt, positionsOf, statementText } from './lines';
import type { RawImport } from './types';

const blank = (text: string): string => text.replace(/[^\n]/g, ' ');

/** `#` comments, and ', ", ''' and """ strings of any prefix (f, r, b…) emptied to spaces. Escapes are honoured
 * so `'\''` ends where Python ends it.
 * ponytail: a nested same-quote f-string (3.12) can end a string early — upgrade path: a real tokenizer. */
export function stripPython(text: string): string {
  const out: string[] = [];
  let run = 0;
  let i = 0;
  while (i < text.length) {
    const c = text[i]!;
    if (c === '#') {
      let end = text.indexOf('\n', i);
      if (end < 0) end = text.length;
      out.push(text.slice(run, i), blank(text.slice(i, end)));
      run = i = end;
    } else if (c === '"' || c === "'") {
      const triple = text[i + 1] === c && text[i + 2] === c;
      const open = triple ? 3 : 1;
      let end = i + open;
      while (end < text.length) {
        if (text[end] === '\\') end += 2;
        else if (triple ? text[end] === c && text[end + 1] === c && text[end + 2] === c : text[end] === c || text[end] === '\n') break;
        else end++;
      }
      // An unterminated one-line string stops at the newline; a closing quote is blanked with it.
      const stop = Math.min(text.length, end + (text[end] === c ? open : 0));
      out.push(text.slice(run, i), blank(text.slice(i, stop)));
      run = i = stop;
    } else i++;
  }
  out.push(text.slice(run));
  return out.join('');
}

// Anchored at a line start. `[\w.]*` is the whole dotted (or dotted-relative) module, so no quantifier overlaps another.
// A statement starts a line or follows `;` / `:` (`import a; import b`, `try: import x`). The module is non-empty
// (`[\w.]+`) so the two whitespace runs around it can never match the same spaces: that overlap made `from` + 200k spaces cubic.
const IMPORT = /(?:^|[;:])[ \t]*import[ \t]+([^\n;]*)/gm;
const FROM = /(?:^|[;:])[ \t]*from[ \t]+([\w.]+)[ \t]+import\b[ \t]*/gm;
/** Longest module path a real import has; anything beyond is noise or an attack. */
const MAX_SPEC = 256;
const MAX_SEGMENTS = 32;
const plausible = (spec: string): boolean => spec.length <= MAX_SPEC && spec.split('.').length <= MAX_SEGMENTS;

export function extractPython(content: string): RawImport[] {
  const stripped = stripPython(content);
  // Line numbers come from the stripped text; matching runs on a copy where `\`-newline continuations are spaces (same offsets).
  const starts = lineStarts(stripped);
  const code = stripped.replace(/\\\n/g, '  ');
  const closers = positionsOf(code, ')');
  const found: RawImport[] = [];
  const lineOf = (offset: number): number => floor(starts, offset) + 1;
  for (const m of code.matchAll(IMPORT)) {
    const start = m.index + m[0].indexOf('import');
    const text = statementText(code, start, m.index + m[0].length);
    for (const part of m[1]!.split(',')) {
      const spec = /^\s*([\w.]+)/.exec(part)?.[1];
      if (spec && plausible(spec)) found.push({ spec, line: lineOf(start), text });
    }
  }
  const froms = [...code.matchAll(FROM)];
  froms.forEach((m, index) => {
    const start = m.index + m[0].indexOf('from');
    if (!plausible(m[1]!)) return;
    const after = m.index + m[0].length;
    let end: number;
    let body: string;
    if (code[after] === '(') {
      // An unclosed `(` ends at the next `from` statement, so a thousand of them cannot each swallow the file.
      const close = nextAt(closers, after);
      end = Math.min(close < 0 ? code.length : close, froms[index + 1]?.index ?? code.length);
      body = code.slice(after + 1, end);
    } else {
      const eol = code.indexOf('\n', after);
      end = eol < 0 ? code.length : eol;
      body = code.slice(after, end);
    }
    const names = body.split(',').map((part) => /^\s*(\w+|\*)/.exec(part)?.[1]).filter((n): n is string => n !== undefined);
    found.push({ spec: m[1]!, line: lineOf(start), text: statementText(code, start, end + 1), names });
  });
  return found.sort((a, b) => a.line - b.line || (a.spec < b.spec ? -1 : a.spec > b.spec ? 1 : 0));
}
