// The whole load: tree → first map → files stream in, scanned in batches → final map → cache.
// Runs in the map worker; the same code runs inline where there is no Worker (tests, a caller-supplied fetch).
import { scanImports } from '../../dsl/discovery/imports/scan';
import type { ImportFact, SourceFile } from '../../dsl/discovery/imports/types';
import { buildMap } from '../../dsl/map/build';
import { compare } from '../../dsl/discovery/imports/paths';
import { CONFIG, factsFromFiles, isMapSource } from '../../dsl/map/facts';
import type { MapModel } from '../../dsl/map/types';
import { fetchRepoFiles, RepoError, type FetchRepoOptions, type RepoRef } from '../discovery/githubRepo';
import { cacheKey, latestCache, readCache, touchCache, writeCache, type CacheStore, type CachedFacts } from './cache';
import { breadthOrder, mapPriority, selectMapFile, SOURCE_CAP } from './select';

export interface MapProgress {
  read: number;
  total: number;
  /**
   * Set when the map is not the whole repo: `read` of the `total` sources in the tree are on it. Past the source cap
   * or the 8 MB budget the sample is what fits (by folder breadth); once done, files that would not load (or were too
   * big to read) are out of `read`, and `truncated` says GitHub listed only part of the tree.
   */
  sampled?: { read: number; total: number; truncated?: boolean };
  /** GitHub's limit stopped the read and this is the last map cached for the repo: it may be out of date. */
  stale?: boolean;
  /** …and it was read at this other ref (none cached at the one asked for). */
  staleRef?: string;
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
  let sourceCount = 0;
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

  const read$ = fetchRepoFiles(ref, {
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
      sourceCount = sources.length;
      if (sources.length > SOURCE_CAP) {
        const order = breadthOrder(sources);
        ranks = new Map(order.map((p, i) => [p, i]));
        treePaths = order.slice(0, SOURCE_CAP).sort();
      } else treePaths = sources;
      total = Math.min(paths.length, MAX_FILES);
      cachedKey = treeSha && opts.cache ? cacheKey(ref.owner, ref.repo, treeSha) : null;
      const hit = cachedKey && opts.cache ? await readCache(opts.cache, cachedKey) : undefined;
      if (hit) {
        cached = buildMap({ ...hit, externals: hit.services, source });
        sampled = hit.sampled;
        return false;
      }
      return undefined;
    },
    onChosen: (chosen, left) => {
      // Only configs that will really be fetched can hold the gate shut (an oversize one never arrives).
      configTotal = chosen.filter((p) => CONFIG.test(p)).length;
      // Sources the cap or the byte budget left unread are not drawn: a box nobody read would have no arrows.
      const out = new Set(left);
      treePaths = treePaths.filter((p) => !out.has(p));
      if (treePaths.length < sourceCount) sampled = { read: treePaths.length, total: sourceCount };
      opts.onSnapshot(preview(), progress());
    },
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
  const result = await read$.catch(async (error: unknown) => {
    // Rate-limited with this repo cached: its last map beats a wall, said to be possibly out of date.
    const limited = error instanceof RepoError && (error.problem.kind === 'rate-limited' || error.problem.kind === 'slow-down');
    const last = limited && opts.cache ? await latestCache(opts.cache, ref.owner, ref.repo, ref.ref) : undefined;
    if (!last) throw error;
    return last;
  });
  if (!('wanted' in result)) {
    const model = buildMap({ ...result, externals: result.services, source });
    opts.onSnapshot(model, { read: model.stats.files, total: model.stats.files, ...(result.sampled ? { sampled: result.sampled } : {}), stale: true,
      ...(result.ref && result.ref !== ref.ref ? { staleRef: result.ref } : {}) });
    opts.onDone?.(model);
    return model;
  }
  if (cached) {
    opts.onSnapshot(cached, { read: cached.stats.files, total: cached.stats.files, ...(sampled ? { sampled } : {}) });
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
  // What the map really holds: the sources read, of all the tree listed (a failed or oversize file is a box with no lines).
  const readSources = read.filter((f) => isMapSource(f.path) && listedSet.has(f.path)).length;
  sampled = readSources < sourceCount || result.truncated
    ? { read: readSources, total: sourceCount, ...(result.truncated ? { truncated: true } : {}) } : undefined;
  opts.onSnapshot(model, progress());
  opts.onDone?.(model);
  // A file that failed to load makes the read partial: do not remember it as the repo. (The cap, the byte budget and
  // GitHub's truncation are deterministic for a tree sha, so they are cached with the note that says so.)
  if (source.sha && opts.cache && result.failed === 0) {
    const stored: CachedFacts = {
      files: facts.files, imports: facts.imports, parts: facts.parts ?? [], links: facts.links ?? [],
      services: facts.externals ?? [], unresolvedImports: facts.unresolvedImports ?? 0, ...(sampled ? { sampled } : {}), ref: ref.ref,
    };
    await writeCache(opts.cache, cacheKey(ref.owner, ref.repo, source.sha), stored);
  }
  return model;
}
