import ELK from 'elkjs/lib/elk.bundled.js';
import { describe, expect, it } from 'vitest';
import { C4_STARTER } from '../../agent/starterTemplates';
import { compile } from '../compile';
import { archModelFromJson } from '../model/model';
import type { ArchElement, ArchModel, ArchRelation, ElementKind } from '../model/types';
import { fromElkLayout, toElkGraph, type ElkNode, type Laid } from './elk';
import { fromArch } from './fromArch';
import type { MapModel } from './types';
import { aggregate, presets, visible } from './view';

// The same question as stability.test.ts (does one more open box shuffle the ones already on screen?), asked of C4 models:
// the starter and a generated ~60-element nested model, through fromArch and the real ELK.

const elk = new ELK();
const sizeOf = (n: { kind: string }) => (n.kind === 'more' || n.kind === 'group' ? { width: 200, height: 46 } : { width: 240, height: 152 });
const measure = (text: string) => text.length * 7;

async function layout(model: MapModel, expanded: ReadonlySet<string>): Promise<Laid> {
  const { edges } = aggregate(model, expanded);
  return fromElkLayout(await elk.layout(toElkGraph(model, expanded, edges, sizeOf, measure) as never) as unknown as ElkNode);
}

// Kendall tau-b: a row of boxes tied on y before and after is in order, not "unknown" (tau-a scores a perfectly
// stable three-box row 0.8).
function tau(a: number[], b: number[]) {
  let sum = 0, tiesA = 0, tiesB = 0, pairs = 0;
  for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) {
    const sa = Math.sign(a[i] - a[j]), sb = Math.sign(b[i] - b[j]);
    sum += sa * sb; pairs++; if (!sa) tiesA++; if (!sb) tiesB++;
  }
  const denominator = Math.sqrt((pairs - tiesA) * (pairs - tiesB));
  return denominator ? sum / denominator : 1;
}
const median = (xs: number[]) => [...xs].sort((x, y) => x - y)[Math.floor(xs.length / 2)];

async function measureStability(model: MapModel, base: ReadonlySet<string>) {
  const before = await layout(model, base);
  const openable = visible(model, base).filter((id) => model.nodes[id].children.length > 0 && !base.has(id));
  const taus: number[] = [];
  const ratios: number[] = [];
  for (const id of openable) {
    const after = await layout(model, new Set([...base, id]));
    const shared = [...before.rects.keys()].filter((k) => after.rects.has(k));
    const delta = shared.map((k) => [after.rects.get(k)!.x - before.rects.get(k)!.x, after.rects.get(k)!.y - before.rects.get(k)!.y]);
    const mx = delta.reduce((s, d) => s + d[0], 0) / delta.length;
    const my = delta.reduce((s, d) => s + d[1], 0) / delta.length;
    const moved = delta.map((d) => Math.hypot(d[0] - mx, d[1] - my));
    const centre = (l: Laid, k: string, axis: 'x' | 'y') => l.rects.get(k)![axis] + l.rects.get(k)![axis === 'x' ? 'width' : 'height'] / 2;
    taus.push(Math.min(...(['x', 'y'] as const).map((ax) => tau(shared.map((k) => centre(before, k, ax)), shared.map((k) => centre(after, k, ax))))));
    const grew = Math.max(1, after.rects.get(id)!.width - before.rects.get(id)!.width, after.rects.get(id)!.height - before.rects.get(id)!.height);
    ratios.push(Math.max(...moved) / grew);
  }
  return { opens: openable.length, tauMedian: median(taus), tauMin: Math.min(...taus), maxJumpPerGrowth: Math.max(...ratios) };
}

const el = (id: string, kind: ElementKind, parent: string | null): ArchElement => ({ id, kind, name: id.split('.').at(-1)!, parent, tags: [], links: [] });
const rel = (from: string, to: string): ArchRelation => ({ id: `rel:${from}->${to}`, from, to, label: 'uses', tags: [] });

/** 3 people, 5 systems of 3 containers of 3 components, 3 external systems: 3 + 5 + 15 + 45 + 3 = 71 elements. */
function generated(): ArchModel {
  const elements: ArchElement[] = [];
  const relations: ArchRelation[] = [];
  for (let p = 0; p < 3; p++) elements.push(el(`user${p}`, 'person', null));
  for (let s = 0; s < 5; s++) {
    elements.push(el(`sys${s}`, 'system', null));
    for (let c = 0; c < 3; c++) {
      const container = `sys${s}.svc${c}`;
      elements.push(el(container, c === 2 ? 'store' : 'container', `sys${s}`));
      for (let k = 0; k < 3; k++) elements.push(el(`${container}.part${k}`, 'component', container));
      if (c > 0) relations.push(rel(`sys${s}.svc${c - 1}.part0`, `${container}.part1`));
    }
    relations.push(rel(`user${s % 3}`, `sys${s}.svc0`));
    if (s > 0) relations.push(rel(`sys${s - 1}.svc1.part2`, `sys${s}.svc0.part0`));
  }
  for (let x = 0; x < 3; x++) { elements.push(el(`ext${x}`, 'external', null)); relations.push(rel(`sys${x * 2}.svc1`, `ext${x}`)); }
  return { elements, relations, views: [], flows: [] };
}

const starter = async (): Promise<ArchModel> => {
  const meta = (await compile(C4_STARTER)).frame.metadata.dsl as { arch?: { model?: unknown } };
  return archModelFromJson(meta.arch?.model)!;
};

// Order preserved (tau-b median >= 0.9, min >= 0.75) and no jump over 2x the growth, as for repo maps.
describe('C4 layout stability', () => {
  it.each([
    ['starter', starter, { median: 0.9, min: 0.75 }],
    ['generated 71-element model', async () => generated(), { median: 0.9, min: 0.75 }],
  ] as const)('keeps boxes in order and avoids wild jumps when one more opens: %s', { timeout: 120_000 }, async (name, build, floor) => {
    const model = fromArch(await build());
    const r = await measureStability(model, presets(model).overview);
    console.log(`c4 stability ${name}: ${Object.keys(model.nodes).length - 1} boxes, ${r.opens} opens, tau median ${r.tauMedian.toFixed(2)} min ${r.tauMin.toFixed(2)}, max jump/growth ${r.maxJumpPerGrowth.toFixed(2)}`);
    expect(r.opens).toBeGreaterThan(0);
    expect(r.tauMedian).toBeGreaterThanOrEqual(floor.median);
    expect(r.tauMin).toBeGreaterThanOrEqual(floor.min);
    expect(r.maxJumpPerGrowth).toBeLessThanOrEqual(2);
  });
});
