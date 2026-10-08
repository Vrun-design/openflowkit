// The whole load: tree → first map → files stream in, scanned in batches → final map → cache.
// Runs in the map worker; the same code runs inline where there is no Worker (tests, a caller-supplied fetch).
import { scanImports } from '../../dsl/discovery/imports/scan';
import type { ImportFact, SourceFile } from '../../dsl/discovery/imports/types';
import { buildMap } from '../../dsl/map/build';
import { compare } from '../../dsl/discovery/imports/paths';
import { CONFIG, factsFromFiles, isMapSource } from '../../dsl/map/facts';
import type { MapModel } from '../../dsl/map/types';
import { fetchRepoFiles, type FetchRepoOptions, type RepoRef } from '../discovery/githubRepo';
import { cacheKey, readCache, touchCache, writeCache, type CacheStore, type CachedFacts } from './cache';
import { breadthOrder, mapPriority, selectMapFile, SOURCE_CAP } from './select';

export interface MapProgress {
  read: number;
  total: number;
  /** Set when the repo had more sources than the cap: `read` of `total` were chosen (by folder breadth). */
  sampled?: { read: number; total: number };
}

export interface PipelineOptions {
  token?: string;
  signal?: AbortSignal;
  fetch?: FetchRepoOptions['fetch'];
  hosts?: FetchRepoOptions['hosts'];
  concurrency?: number;
  cache?: CacheStore | null;
  onSnapshot: (model: MapModel, progress: MapProgress) => void;
  onProgress?: (progress: MapProgress) => void;
  /** The finished map, called before the cache is written: the caller can answer now and let storage catch up. */
  onDone?: (model: MapModel) => void;
}

/** A snapshot goes out after this many new files or this long, whichever first. */
const FLUSH_FILES = 100;
const FLUSH_MS = 400;
/** Sources, plus room for configs, manifests and the deploy files discovery reads. */
const MAX_FILES = SOURCE_CAP + 500;
const DEFAULT_CONCURRENCY = 16;

const byFromLine = (a: ImportFact, b: ImportFact) => compare(a.from, b.from) || a.line - b.line || compare(a.to, b.to);

