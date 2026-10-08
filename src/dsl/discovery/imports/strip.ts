// Blanks comments (and template-literal bodies) with spaces so import patterns can run over the
// whole file while every character keeps its offset and every newline its place: line numbers survive.

const blank = (text: string): string => text.replace(/[^\n]/g, ' ');

/**
 * Strings are copied through untouched, so `'//cdn'` is not a comment and the specifier survives.
 * Template bodies are blanked too: code samples inside them would otherwise read as real imports.
 * ponytail: a regex literal holding a quote or backtick (`/`/g`) can open a phantom string — strings end at
 * the line, but a phantom template swallows code until the next backtick — upgrade path: a real tokenizer.
 */
export function stripComments(text: string, templates = true): string {
  const out: string[] = [];
  let run = 0;
  let i = 0;
  while (i < text.length) {
    const c = text[i]!;
    const next = text[i + 1];
    if (c === '/' && next === '/') {
      let end = text.indexOf('\n', i);
      if (end < 0) end = text.length;
      out.push(text.slice(run, i), blank(text.slice(i, end)));
      run = i = end;
    } else if (c === '/' && next === '*') {
      let end = text.indexOf('*/', i + 2);
      end = end < 0 ? text.length : end + 2;
      out.push(text.slice(run, i), blank(text.slice(i, end)));
      run = i = end;
    } else if (c === '"' || c === "'") {
      i++;
      while (i < text.length && text[i] !== c && text[i] !== '\n') i += text[i] === '\\' ? 2 : 1;
      i++;
    } else if (c === '`' && templates) {
      let end = i + 1;
      while (end < text.length && text[end] !== '`') end += text[end] === '\\' ? 2 : 1;
      out.push(text.slice(run, i + 1), blank(text.slice(i + 1, end)));
      run = end;
      i = end + 1;
    } else i++;
  }
  out.push(text.slice(run));
  return out.join('');
}
