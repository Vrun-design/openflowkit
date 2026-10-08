// Files in, MapFacts out: the same assembly the browser loader does (scan imports, discovery's deployable units as
// parts, its relations between them as 'call' links), for a caller that already holds every file (the CLI).
import { acceptsArchitectureFile, discoverArchitecture } from '../discovery/discovery';
import { scanImports } from '../discovery/imports/scan';
import { isSkippedSource } from '../discovery/imports/skip';
import type { ImportFact, SourceFile } from '../discovery/imports/types';
import type { MapFacts, MapLink } from './types';

export const SOURCE = /\.(?:[cm]?[jt]sx?|py|go)$/;
export const CONFIG = /(?:^|\/)(?:package\.json|tsconfig[^/]*\.json|jsconfig\.json|go\.mod|pyproject\.toml|setup\.cfg)$/;

/** A file the map draws as a box: a source (not a test, `.d.ts`, vendored, docs or generated one). */
export const isMapSource = (path: string): boolean => SOURCE.test(path) && !isSkippedSource(path);

// What discovery reads JSON and TOML for: package.json is a manifest (a CONFIG), a wrangler config declares a Worker and its stores.
// Every other .json/.toml (locales, lockfiles, schemas) never yields a unit or a relation.
const WRANGLER = /(?:^|\/)wrangler\.(?:toml|jsonc?)$/;
/** Source files in every language discovery reads (rules.ts INCLUDE_EXT, minus data and deploy formats). */
const CODE = /\.(?:[cm]?[jt]sx?|py|rb|go|rs|java|kt|swift|php|cs|scala|clj|exs?)$/;
/** Code samples for the docs (fastapi's `docs_src/`, a top-level `docs/`) and vendored copies: hundreds of files, none of them the system. */
const DOC_SNIPPETS = /^docs\/|(?:^|\/)(?:docs_src|vendor|vendored|third_party|third-party)\//;
const DATA_ONLY = /\.(?:json|toml)$/;
// A tsconfig can `extends` any JSON file (`config/base.json`, `paths.json`); resolution needs its `paths`.
// ponytail: only extends targets whose name says config/base/paths are read — upgrade path: fetch the `extends` target after the tsconfig arrives.
const EXTENDABLE = /(?:config|base|paths)[^/]*\.json$/i;

/**
 * Which repo-relative paths the map reads: sources, the configs resolution needs, and what discovery turns into
 * parts and links (Dockerfiles, compose, k8s and terraform files, manifests, other-language sources whose imports
 * name services). Documentation code samples, vendored code and data files are not read:
 * on fastapi that is 476 of 553 downloads (docs_src examples) that changed nothing on the map.
 */
export const acceptsMapFile = (path: string): boolean => {
  if (!acceptsArchitectureFile(path)) return (SOURCE.test(path) || CONFIG.test(path)) && !isSkippedSource(path);
  // Deploy files, manifests and even example apps count (`examples/app` imports the library: that is a real arrow in
  // discovery). Only documentation snippets are dropped: they are most of the downloads on a framework repo.
  if (CODE.test(path) && DOC_SNIPPETS.test(path)) return false;
  return !DATA_ONLY.test(path) || CONFIG.test(path) || WRANGLER.test(path) || EXTENDABLE.test(path);
};

const byFromLine = (a: ImportFact, b: ImportFact) => (a.from < b.from ? -1 : a.from > b.from ? 1 : a.line - b.line || (a.to < b.to ? -1 : a.to > b.to ? 1 : 0));

/** What discovery found that the map draws: deployable units as parts, and everything they talk to. */
export type Deployables = Required<Pick<MapFacts, 'parts' | 'links' | 'externals'>>;

/**
 * Units with a folder become parts. A unit at the repo root (the main app) stands for `src/` when the repo has
 * one, since that is where its code lives. Relations between parts become 'call' links; a relation to anything
 * without a folder (a store, a queue, an outside service) becomes a link to an `ext:` node: 'data' for stores and
 * queues, 'call' for services. Evidence (file:line) rides along on every link.
 */
export function deployablesFrom(files: readonly SourceFile[], repoName: string, hasSrc: boolean): Deployables {
  const found = discoverArchitecture(files, repoName);
  const rootApp = hasSrc && !found.units.some((u) => u.dir === 'src')
    ? found.units.find((u) => (u.dir === '' || u.dir === '.') && (u.kind === 'container' || u.kind === 'system'))
    : undefined;
  const dirOf = new Map(found.units.flatMap((u): [string, string][] => (u === rootApp ? [[u.id, 'src']] : u.dir !== '' && u.dir !== '.' ? [[u.id, u.dir]] : [])));
  const unitById = new Map(found.units.map((u) => [u.id, u]));
  const parts = [...new Map([...dirOf].map(([id, dir]) => [dir, unitById.get(id)!])).entries()]
    .map(([dir, u]) => ({ name: u.name, dir, desc: [u.kind, u.tech].filter(Boolean).join(' · ') }));
  const externals = new Map<string, { id: string; name: string; desc?: string }>();
  const links: MapLink[] = found.relations.flatMap((r) => {
    const from = dirOf.get(r.from);
    if (!from) return [];
    const evidence = r.evidence.map((e) => ({ ...e }));
    const to = dirOf.get(r.to);
    if (to) return to === from ? [] : [{ from, to, kind: 'call' as const, ...(r.label ? { label: r.label } : {}), evidence }];
    const target = unitById.get(r.to);
    if (!target) return [];
    const id = `ext:${target.id}`;
    if (!externals.has(id)) externals.set(id, { id, name: target.name, desc: [target.kind, target.tech].filter(Boolean).join(' · ') });
    const kind = target.kind === 'store' || target.kind === 'queue' ? 'data' : 'call';
    return [{ from, to: id, kind, ...(r.label ? { label: r.label } : {}), evidence }];
  });
  return { parts, links, externals: [...externals.values()] };
}

export interface FactsOptions {
  /** Every selected path in the repo, read or not: imports may point at files this call was not given. */
  paths?: readonly string[];
  /** The map's file list when it is wider than what was read (oversize files, sampled-out ones): listed with 0 lines. */
  listed?: readonly string[];
}

/** `files` are repo-relative, `/`-separated, and already filtered with `acceptsMapFile`. */
export function factsFromFiles(files: readonly SourceFile[], repoName: string, options: FactsOptions = {}): MapFacts {
  const sorted = [...files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const paths = options.paths ?? sorted.map((f) => f.path);
  const scan = scanImports(sorted, { paths });
  const extra = deployablesFrom(sorted, repoName, paths.some((p) => p.startsWith('src/')));
  // The listed files that are map sources, plus anything scanned: a listed file nobody read still gets a box.
  const loc = new Map(Object.entries(scan.loc));
  for (const path of options.listed ?? []) if (isMapSource(path) && !loc.has(path)) loc.set(path, 0);
  return {
    files: [...loc].map(([path, lines]) => ({ path, loc: lines })).sort((a, b) => (a.path < b.path ? -1 : 1)),
    imports: [...scan.imports].sort(byFromLine),
    ...extra,
    unresolvedImports: scan.unresolved.length,
  };
}
