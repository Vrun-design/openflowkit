// Which repo files the map reads, and in what order.
import { compare, dirOf } from '../../dsl/discovery/imports/paths';
import { acceptsMapFile, CONFIG, SOURCE } from '../../dsl/map/facts';

/** Sources the map draws, plus the configs the import resolver reads (the one rule the CLI shares). */
export const selectMapFile = acceptsMapFile;

/** Read order: configs and manifests (the resolver needs them), then map sources, then the other architecture files. */
export const mapPriority = (path: string): number => (CONFIG.test(path) || /(?:^|\/)(?:requirements\.txt|pom\.xml)$/.test(path) ? 0 : SOURCE.test(path) ? 1 : 2);

/** More sources than this and the map reads a sample: one file per folder in turn, so every folder is seen. */
export const SOURCE_CAP = 5000;

/**
 * Paths reordered so that any prefix spreads over as many folders as possible: first every folder's first file,
 * then every folder's second, and so on. Deterministic (sorted), so the same tree gives the same sample.
 */
export function breadthOrder(paths: readonly string[]): string[] {
  const groups = new Map<string, string[]>();
  for (const path of [...paths].sort()) {
    const dir = dirOf(path);
    const list = groups.get(dir);
    if (list) list.push(path); else groups.set(dir, [path]);
  }
  const lists = [...groups.entries()].sort(([a], [b]) => compare(a, b)).map(([, list]) => list);
  const out: string[] = [];
  for (let round = 0; out.length < paths.length; round++) for (const list of lists) if (round < list.length) out.push(list[round]!);
  return out;
}
