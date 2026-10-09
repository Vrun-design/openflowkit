import { describe, expect, it } from 'vitest';
import { buildMap } from '../../../dsl/map/build';
import { FIXTURE } from '../../../dsl/map/fixture';
import { presets, visible } from '../../../dsl/map/view';
import type { AggEdge } from '../../../dsl/map/types';
import { oneLevel } from './navigate';
import { canExpandOne, collapseAll, depthOf, edgeLayerCounts, expandOneLevel, MAP_BOX_BUDGET, presetOpen, sameOpen, siblingMove } from './mapNavigation';

const model = buildMap(FIXTURE);
const files = (n: number) => Array.from({ length: n }, (_, i) => ({ path: `a/f${i}.ts`, loc: 1 }));
const wide = (parts: number, each: number) => buildMap({ files: Array.from({ length: parts }, (_, p) => Array.from({ length: each }, (_, i) => ({ path: `p${p}/d${i % 12}/f${i}.ts`, loc: 1 }))).flat(), imports: [] });

describe('expandOneLevel', () => {
  it('opens one level more, and keeps going', () => {
    const one = expandOneLevel(model, new Set());
    expect(one.has('server')).toBe(true);
    expect(expandOneLevel(model, one).size).toBeGreaterThan(one.size);
  });
  it('returns the same set when nothing is left to open', () => {
    let open: ReadonlySet<string> = new Set();
    for (let i = 0; i < 10; i++) open = expandOneLevel(model, open);
    expect(expandOneLevel(model, open)).toBe(open);
  });
  it('never opens a more box', () => {
    const m = buildMap({ files: files(40), imports: [] });
    const more = Object.values(m.nodes).find((n) => n.kind === 'more')!;
    expect(more).toBeTruthy();
    const open = new Set(['a']);
    expect(expandOneLevel(m, open)).toBe(open);
    expect(expandOneLevel(m, new Set()).has(more.id)).toBe(false);
  });
  it('refuses a step past the box budget', () => {
    const m = wide(40, 36);
    let open: ReadonlySet<string> = new Set();
    for (let i = 0; i < 6; i++) {
      const next = expandOneLevel(m, open);
      expect(visible(m, next).length).toBeLessThanOrEqual(MAP_BOX_BUDGET);
      if (next === open) break;
      open = next;
    }
    const refused = expandOneLevel(m, open);
    expect(refused).toBe(open);
    expect(visible(m, oneLevel(m, open)).length).toBeGreaterThan(MAP_BOX_BUDGET);
    expect(visible(m, refused).length).toBeLessThanOrEqual(MAP_BOX_BUDGET);
  });
  it('is deterministic', () => {
    expect([...expandOneLevel(model, new Set())]).toEqual([...expandOneLevel(model, new Set())]);
  });
});

describe('collapse and presets', () => {
  it('collapseAll is empty and fresh each time', () => {
    expect(collapseAll().size).toBe(0);
    expect(collapseAll()).not.toBe(collapseAll());
  });
  it('presetOpen copies the engine preset', () => {
    for (const d of ['overview', 'detailed', 'everything'] as const) {
      expect([...presetOpen(model, d)]).toEqual([...presets(model)[d]]);
      expect(presetOpen(model, d)).not.toBe(presets(model)[d]);
    }
  });
  it('depthOf names a preset state and null for a custom one', () => {
    expect(depthOf(model, presetOpen(model, 'everything'))).not.toBeNull();
    expect(depthOf(model, new Set(['server', 'web', 'nope']))).toBeNull();
  });
});

describe('siblingMove', () => {
  // root > a, b (row); a open > a1, a2 (row)
  const m = buildMap({ files: [{ path: 'a/a1/x.ts', loc: 1 }, { path: 'a/a2/y.ts', loc: 1 }, { path: 'b/z.ts', loc: 1 }], imports: [] });
  const [a, b, a1, a2] = ['a', 'b', 'a/a1', 'a/a2'];
  const box = (x: number, y: number) => ({ x, y, width: 100, height: 50 });
  const rects = new Map([[a, box(0, 0)], [b, box(300, 0)], [a1, box(10, 60)], [a2, box(130, 60)]]);
  const open = new Set([a]);
  it('moves left and right between siblings', () => {
    expect(siblingMove(m, open, a, 'right', rects)).toBe(b);
    expect(siblingMove(m, open, b, 'left', rects)).toBe(a);
    expect(siblingMove(m, open, a1, 'right', rects)).toBe(a2);
  });
  it('stays put at the edges', () => {
    expect(siblingMove(m, open, a, 'left', rects)).toBeNull();
    expect(siblingMove(m, open, b, 'right', rects)).toBeNull();
    expect(siblingMove(m, open, a, 'up', rects)).toBeNull();
    expect(siblingMove(m, open, b, 'down', rects)).toBeNull();
  });
  it('down enters an open box, up leaves it', () => {
    expect(siblingMove(m, open, a, 'down', rects)).toBe(a1);
    expect(siblingMove(m, open, a2, 'up', rects)).toBe(a);
    expect(siblingMove(m, open, a1, 'left', rects)).toBeNull();
  });
  it('does not enter a shut box or a box that is not drawn', () => {
    expect(siblingMove(m, new Set(), a, 'down', rects)).toBeNull();
    expect(siblingMove(m, open, a, 'down', new Map([[a, box(0, 0)]]))).toBeNull();
    expect(siblingMove(m, open, 'ghost', 'down', rects)).toBeNull();
  });
  it('is deterministic', () => {
    expect(siblingMove(m, open, a, 'right', rects)).toBe(siblingMove(m, open, a, 'right', new Map(rects)));
  });
});

describe('edgeLayerCounts', () => {
  const edge = (kind: AggEdge['kind'], count: number) => ({ kind, count }) as AggEdge;
  it('sums lines per kind and omits absent kinds', () => {
    expect(edgeLayerCounts([edge('import', 3), edge('import', 2), edge('call', 1)])).toEqual({ import: 5, call: 1 });
    expect(edgeLayerCounts([])).toEqual({});
  });
});

describe('canExpandOne and sameOpen', () => {
  it('canExpandOne is true until everything on screen is open or a leaf', () => {
    expect(canExpandOne(model, new Set())).toBe(true);
    let open: ReadonlySet<string> = new Set();
    for (let i = 0; i < 10; i++) open = oneLevel(model, open);
    expect(canExpandOne(model, open)).toBe(false);
  });
  it('sameOpen compares members, not identity', () => {
    expect(sameOpen(new Set(['a', 'b']), new Set(['b', 'a']))).toBe(true);
    expect(sameOpen(new Set(['a']), new Set(['a', 'b']))).toBe(false);
    expect(sameOpen(new Set(['a']), new Set(['b']))).toBe(false);
  });
});
