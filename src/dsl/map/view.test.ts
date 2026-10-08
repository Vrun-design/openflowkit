import { describe, expect, it } from 'vitest';
import { buildMap } from './build';
import { FIXTURE } from './fixture';
import { aggregate, edgeText, linksOf, presets, representative, search, visible } from './view';
import type { MapFacts } from './types';

const model = buildMap(FIXTURE);
const open = (...ids: string[]) => new Set(ids);

describe('visible / representative', () => {
  it('lists the root children, plus the children of open boxes right after them', () => {
    expect(visible(model, open())).toEqual(['server', 'web', 'root#files', 'root#outside']);
    expect(visible(model, open('web'))).toEqual(['server', 'web', 'web/lib/deep/only', 'web/ui', 'web/App.tsx', 'root#files', 'root#outside']);
  });

  it('puts a hidden node in its nearest visible ancestor, and a visible node in itself', () => {
    const rep = representative(model, open('web'));
    expect(rep('web/ui/Button.tsx')).toBe('web/ui');
    expect(rep('web/ui')).toBe('web/ui');
    expect(rep('web')).toBe('web'); // open box: arrows to a folder land on it
    expect(rep('server/routes/r00.ts')).toBe('server');
  });
});

describe('aggregate', () => {
  it('merges both directions between the parts and counts real lines', () => {
    const { edges } = aggregate(model, open(), ['import']);
    expect(edges).toHaveLength(1);
    const e = edges[0];
    expect(e).toMatchObject({ parent: 'root', from: 'server', to: 'web', forward: 3, reverse: 3, both: true, count: 6 });
    expect(edgeText(e)).toBe('3 ⇄ 3');
    // a tie goes the way the ids sort; each direction keeps its own lines
    expect(e.evidence.map((x) => x.file).sort()).toEqual(['server/routes/r00.ts', 'server/routes/r01.ts', 'server/routes/r02.ts']);
    expect(e.reverseEvidence.map((x) => x.file)).toEqual(['web/App.tsx', 'web/App.tsx', 'web/App.tsx']);
  });

  it('puts arrows between siblings under the lowest common ancestor once boxes open', () => {
    const { edges } = aggregate(model, open('web', 'server'), ['import']);
    const keys = edges.map((e) => `${e.parent}:${e.from}>${e.to}`);
    expect(keys).toContain('web:web/App.tsx>web/ui'); // dir import, inside the open web box
    expect(keys).toContain('root:server>web'); // across parts the arrow stays where they split, however deep the ends
    for (const e of edges) expect(e.from).not.toBe(e.to);
  });

  it('draws nothing for a link inside one closed box, or from a box to its own descendant', () => {
    expect(aggregate(model, open(), ['import']).edges.some((e) => e.from === e.to)).toBe(false);
    const { edges } = aggregate(model, open('web'), ['import']);
    expect(edges.some((e) => e.from === 'web' || e.to === 'web')).toBe(true); // other parts still reach it
    expect(edges.filter((e) => e.parent === 'web').every((e) => e.from !== 'web')).toBe(true);
  });

  it('filters by layer and keeps call labels', () => {
    const calls = aggregate(model, open(), ['call']).edges;
    expect(calls).toHaveLength(1);
    expect(edgeText(calls[0])).toBe('charges');
    expect(calls[0]).toMatchObject({ from: 'server', to: 'root#outside', kind: 'call', inferred: false });
    expect(aggregate(model, open(), []).edges).toEqual([]);
  });

  it('marks an arrow inferred only when every link behind it is', () => {
    const m = buildMap({ ...FIXTURE, links: [{ from: 'web/App.tsx', to: 'ext:stripe', kind: 'call', inferred: true, evidence: [] }] });
    expect(aggregate(m, open(), ['call']).edges[0].inferred).toBe(true);
  });

  it('caps evidence at 80 lines per direction while the count stays exact', () => {
    const files = [{ path: 'a/x.ts', loc: 1 }, { path: 'b/y.ts', loc: 1 }];
    const imports = Array.from({ length: 100 }, (_, i) => ({ from: 'a/x.ts', to: 'b/y.ts', line: i + 1, text: 'import y' }));
    const e = aggregate(buildMap({ files, imports }), open(), ['import']).edges[0];
    expect(e.count).toBe(100);
    expect(e.evidence).toHaveLength(80);
    expect(e.both).toBe(false);
  });
});

