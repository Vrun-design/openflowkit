import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// A browser forgives an unclosed block by nesting the rest of the file inside it: one missing `}` after an
// `@media (pointer: fine)` hid every later rule from phones (2026-10-10). Count braces strictly so it fails here.
const sheets = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
  entry.isDirectory() ? sheets(join(dir, entry.name)) : entry.name.endsWith('.css') ? [join(dir, entry.name)] : []);

/** Depth left open at the end (comments and strings stripped); -1 if a `}` closes nothing. */
function openBlocks(css: string): number {
  let depth = 0;
  for (const char of css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '')) {
    if (char === '{') depth += 1;
    else if (char === '}' && --depth < 0) return -1;
  }
  return depth;
}

describe('stylesheets', () => {
  it('counts an unclosed @media as open, and strings or comments as nothing', () => {
    expect(openBlocks("@media (pointer: fine) { .a { b: c; }\n.d { e: f; }")).toBe(1);
    expect(openBlocks(".a { content: '{'; } /* { */")).toBe(0);
  });
  it.each(sheets(__dirname))('%s closes every block', (file) => {
    expect(openBlocks(readFileSync(file, 'utf8'))).toBe(0);
  });
});
