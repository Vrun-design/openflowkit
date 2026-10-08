// Entry point: files in, import facts out. Pure — the caller reads the disk (or GitHub).
import { extractGo, createGoResolver } from './go';
import { dirOf } from './paths';
import { extractPython } from './python';
import { createPythonResolver } from './pythonResolve';
import { createResolver, type Resolution } from './resolve';
import { isSkippedSource } from './skip';
import { extractImports, TS_SOURCE } from './typescript';
import type { ExternalUse, ImportFact, ImportScan, RawImport, SourceFile, UnresolvedImport } from './types';

export { isSkippedSource };

const MAX_SCANNED = 1_000_000;

const countLines = (content: string): number => (content === '' ? 0 : content.split('\n').length - (content.endsWith('\n') ? 1 : 0));

/** One scanner per language: how to read statements, and how to resolve them against the whole file list. */
interface Language {
  test: RegExp;
  extract: (content: string) => RawImport[];
  resolver: (files: readonly SourceFile[]) => (from: string, raw: RawImport) => Resolution[];
}
const LANGUAGES: Language[] = [
  { test: TS_SOURCE, extract: extractImports, resolver: (files) => { const resolve = createResolver(files); return (from, raw) => [resolve(from, raw.spec)]; } },
  { test: /\.py$/, extract: extractPython, resolver: createPythonResolver },
  { test: /\.go$/, extract: extractGo, resolver: createGoResolver },
];

/**
 * Scans every non-skipped TS/JS, Python and Go file, but resolves against all of `files`: an import of a
 * generated or test file is not broken, it is just not on the map, so its edge is dropped.
 */
export function scanImports(files: readonly SourceFile[]): ImportScan {
  const resolvers = new Map<Language, ReturnType<Language['resolver']>>();
  const imports: ImportFact[] = [];
  const unresolved: UnresolvedImport[] = [];
  const externals: ExternalUse[] = [];
  const loc: Record<string, number> = {};
  for (const file of [...files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))) {
    const language = LANGUAGES.find((l) => l.test.test(file.path));
    if (!language || isSkippedSource(file.path)) continue;
    loc[file.path] = countLines(file.content);
    // ponytail: a file over 1 MB is bundled or data, not hand-written source — counted, not scanned; upgrade path: raise the cap.
    if (file.content.length > MAX_SCANNED) continue;
    if (!resolvers.has(language)) resolvers.set(language, language.resolver(files));
    const resolve = resolvers.get(language)!;
    const seen = new Set<string>();
    for (const raw of language.extract(file.content)) {
      for (const target of resolve(file.path, raw)) {
        if (target.kind === 'external') externals.push({ file: file.path, pkg: target.pkg, line: raw.line });
        else if (target.kind === 'unresolved') unresolved.push({ from: file.path, line: raw.line, text: raw.text, spec: raw.spec });
        else if (target.kind === 'file' || target.kind === 'dir') {
          // A folder edge into a skipped folder (`vendor/x`, `testdata`) is as off-map as a skipped file; probe with a file name.
          if (target.to === file.path || (target.kind === 'file' ? isSkippedSource(target.to) : target.to === dirOf(file.path) || isSkippedSource(`${target.to}/_`))) continue;
          const key = `${raw.line}\u0000${target.to}`;
          if (seen.has(key)) continue;
          seen.add(key);
          imports.push({ from: file.path, to: target.to, line: raw.line, text: raw.text, ...(target.kind === 'dir' ? { toKind: 'dir' as const } : {}) });
        }
      }
    }
  }
  return { imports, unresolved, externals, loc };
}
