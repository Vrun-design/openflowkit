// Go imports and what they point at. Go imports packages (folders), so every local edge is a `dir` edge.
import { floor, lineStarts, nextAt, positionsOf, statementText } from './lines';
import { dirOf, joinPath } from './paths';
import type { Resolution } from './resolve';
import { isSkippedSource } from './skip';
import type { RawImport, SourceFile } from './types';

const blank = (text: string): string => text.replace(/[^\n]/g, ' ');

/** Comments out, raw-string bodies out; interpreted strings stay because an import path is one.
 * Rune literals are skipped whole so `'"'` does not open a string. */
export function stripGo(text: string): string {
  const out: string[] = [];
  let run = 0;
  let i = 0;
  while (i < text.length) {
    const c = text[i]!;
    const next = text[i + 1];
    let end = -1;
    let keep = 0;
    if (c === '/' && next === '/') end = text.indexOf('\n', i) < 0 ? text.length : text.indexOf('\n', i);
    else if (c === '/' && next === '*') end = text.indexOf('*/', i + 2) < 0 ? text.length : text.indexOf('*/', i + 2) + 2;
    else if (c === '`') { end = text.indexOf('`', i + 1) < 0 ? text.length : text.indexOf('`', i + 1); keep = 1; }
    else if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < text.length && text[j] !== c && text[j] !== '\n') j += text[j] === '\\' ? 2 : 1;
      i = j + 1;
      continue;
    }
    if (end < 0) { i++; continue; }
    // A raw string keeps its backticks so what follows still parses; comments vanish whole.
    out.push(text.slice(run, i + keep), blank(text.slice(i + keep, end)));
    run = end;
    i = end + (keep ? 1 : 0);
  }
  out.push(text.slice(run));
  return out.join('');
}

// `import "x"`, `import alias "x"`, and the opening of `import (`; anchored on literals, no nested quantifiers.
/** No real import path is this long, and a go.mod bigger than any real one is not parsed. */
const MAX_SPEC = 256;
const MAX_GO_MOD = 200_000;
const IMPORT = /^[ \t]*import[ \t]*(?:(\()|(?:[\w.]+[ \t]+)?"([^"\n]*)")/gm;
const ENTRY = /^[ \t]*(?:[\w.]+[ \t]+)?"([^"\n]*)"/;

export function extractGo(content: string): RawImport[] {
  const code = stripGo(content);
  const starts = lineStarts(code);
  const closers = positionsOf(code, ')');
  const found: RawImport[] = [];
  const imports = [...code.matchAll(IMPORT)];
  imports.forEach((m, index) => {
    const start = m.index + m[0].search(/\S/);
    const line = floor(starts, start) + 1;
    if (m[2] !== undefined) { if (m[2].length <= MAX_SPEC) found.push({ spec: m[2], line, text: statementText(code, start, m.index + m[0].length) }); return; }
    const open = m.index + m[0].length;
    // An unclosed `(` ends at the next import statement, so a thousand of them cannot each swallow the file.
    const close = Math.min(nextAt(closers, open) < 0 ? code.length : nextAt(closers, open), imports[index + 1]?.index ?? code.length);
    // Entries split on newlines, and on `;` for the one-line `import ("a"; "b")`.
    const entries = code.slice(open, close).split(/[\n;]/);
    let offset = open;
    for (const entry of entries) {
      const spec = ENTRY.exec(entry)?.[1];
      if (spec !== undefined && spec.length <= MAX_SPEC) found.push({ spec, line: floor(starts, offset) + 1, text: statementText(entry, 0, entry.length) });
      offset += entry.length + 1;
    }
  });
  return found.sort((a, b) => a.line - b.line || (a.spec < b.spec ? -1 : a.spec > b.spec ? 1 : 0));
}

interface GoModule {
  path: string;
  dir: string;
  /** `replace x => ../local`: module path → folder. */
  replaces: { path: string; dir: string }[];
  /** Modules this one requires: an import under one of these that is not in the repo is a dependency, not a broken path. */
  requires: string[];
}

function parseGoMod(file: SourceFile): GoModule | undefined {
  const path = /^module[ \t]+"?([^\s"]+)/m.exec(file.content)?.[1];
  if (!path) return undefined;
  const dir = dirOf(file.path);
  const replaces: GoModule['replaces'] = [];
  for (const line of file.content.split('\n')) {
    const m = /^[ \t]*(?:replace[ \t]+)?([^\s=]+)(?:[ \t]+v[^\s=]+)?[ \t]*=>[ \t]*(\.{1,2}(?:\/[^\s]*)?)/.exec(line);
    if (m) replaces.push({ path: m[1]!, dir: joinPath(dir, m[2]!) });
  }
  const requires = [...file.content.matchAll(/^[ \t]*(?:require[ \t]+)?([^\s(]+)[ \t]+v\d[^\s]*/gm)].map((m) => m[1]!);
  return { path, dir, replaces, requires };
}

/** `github.com/o/r/sub` → `github.com/o/r`; `golang.org/x/net/http2` → `golang.org/x`; `gopkg.in/yaml.v3/x` → `gopkg.in/yaml.v3`. */
function externalName(spec: string): string {
  const segments = spec.split('/');
  const host = segments.findIndex((s) => s.includes('.'));
  return segments.slice(0, host < 0 ? 1 : segments[host] === 'github.com' ? host + 3 : host + 2).join('/');
}

export function createGoResolver(files: readonly SourceFile[]): (from: string, raw: RawImport) => Resolution[] {
  const modules = new Map<string, GoModule>();
  const goDirs = new Set<string>();
  for (const file of files) {
    if (file.path.endsWith('.go')) goDirs.add(dirOf(file.path));
    else if ((file.path === 'go.mod' || file.path.endsWith('/go.mod')) && file.content.length <= MAX_GO_MOD) {
      const parsed = parseGoMod(file);
      if (parsed) modules.set(parsed.dir, parsed);
    }
  }
  const all = [...modules.values()].sort((a, b) => (a.dir < b.dir ? -1 : 1));
  return (from, raw) => {
    const spec = raw.spec;
    // The nearest go.mod governs: its `replace` lines apply, others' do not.
    let governing: GoModule | undefined;
    for (let d = dirOf(from); !governing; d = dirOf(d)) { governing = modules.get(d); if (d === '') break; }
    const candidates = [...all.map((m) => ({ path: m.path, dir: m.dir })), ...(governing?.replaces ?? [])]
      .filter((c) => spec === c.path || spec.startsWith(`${c.path}/`))
      .sort((a, b) => b.path.length - a.path.length);
    const hit = candidates[0];
    if (hit) {
      const dir = joinPath(hit.dir, spec.slice(hit.path.length + 1));
      if (goDirs.has(dir)) return [{ kind: 'dir', to: dir }];
      // Not in the repo: a required module that shares the prefix (`gitea.dev/actionslib` under `gitea.dev`) is a dependency;
      // a path through a skipped folder is off the map; anything else is broken.
      const required = (governing?.requires ?? []).filter((r) => spec === r || spec.startsWith(`${r}/`)).sort((a, b) => b.length - a.length)[0];
      if (required) return [{ kind: 'external', pkg: externalName(required) }];
      return [isSkippedSource(`${dir}/_`) ? { kind: 'ignore' } : { kind: 'unresolved' }];
    }
    // No dot in the first element: standard library (`fmt`, `net/http`, `C`).
    return spec.split('/')[0]!.includes('.') ? [{ kind: 'external', pkg: externalName(spec) }] : [{ kind: 'ignore' }];
  };
}
