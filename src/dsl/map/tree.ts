import type { MapModel } from './types';

// Parent-chain helpers. Nodes store only `parent`, so everything else is derived here.

/** Root-first chain ending at `id` itself. */
export function pathTo(model: MapModel, id: string): string[] {
  const chain: string[] = [];
  for (let at: string | null = id; at !== null; at = model.nodes[at]?.parent ?? null) chain.push(at);
  return chain.reverse();
}

export const depthOf = (model: MapModel, id: string): number => pathTo(model, id).length - 1;

/** True when `id` is `container` or lives anywhere below it. */
export function isInside(model: MapModel, id: string, container: string): boolean {
  for (let at: string | null = id; at !== null; at = model.nodes[at]?.parent ?? null) if (at === container) return true;
  return false;
}

/** How many lines a link stands for: each import line counts; other links count once. */
export const weightOf = (link: { kind: string; evidence: unknown[] }): number =>
  link.kind === 'import' ? Math.max(1, link.evidence.length) : 1;

export const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
