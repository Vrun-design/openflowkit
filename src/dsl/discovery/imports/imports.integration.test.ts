// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { scanImports } from './scan';
import type { SourceFile } from './types';

// This repo is the corpus: the prototype extractor (docs/plan/prototypes/repo-map) found 2,282 resolved
// imports over the same roots. Config files ride along because resolution reads them.
const ROOT = process.cwd();
const ROOTS = ['src', 'mcp-server/src', 'worker', 'action', 'docs-site'];
const WANTED = /\.(?:[cm]?[jt]sx?)$|(?:^|\/)(?:package|tsconfig[\w.-]*|jsconfig)\.json$/;

function walk(dir: string, out: SourceFile[]): SourceFile[] {
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && !entry.name.startsWith('.')) walk(path, out);
    } else if (WANTED.test(path)) out.push({ path, content: readFileSync(join(ROOT, path), 'utf8') });
  }
  return out;
}

describe('scanImports on this repo', () => {
  it('finds thousands of imports and resolves nearly every relative one', () => {
    const files = ROOTS.reduce((all, root) => walk(root, all), ['package.json', 'tsconfig.json'].map((path) => ({ path, content: readFileSync(join(ROOT, path), 'utf8') })));
    const scan = scanImports(files);
    const relative = scan.imports.filter((i) => /^\./.test(i.text.match(/['"]([^'"]+)['"]/)?.[1] ?? '')).length;
    const unresolvedRelative = scan.unresolved.filter((u) => u.spec.startsWith('.'));
    const rate = unresolvedRelative.length / (relative + unresolvedRelative.length);
    const log = (line: string) => { if (process.env.IMPORTS_LOG) process.stdout.write(`${line}\n`); };
    log(`imports ${scan.imports.length} (dir ${scan.imports.filter((i) => i.toKind).length}), unresolved ${scan.unresolved.length}, relative unresolved ${unresolvedRelative.length}/${relative + unresolvedRelative.length} = ${(rate * 100).toFixed(2)}%, externals ${scan.externals.length} over ${new Set(scan.externals.map((e) => e.pkg)).size} packages, files ${Object.keys(scan.loc).length}`);
    log(scan.unresolved.slice(0, 25).map((u) => `${u.from}:${u.line} ${u.text}`).join('\n'));
    expect(scan.imports.length).toBeGreaterThan(2000);
    expect(rate).toBeLessThan(0.01);
    // Deterministic: sorted by path then line.
    const keys = scan.imports.map((i) => `${i.from}\u0000${String(i.line).padStart(8, '0')}`);
    expect(keys).toEqual([...keys].sort());
  });
});
