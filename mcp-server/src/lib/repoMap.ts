import { lstat, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { acceptsMapFile, buildMap, factsFromFiles, insights, isSkippedDir, presets, type MapDepth, type MapModelData } from './agent.js';
import { originOf, trackedFiles, type GithubRepo } from './mapGit.js';

/**
 * The Living Map lives in the app (src/dsl/map, src/dsl/discovery) and arrives through the generated bundle.
 * This is the Node side: list a checkout's files, hand them to the bundle, summarise the model it builds.
 * Inside a git work tree only tracked files are mapped (so a link to GitHub always resolves and no ignored or
 * untracked file name leaks into a shared page); elsewhere the directory is walked, skipping dependency folders.
 */

export const MAP_DEPTHS: readonly MapDepth[] = ['overview', 'detailed', 'everything'];
const MAX_MAP_FILES = 20_000;
const MAX_MAP_BYTES = 64 * 1024 * 1024;
const SOURCE = /\.(?:[cm]?[jt]sx?|py|go)$/;
const MAX_FILE_BYTES = 256 * 1024;

/** Thrown for input the user can fix: a path that is not a directory, a tree with nothing to map. */
export class MapInputError extends Error {}

export interface RepoMap {
  readonly name: string;
  readonly model: MapModelData;
  /** Set when the cap or the byte budget cut the read: `total` candidate files, `read` of them with content. */
  readonly capped?: { readonly read: number; readonly total: number };
  /** Evidence links are right only for a github.com checkout root; null otherwise. */
  readonly github: GithubRepo | null;
}

export interface MapLimits {
  readonly maxFiles?: number;
  readonly maxBytes?: number;
}

const byPath = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Sorted candidate paths of a plain directory: no symlinks, no dependency or build folders. */
async function walk(root: string, rel = ''): Promise<string[]> {
  const entries = await readdir(path.join(root, rel), { withFileTypes: true }).catch(() => []);
  const out: string[] = [];
  for (const entry of [...entries].sort((a, b) => byPath(a.name, b.name))) {
    if (entry.isDirectory()) {
      if (!isSkippedDir(entry.name)) out.push(...await walk(root, rel ? `${rel}/${entry.name}` : entry.name));
    } else if (entry.isFile()) out.push(rel ? `${rel}/${entry.name}` : entry.name);
  }
  return out;
}

export async function buildRepoMap(dir: string, limits: MapLimits = {}): Promise<RepoMap> {
  const maxFiles = limits.maxFiles ?? MAX_MAP_FILES;
  const maxBytes = limits.maxBytes ?? MAX_MAP_BYTES;
  const resolved = path.resolve(dir);
  if (!(await stat(resolved).catch(() => null))?.isDirectory()) throw new MapInputError(`"${dir}" is not a directory.`);
  const tracked = await trackedFiles(resolved);
  const listing = (tracked ?? await walk(resolved)).map((file) => file.split(path.sep).join('/'));
  const candidates = [...new Set(listing.filter(acceptsMapFile))].sort(byPath);
  if (!candidates.some((file) => SOURCE.test(file))) {
    throw new MapInputError(`no ${tracked ? 'tracked ' : ''}source files (TypeScript, JavaScript, Python or Go) under "${dir}".`);
  }
  const read: { path: string; content: string }[] = [];
  const listed: string[] = []; // too big or past the budget: drawn as a box with 0 lines
  let bytes = 0;
  let cut = false;
  for (const file of candidates) {
    const full = path.join(resolved, ...file.split('/'));
    const info = await lstat(full).catch(() => null);
    if (!info?.isFile()) continue; // a symlink, a submodule, a file deleted since the last commit
    if (info.size > MAX_FILE_BYTES) { listed.push(file); continue; }
    if (read.length >= maxFiles || bytes + info.size > maxBytes) { listed.push(file); cut = true; continue; }
    try {
      read.push({ path: file, content: await readFile(full, 'utf8') });
      bytes += info.size;
    } catch { listed.push(file); }
  }
  const origin = await originOf(resolved);
  const name = origin.remote?.repo ?? path.basename(resolved);
  const facts = factsFromFiles(read, name, { paths: candidates, listed });
  return {
    name,
    model: buildMap({ ...facts, source: { repo: name } }),
    github: origin.github,
    ...(cut ? { capped: { read: read.length, total: candidates.length } } : {}),
  };
}

export function summarizeMap({ name, model, capped }: RepoMap, depth: MapDepth): string {
  const parts = Object.values(model.nodes).filter((node) => node.kind === 'part');
  const open = presets(model)[depth];
  const lines = [
    `${name}: ${parts.length} part(s), ${model.stats.files} files, ${model.stats.loc} lines`,
    `${model.stats.imports} imports resolved, ${model.stats.unresolved} unresolved`,
    `depth ${depth}: ${open.size} box(es) open`,
  ];
  if (capped) lines.push(`note: the map reads ${capped.read.toLocaleString('en-US')} of ${capped.total.toLocaleString('en-US')} files; the rest are listed with 0 lines`);
  const pairs = insights(model, { top: 5 }).twoWay.slice(0, 5);
  if (pairs.length > 0) {
    lines.push('two-way pairs (import each other):');
    for (const pair of pairs) lines.push(`  ${pair.a} <-> ${pair.b}  ${pair.ab} / ${pair.ba}`);
  } else {
    lines.push('two-way pairs: none');
  }
  return lines.join('\n');
}
