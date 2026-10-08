import { compare } from './tree';
import { aggregate, presets } from './view';
import type { MapModel } from './types';

// "Worth a look": cheap, honest signals read straight off the links. Never a verdict.

export interface Insights {
  /** Sibling boxes that import each other at least `minPair` times each way, busiest first. `ab` counts lines a -> b, `ba` lines b -> a. */
  twoWay: { a: string; b: string; ab: number; ba: number }[];
  largest: string[];
  unreferenced: string[];
}

// Files nothing is expected to import: entry points, tooling, tests, type stubs.
const NOT_IMPORTED = new RegExp(
  [
    String.raw`(^|/)(index|main|cli|server|http|app|__init__|__main__)\.[a-z]+$`,
    String.raw`\.(test|spec|stories|worker|config|d)\.[a-z]+$`,
    String.raw`(^|/)(__tests__|e2e|tests?|scripts?|fixtures?)/`,
    String.raw`(_test\.go|(^|/)test_[^/]*\.py|(^|/)main\.go)$`,
  ].join('|'),
  'i',
);

export function insights(model: MapModel, { minPair = 3, top = 5 } = {}): Insights {
  const { edges } = aggregate(model, presets(model).overview, ['import']);
  const twoWay = edges
    .filter((e) => e.reverse >= minPair && e.forward >= minPair)
    .map((e) => (e.from < e.to ? { a: e.from, b: e.to, ab: e.forward, ba: e.reverse } : { a: e.to, b: e.from, ab: e.reverse, ba: e.forward }))
    .sort((x, y) => y.ab + y.ba - (x.ab + x.ba) || compare(x.a, y.a));

  const files = Object.values(model.nodes).filter((n) => n.kind === 'file');
  const largest = [...files].sort((a, b) => b.loc - a.loc || compare(a.id, b.id)).slice(0, top).map((n) => n.id);

  // A dir import references everything in that folder, so ancestors count as referenced.
  const targets = new Set(model.links.map((l) => l.to));
  const referenced = (id: string) => {
    for (let at: string | null = id; at !== null; at = model.nodes[at].parent) if (targets.has(at)) return true;
    return false;
  };
  const unreferenced = files
    .filter((n) => !referenced(n.id) && !NOT_IMPORTED.test(n.path ?? n.id))
    .map((n) => n.id)
    .sort(compare);
  return { twoWay, largest, unreferenced };
}
