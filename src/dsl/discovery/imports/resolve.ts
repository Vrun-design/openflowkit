// What an import specifier points at: a file in the scan, a workspace package's folder,
// an external package, or nothing. Mirrors TypeScript's order: relative, `paths`, `baseUrl`, then packages.
import { loadConfigs, type WorkspacePackage } from './config';
import { dirOf, joinPath, matchStar } from './paths';
import { isSkippedSource } from './skip';
import type { SourceFile } from './types';

export type Resolution =
  | { kind: 'file'; to: string }
  | { kind: 'dir'; to: string }
  | { kind: 'external'; pkg: string }
  | { kind: 'unresolved' }
  /** Builtins, URLs, assets: not a dependency the map draws. */
  | { kind: 'ignore' };

const CODE_EXT = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'];
/** TypeScript writes `./a.js` for `a.ts`. */
const JS_TO_TS: Record<string, string[]> = { '.js': ['.ts', '.tsx'], '.jsx': ['.tsx'], '.mjs': ['.mts'], '.cjs': ['.cts'] };
/** Not code: a missing one is not a broken import, and a present one is not a node. */
const ASSET = /\.(?:css|scss|sass|less|svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|mp[34]|webm|wasm|html|mdx?|txt|csv|json|ya?ml)$/i;
const FRAMEWORK = /\.(?:astro|vue|svelte)$/;
const BUILTINS = new Set(['assert', 'async_hooks', 'buffer', 'child_process', 'cluster', 'console', 'constants', 'crypto', 'dgram', 'dns', 'domain', 'events', 'fs', 'http', 'http2', 'https', 'inspector', 'diagnostics_channel', 'module', 'net', 'os', 'path', 'perf_hooks', 'process', 'punycode', 'querystring', 'readline', 'repl', 'stream', 'string_decoder', 'sys', 'timers', 'tls', 'trace_events', 'tty', 'url', 'util', 'v8', 'vm', 'wasi', 'worker_threads', 'zlib']);

/** `@scope/name/sub` → `@scope/name`; `name/sub` → `name`. */
export function packageName(spec: string): string {
  return spec.split('/').slice(0, spec.startsWith('@') ? 2 : 1).join('/');
}

export function createResolver(files: readonly SourceFile[]): (from: string, spec: string) => Resolution {
  const known = new Set(files.map((file) => file.path));
  const { configFor, packages, dependencies } = loadConfigs(files);

  /** A path as written → the file it names: exact, `.js`→`.ts`, extensions, `/index`. */
  function resolveFile(base: string): string | undefined {
    const ext = /\.[cm]?[jt]sx?$/.exec(base)?.[0] ?? '';
    const stem = base.slice(0, base.length - ext.length);
    // `./a.js` means `a.ts` when both exist, as in TypeScript's own resolution.
    const candidates = [...(JS_TO_TS[ext] ?? []).map((e) => stem + e), base, ...CODE_EXT.map((e) => base + e), `${base}.d.ts`, ...CODE_EXT.map((e) => joinPath(base, `index${e}`))];
    return candidates.find((candidate) => known.has(candidate));
  }

  /** The first existing source file among the paths a package could mean. Builds are not in the scan, so `dist/x.js` is
   * tried as `src/x.ts` first; a hit inside a skipped folder (dist, tests) is not an entry. */
  function firstFile(dir: string, targets: string[]): string | undefined {
    for (const target of targets) {
      const source = target.replace(/^\.?\/?(?:dist|build|lib|out)\//, 'src/');
      for (const variant of source === target ? [target] : [source, target]) {
        const file = resolveFile(joinPath(dir, variant.replace(/\.d\.[cm]?ts$/, '')));
        if (file && !isSkippedSource(file)) return file;
      }
    }
    return undefined;
  }

  /** `exports` conditions flattened in file order (`types`, `import`, `default`…): the first that exists wins. */
  const targetsOf = (value: unknown): string[] => (typeof value === 'string' ? [value] : Array.isArray(value) ? value.flatMap(targetsOf) : value && typeof value === 'object' ? Object.values(value).flatMap(targetsOf) : []);

  function resolvePackage(pkg: WorkspacePackage, sub: string): Resolution {
    const exportsField = pkg.json.exports;
    const subpaths = exportsField && typeof exportsField === 'object' && !Array.isArray(exportsField) && Object.keys(exportsField).some((key) => key.startsWith('.'));
    let targets: string[] = [];
    if (subpaths) {
      // ponytail: first matching `exports` key wins, not the longest prefix — upgrade path: sort keys like `paths` below.
      for (const [key, value] of Object.entries(exportsField as Record<string, unknown>)) {
        const star = matchStar(key, sub === '' ? '.' : `./${sub}`);
        if (star !== undefined) { targets = targetsOf(value).map((t) => t.replace('*', () => star)); break; }
      }
    } else if (sub === '') targets = targetsOf(exportsField);
    if (sub === '') targets.push(...[pkg.json.module, pkg.json.main].filter((v): v is string => typeof v === 'string'), 'src/index', 'index');
    else targets.push(sub, `src/${sub}`);
    const file = firstFile(pkg.dir, targets);
    return file ? { kind: 'file', to: file } : { kind: 'dir', to: pkg.dir };
  }

  return (from, rawSpec) => {
    const spec = rawSpec.replace(/\?.*$/, '');
    if (spec.startsWith('.')) {
      if (ASSET.test(spec)) return { kind: 'ignore' };
      const target = joinPath(dirOf(from), spec);
      const file = resolveFile(target);
      if (file) return { kind: 'file', to: file };
      // Missing build output (`./dist/x.js`) is not a broken import: the folder is skipped, so nothing is expected there.
      return FRAMEWORK.test(spec) || (!target.startsWith('..') && isSkippedSource(`${target}/_`)) ? { kind: 'ignore' } : { kind: 'unresolved' };
    }
    if (spec === '' || spec.startsWith('/') || spec.includes(':')) return { kind: 'ignore' };
    const config = configFor(from);
    let aliased = false;
    // TypeScript prefers the longest matching pattern prefix.
    const patterns = Object.keys(config.paths ?? {}).sort((a, b) => b.length - a.length);
    for (const pattern of patterns) {
      const star = matchStar(pattern, spec);
      if (star === undefined) continue;
      // A bare `*` pattern matches every package name; only a literal prefix (`@vue/`, `~lib/`) marks an alias.
      if (!pattern.startsWith('*')) aliased = true;
      const file = config.paths![pattern]!.map((target) => resolveFile(joinPath(config.pathsBase ?? '', target.replace('*', () => star)))).find(Boolean);
      if (file) return { kind: 'file', to: file };
    }
    if (config.baseUrl !== undefined) {
      const file = resolveFile(joinPath(config.baseUrl, spec));
      if (file) return { kind: 'file', to: file };
    }
    const name = packageName(spec);
    const workspace = packages.get(name);
    if (workspace) return resolvePackage(workspace, spec.slice(name.length + 1));
    // `@/x`, `~/x`, `#x`: local by convention, so a miss is a broken import.
    if (/^(?:@\/|~\/|#)/.test(spec)) return { kind: 'unresolved' };
    // A `paths` pattern that matched but found nothing falls through to node_modules, as in TypeScript: that is a real
    // package only if some package.json lists it (`@vue/repl`); otherwise a missing monorepo target is a broken import.
    if (aliased && !dependencies.has(name)) return { kind: 'unresolved' };
    return BUILTINS.has(name) ? { kind: 'ignore' } : { kind: 'external', pkg: name };
  };
}
