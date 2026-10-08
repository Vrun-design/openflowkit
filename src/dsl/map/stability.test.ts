import ELK from 'elkjs/lib/elk.bundled.js';
import { describe, expect, it } from 'vitest';
import { buildMap } from './build';
import { fromElkLayout, toElkGraph, type ElkNode, type Laid } from './elk';
import { syntheticRepo } from './synthetic';
import { aggregate, presets, visible } from './view';

// How much do boxes that were already on screen jump when the reader opens one more box?
// For every openable box on the overview: lay out before and after with the real ELK, take the boxes
// present in both, remove the one shift the camera absorbs (their mean offset), and measure what is left.

const model = buildMap(syntheticRepo());
const elk = new ELK();
const sizeOf = (n: { kind: string }) => (n.kind === 'file' || n.kind === 'more' ? { width: 200, height: 46 } : { width: 232, height: 92 });
const measure = (text: string) => text.length * 7;

async function layout(expanded: Set<string>): Promise<Laid> {
  const { edges } = aggregate(model, expanded);
  const out = await elk.layout(toElkGraph(model, expanded, edges, sizeOf, measure) as never);
  return fromElkLayout(out as unknown as ElkNode);
}

async function measureStability() {
  const base = presets(model).overview;
  const before = await layout(base);
  const openable = visible(model, base).filter((id) => model.nodes[id].children.length > 0 && !base.has(id));
  const jumps: number[] = [];
  for (const id of openable) {
    const after = await layout(new Set([...base, id]));
    const shared = [...before.rects.keys()].filter((k) => after.rects.has(k));
    const delta = shared.map((k) => [after.rects.get(k)!.x - before.rects.get(k)!.x, after.rects.get(k)!.y - before.rects.get(k)!.y]);
    const mx = delta.reduce((s, d) => s + d[0], 0) / delta.length;
    const my = delta.reduce((s, d) => s + d[1], 0) / delta.length;
    for (const d of delta) jumps.push(Math.hypot(d[0] - mx, d[1] - my));
  }
  jumps.sort((a, b) => a - b);
  return { opens: openable.length, mean: jumps.reduce((s, v) => s + v, 0) / jumps.length, p90: jumps[Math.floor(jumps.length * 0.9)], aspect: before.size.width / before.size.height };
}

describe('layout stability', () => {
  it('measures how far unchanged boxes move when one more box opens', { timeout: 120_000 }, async () => {
    expect(model.stats.files).toBeGreaterThan(450);
    const r = await measureStability();
    console.log(`stability: ${r.opens} opens, mean ${r.mean.toFixed(0)} px, p90 ${r.p90.toFixed(0)} px, overview aspect ${r.aspect.toFixed(2)}`);
    // Goal: mean < 40 px. ELK repacks whole levels when a box grows, so today (measured 2026-10-08: mean ~340,
    // p90 ~775) this only guards against getting worse; the two-pass layout in the P4 notes is what closes the gap.
    expect(r.opens).toBeGreaterThan(15);
    expect(r.mean).toBeLessThan(400);
    // A wide, tiny overview or a tall sliver is a regression even when boxes stay put.
    expect(r.aspect).toBeGreaterThan(1.2);
    expect(r.aspect).toBeLessThan(2.5);
  });
});