describe('presets', () => {
  it('overview opens the top level, detailed two levels, everything stays within 300 boxes', () => {
    const p = presets(model);
    expect([...p.overview].sort()).toEqual(['root#files', 'root#outside', 'server', 'web']);
    expect(p.detailed.has('server/routes')).toBe(true);
    expect(p.detailed.has('server/routes#more')).toBe(false); // never auto-open "more"
    expect(p.everything.has('server/routes')).toBe(true);
    expect(p.everything.has('server/routes#more')).toBe(false);
    expect(p.overview.has('root')).toBe(false);
  });

  it('falls back to a shut map when a hand-made model opens past 300 boxes at the top level', () => {
    // buildMap never produces this (14 x 14 at most); other model sources might.
    const ids = Array.from({ length: 400 }, (_, i) => `p${i}`);
    const node = (id: string, parent: string | null, children: string[]) => ({ id, kind: 'part' as const, name: id, parent, children, files: 0, loc: 0 });
    const wide = {
      root: 'root', links: [], source: {}, stats: { files: 0, loc: 0, imports: 0, unresolved: 0 },
      nodes: { root: node('root', null, ids), ...Object.fromEntries(ids.map((id) => [id, node(id, 'root', [`${id}/a`])])), ...Object.fromEntries(ids.map((id) => [`${id}/a`, node(`${id}/a`, id, [])])) },
    };
    const p = presets(wide);
    expect([p.overview.size, p.detailed.size, p.everything.size]).toEqual([0, 0, 0]);
  });

  it('stops everything before the visible count passes 300', () => {
    const files: MapFacts['files'] = [];
    for (let a = 0; a < 6; a++) for (let b = 0; b < 12; b++) for (let c = 0; c < 6; c++) files.push({ path: `p${a}/d${b}/e${c}/f.ts`, loc: 1 });
    const big = buildMap({ files, imports: [] });
    const p = presets(big);
    expect(visible(big, p.everything).length).toBeLessThanOrEqual(300);
    expect(p.everything.size).toBeGreaterThanOrEqual(p.overview.size);
    expect(visible(big, p.detailed).length).toBeLessThanOrEqual(visible(big, p.everything).length);
  });
});

describe('linksOf', () => {
  it('groups what leaves a box by where it lands now, busiest first', () => {
    const talks = linksOf(model, 'web', open());
    expect(talks.map((t) => [t.id, t.out, t.in])).toEqual([['server', 3, 3]]);
    expect(talks[0].links.length).toBeGreaterThan(0);
  });

  it('follows the open state: an open neighbour shows its boxes', () => {
    expect(linksOf(model, 'web', open('server', 'server/routes')).map((t) => t.id)).toContain('server/routes/r00.ts');
  });

  it('ignores links inside the box and calls out to externals', () => {
    expect(linksOf(model, 'web/ui', open('web')).map((t) => t.id)).toEqual(['web/App.tsx']);
    expect(linksOf(model, 'server', open()).map((t) => t.id)).toContain('root#outside');
  });
});

describe('search', () => {
  it('matches names and paths, prefix matches first, then shallower', () => {
    expect(search(model, 'routes')[0]).toBe('server/routes');
    expect(search(model, 'r00')).toEqual(['server/routes/r00.ts']);
    expect(search(model, 'ui').slice(0, 1)).toEqual(['web/ui']);
    expect(search(model, '  ')).toEqual([]);
    expect(search(model, 'nothing-like-this')).toEqual([]);
  });

  it('respects the limit and never returns the root', () => {
    expect(search(model, 'r', 3)).toHaveLength(3);
    expect(search(model, 'shop')).toEqual([]);
  });
});
