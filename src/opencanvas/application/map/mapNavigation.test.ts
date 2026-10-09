import { describe, expect, it } from 'vitest';
import { buildMap } from '../../../dsl/map/build';
import { FIXTURE } from '../../../dsl/map/fixture';
import { presets } from '../../../dsl/map/view';
import type { AggEdge } from '../../../dsl/map/types';
import { depthOf, edgeLayerCounts, presetOpen, sameOpen, siblingMove, topLeftFirst } from './mapNavigation';

const model = buildMap(FIXTURE);

describe('presets', () => {
  it('presetOpen copies the engine preset; Top level is every box shut', () => {
    for (const d of ['detailed', 'everything'] as const) {
      expect([...presetOpen(model, d)]).toEqual([...presets(model)[d]]);
      expect(presetOpen(model, d)).not.toBe(presets(model)[d]);
    }
    expect(presetOpen(model, 'overview').size).toBe(0);
    // A small map's engine overview opens its top level; the dial keeps Top level and One level in apart.
    const small = buildMap({ files: [{ path: 'a/x.ts', loc: 1 }, { path: 'b/y.ts', loc: 1 }], imports: [] });
    expect(presets(small).overview.size).toBeGreaterThan(0);
    expect(depthOf(small, new Set())).toBe('overview');
    expect(depthOf(small, presetOpen(small, 'detailed'))).toBe('detailed');
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

describe('sameOpen', () => {
  it('sameOpen compares members, not identity', () => {
    expect(sameOpen(new Set(['a', 'b']), new Set(['b', 'a']))).toBe(true);
    expect(sameOpen(new Set(['a']), new Set(['a', 'b']))).toBe(false);
    expect(sameOpen(new Set(['a']), new Set(['b']))).toBe(false);
  });
});

describe('topLeftFirst', () => {
  it('orders by row, then column, then id', () => {
    const rects = new Map([['b', { x: 10, y: 0 }], ['a', { x: 10, y: 0 }], ['c', { x: 0, y: 0 }], ['d', { x: 0, y: 5 }]]);
    expect(['d', 'b', 'a', 'c'].sort(topLeftFirst(rects))).toEqual(['c', 'a', 'b', 'd']);
  });
});
