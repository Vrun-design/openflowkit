// TS/JS import statements, found without regex backtracking: each pattern anchors on the specifier
// literal itself (`from 'x'`, `import 'x'`, `import('x')`, `require('x')`), so every scan is linear.
// A statement's line is its `import`/`export` keyword's, so multi-line clauses report where they start.
import { floor, lineStarts as lineStartsOf } from './lines';
import { stripComments } from './strip';
import type { RawImport } from './types';

export type { RawImport };

const FROM = /\bfrom\s*(['"])([^'"\n]*)\1/g;
const SIDE_EFFECT = /\bimport\s*(['"])([^'"\n]*)\1/g;
// `.` before means a method; `import x = require('y')` is the require half of this.
const CALL = /(?<![.\w$])(?:import|require)\s*\(\s*(['"])([^'"\n]*)\1\s*\)/g;
const KEYWORD = /\b(?:import|export)\b/g;

const MAX_TEXT = 160;
/** No real specifier is this long. */
const MAX_SPEC = 256;
/** How far back from `from` its `import`/`export` keyword may be: a clause longer than this is not an import list. */
const LOOK_BACK = 4000;

export function extractImports(content: string): RawImport[] {
  const code = stripComments(content);
  const lineStarts = lineStartsOf(code);
  // A statement starts a line or follows `;`/`{`/`}`: that keeps `"import x from 'y'"` inside a string out, yet `a;import x from 'y'` in.
  const startsStatement = (at: number): boolean => {
    let i = at - 1;
    while (i >= 0 && (code[i] === ' ' || code[i] === '\t')) i--;
    return i < 0 || code[i] === '\n' || code[i] === '\r' || code[i] === ';' || code[i] === '{' || code[i] === '}';
  };
  const keywords = Array.from(code.matchAll(KEYWORD), (m) => m.index).filter(startsStatement);
  // Quotes and `;` never sit inside an import clause, so one between a keyword and its `from` means the `from` is
  // prose in a string (or the keyword belongs to an earlier statement). Prefix counts make the check O(1).
  const barriers = new Int32Array(code.length + 1);
  for (let i = 0; i < code.length; i++) barriers[i + 1] = barriers[i]! + (/[;'"`]/.test(code[i]!) ? 1 : 0);
  const found: (RawImport & { at: number })[] = [];
  const add = (spec: string, start: number, end: number): void => {
    if (spec.length > MAX_SPEC) return;
    found.push({ spec, at: start, line: floor(lineStarts, start) + 1, text: code.slice(start, end).replace(/\s+/g, ' ').slice(0, MAX_TEXT) });
  };
  for (const m of code.matchAll(FROM)) {
    const keyword = keywords[floor(keywords, m.index)];
    if (keyword !== undefined && m.index - keyword <= LOOK_BACK && barriers[m.index]! === barriers[keyword]!) add(m[2]!, keyword, m.index + m[0].length);
  }
  for (const m of code.matchAll(SIDE_EFFECT)) if (startsStatement(m.index)) add(m[2]!, m.index, m.index + m[0].length);
  for (const m of code.matchAll(CALL)) add(m[2]!, m.index, m.index + m[0].length);
  // Position, then spec by code unit: deterministic whatever the locale.
  return found.sort((a, b) => a.at - b.at || (a.spec < b.spec ? -1 : a.spec > b.spec ? 1 : 0)).map(({ at: _at, ...raw }) => raw);
}

/** Languages this module reads. ponytail: `.astro`/`.vue`/`.svelte` script blocks are not scanned — upgrade path: extract the block, then run `extractImports`. */
export const TS_SOURCE = /\.(?:[cm]?[jt]sx?)$/;