export async function runMapPipeline(ref: RepoRef, opts: PipelineOptions): Promise<MapModel> {
  const source: { repo: string; ref: string; sha?: string } = { repo: `${ref.owner}/${ref.repo}`, ref: ref.ref };
  let treePaths: string[] = []; // the map's file list
  let allPaths: string[] = []; // every selected path: what imports may point at
  let sampled: MapProgress['sampled'];
  let ranks = new Map<string, number>();
  let configTotal = 0;
  let configSettled = 0;
  let total = 0;
  let done = 0;
  let cached: MapModel | undefined;
  let cachedKey: string | null = null;
  const read: SourceFile[] = [];
  const pending = new Set<string>();
  const imports: ImportFact[] = [];
  const loc: Record<string, number> = {};
  let unresolved = 0;
  let lastFlush = performance.now();

  const progress = (): MapProgress => ({ read: done, total, ...(sampled ? { sampled } : {}) });
  /** A preview: the files listed so far with their lines, and the imports scanned so far. */
  const preview = (): MapModel =>
    buildMap({ files: treePaths.map((path) => ({ path, loc: loc[path] ?? 0 })), imports: [...imports].sort(byFromLine), unresolvedImports: unresolved, source });

  /** Scan what arrived since the last batch. Held back until every config is in, so no file resolves against half the configs.
   * Batches are previews only: the final map comes from one `factsFromFiles` call over everything, the same code the CLI runs. */
  function flush(): void {
    if (pending.size === 0) return;
    if (configSettled < configTotal || (pending.size < FLUSH_FILES && performance.now() - lastFlush < FLUSH_MS)) return;
    const scan = scanImports(read, { paths: allPaths, only: new Set(pending) });
    imports.push(...scan.imports);
    Object.assign(loc, scan.loc);
    unresolved += scan.unresolved.length;
    pending.clear();
    lastFlush = performance.now();
    opts.onSnapshot(preview(), progress());
  }

  const result = await fetchRepoFiles(ref, {
    maxFiles: MAX_FILES,
    select: selectMapFile,
    // Sources in sample order (breadth first). Past the cap they rank after the deploy files, so sampling limits the
    // reads without starving manifests and compose files.
    priority: (path) => {
      const rank = isMapSource(path) ? ranks.get(path) : undefined;
      return rank === undefined ? mapPriority(path) : rank < SOURCE_CAP ? 1 + rank / 1e7 : 3;
    },
    concurrency: opts.concurrency ?? DEFAULT_CONCURRENCY,
    ...(opts.token ? { token: opts.token } : {}),
    ...(opts.signal ? { signal: opts.signal } : {}),
    ...(opts.fetch ? { fetch: opts.fetch } : {}),
    ...(opts.hosts ? { hosts: opts.hosts } : {}),
    onTree: async (paths, treeSha) => {
      if (treeSha) source.sha = treeSha; // the tree's sha, not the commit's: a cache key, not a blob link
      allPaths = [...paths];
      const sources = paths.filter(isMapSource);
      if (sources.length > SOURCE_CAP) {
        const order = breadthOrder(sources);
        sampled = { read: SOURCE_CAP, total: sources.length };
        ranks = new Map(order.map((p, i) => [p, i]));
        treePaths = order.slice(0, SOURCE_CAP).sort();
      } else treePaths = sources;
      total = Math.min(paths.length, MAX_FILES);
      cachedKey = treeSha && opts.cache ? cacheKey(ref.owner, ref.repo, treeSha) : null;
      const hit = cachedKey && opts.cache ? await readCache(opts.cache, cachedKey) : undefined;
      if (hit) {
        cached = buildMap({ ...hit, externals: hit.services, source });
        opts.onSnapshot(cached, { read: hit.files.length, total: hit.files.length, ...(sampled ? { sampled } : {}) });
        return false;
      }
      opts.onSnapshot(preview(), progress());
      return undefined;
    },
    // Only configs that will really be fetched can hold the gate shut (an oversize one never arrives).
    onChosen: (chosen) => { configTotal = chosen.filter((p) => CONFIG.test(p)).length; },
    onFile: (file) => {
      read.push(file);
      if (CONFIG.test(file.path)) configSettled++;
      else if (isMapSource(file.path)) pending.add(file.path);
      flush();
    },
    onFail: (path) => { if (CONFIG.test(path)) configSettled++; },
    onProgress: (n, of) => {
      done = n;
      total = of;
      opts.onProgress?.(progress());
    },
  });
  if (cached) {
    opts.onDone?.(cached);
    if (opts.cache && cachedKey) await touchCache(opts.cache, cachedKey);
    return cached;
  }
  opts.signal?.throwIfAborted();
  // The truth: one pass over every file read, with the whole tree for resolution. Same call, same result as the CLI.
  // Sources past the sample (read only because the cap leaves room) stay out, so a sampled map is exactly its sample.
  const listedSet = new Set(treePaths);
  const facts = factsFromFiles(read.filter((f) => !isMapSource(f.path) || listedSet.has(f.path)), ref.repo, { paths: allPaths, listed: treePaths });
  const model = buildMap({ ...facts, source });
  done = result.files.length + result.failed;
  total = done;
  opts.onSnapshot(model, progress());
  opts.onDone?.(model);
  // A file that failed to load makes the read partial: do not remember it as the repo. (The byte budget is
  // deterministic for a tree sha, so a budget skip is fine to cache.)
  if (source.sha && opts.cache && result.failed === 0) {
    const stored: CachedFacts = {
      files: facts.files, imports: facts.imports, parts: facts.parts ?? [], links: facts.links ?? [],
      services: facts.externals ?? [], unresolvedImports: facts.unresolvedImports ?? 0,
    };
    await writeCache(opts.cache, cacheKey(ref.owner, ref.repo, source.sha), stored);
  }
  return model;
}
