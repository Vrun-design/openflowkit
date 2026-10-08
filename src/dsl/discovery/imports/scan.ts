// Entry point: files in, import facts out. Pure — the caller reads the disk (or GitHub).
import { createResolver } from './resolve';
import { isSkippedSource } from './skip';
import { extractImports, TS_SOURCE } from './typescript';
import type { ExternalUse, ImportFact, ImportScan, SourceFile, UnresolvedImport } from './types';

export { isSkippedSource };

const MAX_SCANNED = 1_000_000;

const countLines = (content: string): number => (content === '' ? 0 : content.split('\n').length - (content.endsWith('\n') ? 1 : 0));

/**
 * Scans every non-skipped TS/JS file, but resolves against all of `files`: an import of a
 * generated or test file is not broken, it is just not on the map, so its edge is dropped.
 */
export function scanImports(files: readonly SourceFile[]): ImportScan {
  const resolve = createResolver(files);
  const imports: ImportFact[] = [];
  const unresolved: UnresolvedImport[] = [];
  const externals: ExternalUse[] = [];
  const loc: Record<string, number> = {};
  for (const file of [...files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))) {
    if (!TS_SOURCE.test(file.path) || isSkippedSource(file.path)) continue;
    loc[file.path] = countLines(file.content);
    // ponytail: a file over 1 MB is bundled or data, not hand-written source — counted, not scanned; upgrade path: raise the cap.
    if (file.content.length > MAX_SCANNED) continue;
    for (const raw of extractImports(file.content)) {
      const target = resolve(file.path, raw.spec);
      if (target.kind === 'external') externals.push({ file: file.path, pkg: target.pkg, line: raw.line });
      else if (target.kind === 'unresolved') unresolved.push({ from: file.path, line: raw.line, text: raw.text, spec: raw.spec });
      else if (target.kind === 'file' || target.kind === 'dir') {
        if (target.to === file.path || (target.kind === 'file' && isSkippedSource(target.to))) continue;
        imports.push({ from: file.path, to: target.to, line: raw.line, text: raw.text, ...(target.kind === 'dir' ? { toKind: 'dir' as const } : {}) });
      }
    }
  }
  return { imports, unresolved, externals, loc };
}
