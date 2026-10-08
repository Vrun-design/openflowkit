// The configuration that decides what an import specifier means: tsconfig/jsconfig `paths`
// and `baseUrl`, and package.json files that turn a package name into a folder.
import { dirOf, joinPath } from './paths';
import { isSkippedSource } from './skip';
import { stripComments } from './strip';
import type { SourceFile } from './types';

export interface TsPaths {
  /** Repo-relative folder `baseUrl` points at. */
  baseUrl?: string;
  paths?: Record<string, string[]>;
  /** The folder `paths` targets are relative to: `baseUrl` when set, else the config's own folder. */
  pathsBase?: string;
  /** This config's own folder, `include` and `references` (never inherited): they pick the config of a solution-style tsconfig. */
  dir?: string;
  include?: string[];
  references?: string[];
}

export interface WorkspacePackage {
  name: string;
  dir: string;
  json: Record<string, unknown>;
}

/** tsconfig is JSON with comments and trailing commas (and sometimes a BOM).
 * ponytail: a `,` before `}` inside a string is also dropped — upgrade path: strip commas in the tokenizer. */
export function parseJsonc(text: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(stripComments(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text, false).replace(/,(\s*[}\]])/g, '$1'));
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []);
/** A hostile chain of `extends` fans out exponentially; real ones are one or two deep. */
const MAX_EXTENDS = 8;

/** Whether a config's `include` reaches the file: its literal folder prefix is enough ("src", "src/**\/*"). */
function covers(config: TsPaths, file: string): boolean {
  if (!config.include) return true;
  return config.include.some((entry) => {
    const literal = entry.split('/').filter((s) => s !== '.').filter((s, i, all) => !all.slice(0, i + 1).some((t) => /[*?]/.test(t))).join('/');
    const base = joinPath(config.dir ?? '', literal);
    return base === '' || file === base || file.startsWith(`${base}/`);
  });
}

/** Everything config-shaped in the file list, ready for per-file lookups. */
export function loadConfigs(files: readonly SourceFile[]): { configFor: (file: string) => TsPaths; packages: Map<string, WorkspacePackage> } {
  const content = new Map<string, string>();
  const packages = new Map<string, WorkspacePackage>();
  // Sorted, so the result never depends on the order the caller listed files in.
  const sorted = files.filter((file) => file.path.endsWith('.json') && !isSkippedSource(file.path)).sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  for (const file of sorted) {
    content.set(file.path, file.content);
    if (file.path.slice(file.path.lastIndexOf('/') + 1) !== 'package.json') continue;
    const json = parseJsonc(file.content);
    const dir = dirOf(file.path);
    // Two packages with one name: the shallowest wins, then path order.
    const taken = packages.get(json.name as string);
    if (typeof json.name === 'string' && (!taken || dir.split('/').length < taken.dir.split('/').length)) packages.set(json.name, { name: json.name, dir, json });
  }
  const memo = new Map<string, TsPaths>();

  /** `paths`/`baseUrl` after following relative `extends` (a later entry or the file itself wins); a cycle stops the chain.
   * ponytail: `extends` naming a package (`astro/tsconfigs/strict`) is not followed — upgrade path: resolve via the workspace table. */
  function read(path: string, chain: readonly string[]): TsPaths {
    const text = content.get(path);
    if (text === undefined || chain.includes(path) || chain.length > MAX_EXTENDS) return {};
    const cached = memo.get(path);
    if (cached) return cached;
    const json = parseJsonc(text);
    const dir = dirOf(path);
    let result: TsPaths = {};
    for (const parent of [json.extends].flat().slice(0, MAX_EXTENDS)) {
      if (typeof parent !== 'string' || !parent.startsWith('.')) continue;
      result = { ...result, ...read(joinPath(dir, parent.endsWith('.json') ? parent : `${parent}.json`), [...chain, path]) };
    }
    const options = isRecord(json.compilerOptions) ? json.compilerOptions : {};
    if (typeof options.baseUrl === 'string') result.baseUrl = joinPath(dir, options.baseUrl);
    if (isRecord(options.paths)) {
      result.paths = Object.fromEntries(Object.entries(options.paths).map(([key, value]) => [key, strings(value)]));
      result.pathsBase = result.baseUrl ?? dir;
    }
    result.dir = dir;
    result.include = Array.isArray(json.include) ? strings(json.include) : undefined;
    result.references = (Array.isArray(json.references) ? json.references : []).flatMap((ref: unknown) => {
      const target = isRecord(ref) && typeof ref.path === 'string' ? joinPath(dir, ref.path) : undefined;
      return target === undefined ? [] : [target.endsWith('.json') ? target : joinPath(target, 'tsconfig.json')];
    });
    memo.set(path, result);
    return result;
  }

  /** The nearest tsconfig (or jsconfig) walking up from the file's folder governs it. A solution-style one
   * (no paths, only `references`) hands over to the first reference that includes the file, else the first that has `paths`. */
  function configFor(file: string): TsPaths {
    let dir = dirOf(file);
    for (;;) {
      const hit = ['tsconfig.json', 'jsconfig.json'].map((n) => joinPath(dir, n)).find((p) => content.has(p));
      if (hit) {
        const own = read(hit, []);
        if (own.paths !== undefined || own.baseUrl !== undefined || !own.references?.length) return own;
        const refs = own.references.map((ref) => read(ref, [hit]));
        return refs.find((ref) => covers(ref, file) && (ref.paths !== undefined || ref.baseUrl !== undefined)) ?? refs.find((ref) => ref.paths !== undefined) ?? own;
      }
      if (dir === '') return {};
      dir = dirOf(dir);
    }
  }
  return { configFor, packages };
}
