import { buildMap } from '../../dsl/map/build';
import type { MapFacts, MapLink, MapModel } from '../../dsl/map/types';
import { acceptsArchitectureFile, discoverArchitecture } from '../../dsl/discovery/discovery';
import { isSkippedSource, scanImports } from '../../dsl/discovery/imports/scan';
import { fetchRepoFiles, type FetchRepoOptions, type RepoRef } from '../discovery/githubRepo';

const MAX_FILES = 2500;
const SOURCE = /\.(?:[cm]?[jt]sx?|py|go)$/;
const CONFIG = /(?:^|\/)(?:package\.json|tsconfig[^/]*\.json|jsconfig\.json|go\.mod|pyproject\.toml|setup\.cfg)$/;

/** Sources the map draws, plus the configs the import resolver reads. */
export const selectMapFile = (path: string): boolean => ((SOURCE.test(path) || CONFIG.test(path)) && !isSkippedSource(path)) || acceptsArchitectureFile(path);

/** Read order: configs and manifests (the resolver needs them), then map sources, then the other architecture files. */
export const mapPriority = (path: string): number => (CONFIG.test(path) || /(?:^|\/)(?:requirements\.txt|pom\.xml)$/.test(path) ? 0 : SOURCE.test(path) ? 1 : 2);

export interface MapProgress { read: number; total: number }

export interface LoadMapOptions {
  token?: string;
  signal?: AbortSignal;
  /** Called with the tree alone (loc 0, no links), then with the finished map. */
  onSnapshot: (model: MapModel, progress: MapProgress) => void;
  /** Files read so far, for a counter. */
  onProgress?: (progress: MapProgress) => void;
  /** Where the reads go; a test passes a fake. */
  fetch?: FetchRepoOptions['fetch'];
  hosts?: FetchRepoOptions['hosts'];
}

// ponytail: main thread, one final scan — P4a: worker + streaming + IndexedDB cache
export async function loadRepoMap(ref: RepoRef, opts: LoadMapOptions): Promise<MapModel> {
  const source: { repo: string; ref: string; sha?: string } = { repo: `${ref.owner}/${ref.repo}`, ref: ref.ref };
  let treePaths: string[] = [];
  const read = await fetchRepoFiles(ref, {
    maxFiles: MAX_FILES,
    select: selectMapFile,
    priority: mapPriority,
    ...(opts.token ? { token: opts.token } : {}),
    ...(opts.signal ? { signal: opts.signal } : {}),
    ...(opts.fetch ? { fetch: opts.fetch } : {}),
    ...(opts.hosts ? { hosts: opts.hosts } : {}),
    onTree: (paths, treeSha) => {
      if (treeSha) source.sha = treeSha; // the tree's sha, not the commit's: a cache key, not a blob link
      treePaths = paths.filter((p) => SOURCE.test(p));
      opts.onSnapshot(buildMap({ files: treePaths.map((path) => ({ path, loc: 0 })), imports: [], source }), { read: 0, total: Math.min(paths.length, MAX_FILES) });
    },
    onProgress: (done, total) => opts.onProgress?.({ read: done, total }),
  });
  opts.signal?.throwIfAborted();
  const scan = scanImports(read.files);
  // Files the fetcher skipped (size cap, failures) stay on the map with 0 lines.
  const files = treePaths.map((path) => ({ path, loc: scan.loc[path] ?? 0 }));
  const model = buildMap({ files, imports: scan.imports, ...deployables(read.files, ref.repo), source });
  opts.onSnapshot(model, { read: read.files.length + read.failed, total: read.files.length + read.failed });
  return model;
}

/** Discovery's deployable units become parts, and its relations between them 'call' links (what the repo page also draws). */
function deployables(files: Parameters<typeof discoverArchitecture>[0], repoName: string): Pick<MapFacts, 'parts' | 'links'> {
  const found = discoverArchitecture(files, repoName);
  const dirOf = new Map(found.units.filter((u) => u.dir !== '' && u.dir !== '.').map((u) => [u.id, u.dir]));
  const parts = [...new Map([...dirOf].map(([id, dir]) => [dir, found.units.find((u) => u.id === id)!])).values()]
    .map((u) => ({ name: u.name, dir: u.dir, desc: [u.kind, u.tech].filter(Boolean).join(' · ') }));
  const links: MapLink[] = found.relations.flatMap((r) => {
    const [from, to] = [dirOf.get(r.from), dirOf.get(r.to)];
    return from && to && from !== to ? [{ from, to, kind: 'call' as const, ...(r.label ? { label: r.label } : {}), evidence: r.evidence.map((e) => ({ ...e })) }] : [];
  });
  return { parts, links };
}
