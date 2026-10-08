import { describe, expect, it } from 'vitest';
import { buildMap } from './build';
import { FIXTURE } from './fixture';
import type { MapFacts } from './types';

const model = buildMap(FIXTURE);
const childIds = (id: string) => model.nodes[id].children;

describe('buildMap tree', () => {
  it('makes parts from facts.parts under the root, then loose root files', () => {
    expect(childIds('root')).toEqual(['server', 'web', 'README.md', 'root#outside']);
    expect(model.nodes.web).toMatchObject({ kind: 'part', name: 'Web app', desc: 'The storefront.', path: 'web' });
  });

  it('falls back to top-level folders as parts, collapsing chains onto the deepest id', () => {
    const m = buildMap({ files: [{ path: 'pkg/core/a.ts', loc: 1 }, { path: 'docs/x.md', loc: 1 }], imports: [] });
    expect(m.nodes.root.children).toEqual(['docs', 'pkg/core']);
    expect(m.nodes['pkg/core']).toMatchObject({ kind: 'part', name: 'pkg/core/' });
  });

  it('collapses a single-child folder chain: the deepest id is kept and shows the whole chain', () => {
    expect(childIds('web')).toEqual(['web/lib/deep/only', 'web/ui', 'web/App.tsx']);
    expect(model.nodes['web/lib/deep/only']).toMatchObject({ kind: 'folder', name: 'lib/deep/only/', parent: 'web', files: 1 });
    expect(model.nodes['web/lib']).toBeUndefined();
  });

  it('folds a flat folder of 16 files into the 12 most connected plus "4 more files"', () => {
    const kids = childIds('server/routes');
    expect(kids).toHaveLength(13);
    expect(kids.slice(0, 3)).toEqual(['server/routes/r00.ts', 'server/routes/r01.ts', 'server/routes/r02.ts']);
    expect(kids.at(-1)).toBe('server/routes#more');
    expect(model.nodes['server/routes#more']).toMatchObject({ kind: 'more', name: '4 more files', files: 4 });
    expect(childIds('server/routes#more')).toEqual(['server/routes/r12.ts', 'server/routes/r13.ts', 'server/routes/r14.ts', 'server/routes/r15.ts']);
  });

  it('does not fold 14 or fewer', () => {
    const files = Array.from({ length: 14 }, (_, i) => ({ path: `d/f${String(i).padStart(2, '0')}.ts`, loc: 1 }));
    const m = buildMap({ files, imports: [] });
    expect(m.nodes[m.nodes.root.children[0]].children).toHaveLength(14);
  });

  it('sums files and loc per node, and counts files in stats', () => {
    expect(model.nodes.root.files).toBe(model.stats.files);
    expect(model.nodes['server/routes'].loc).toBe(Array.from({ length: 16 }, (_, i) => 10 + i).reduce((a, b) => a + b, 0));
    expect(model.nodes['ext:stripe']).toMatchObject({ kind: 'external', files: 0, loc: 0 });
    expect(model.stats.loc).toBe(model.nodes.root.loc);
  });

  it('adds "Outside services" only when there are externals', () => {
    expect(model.nodes['root#outside']).toMatchObject({ kind: 'group', name: 'Outside services', children: ['ext:stripe'] });
    expect(buildMap({ files: FIXTURE.files, imports: [] }).nodes['root#outside']).toBeUndefined();
  });

  it('names the root from the repo and counts a repeated file once', () => {
    expect(model.nodes.root.name).toBe('shop');
    const m = buildMap({ files: [{ path: 'a.ts', loc: 3 }, { path: 'a.ts', loc: 9 }], imports: [] });
    expect(m.stats).toMatchObject({ files: 1, loc: 9 });
  });

  it('survives empty facts', () => {
    const m = buildMap({ files: [], imports: [] });
    expect(m.nodes.root).toMatchObject({ children: [], files: 0, name: 'Repository' });
  });

  it('is byte-identical whatever order any input array arrives in', () => {
    const facts: MapFacts = {
      ...FIXTURE,
      externals: [...FIXTURE.externals!, { id: 'ext:aws', name: 'AWS' }],
      links: [
        ...FIXTURE.links!,
        { from: 'server/routes/r01.ts', to: 'ext:stripe', kind: 'data', evidence: [{ file: 'b.ts', line: 2, text: 'x' }, { file: 'a.ts', line: 7, text: 'y' }] },
        { from: 'server/routes/r01.ts', to: 'ext:aws', kind: 'call', evidence: [] },
      ],
    };
    const a = JSON.stringify(buildMap(facts));
    const rev = <T,>(x: T[]) => [...x].reverse();
    const rot = <T,>(x: T[]) => [...x.slice(2), ...x.slice(0, 2)];
    for (const f of [rev, rot]) {
      const shuffled: MapFacts = {
        ...facts, files: f(facts.files), imports: f(facts.imports), parts: f(facts.parts!), externals: f(facts.externals!),
        links: f(facts.links!).map((l) => ({ ...l, evidence: f(l.evidence) })),
      };
      expect(JSON.stringify(buildMap(shuffled))).toBe(a);
    }
  });

  it('takes the larger loc for a repeated file, in either order', () => {
    const one = buildMap({ files: [{ path: 'a.ts', loc: 3 }, { path: 'a.ts', loc: 9 }], imports: [] });
    const two = buildMap({ files: [{ path: 'a.ts', loc: 9 }, { path: 'a.ts', loc: 3 }], imports: [] });
    expect([one.stats.loc, two.stats.loc]).toEqual([9, 9]);
  });

  it('gives a part the id of its dir, so it cannot collide with a top-level folder', () => {
    const m = buildMap({
      files: [{ path: 'apps/web/a.ts', loc: 1 }, { path: 'web/b.ts', loc: 1 }],
      imports: [],
      parts: [{ id: 'web', name: 'The app', dir: 'apps/web/' }],
    });
    expect(m.nodes['apps/web']).toMatchObject({ kind: 'part', name: 'The app', path: 'apps/web' });
    expect(m.nodes.web).toMatchObject({ kind: 'part', name: 'web/' });
    expect(m.nodes['apps/web/a.ts'].parent).toBe('apps/web');
  });

  it('keeps the first of two parts on the same dir', () => {
    const m = buildMap({
      files: [{ path: 'a/x.ts', loc: 1 }], imports: [],
      parts: [{ name: 'Zed', dir: 'a' }, { name: 'Alpha', dir: 'a' }],
    });
    expect(m.nodes.root.children).toEqual(['a']);
    expect(m.nodes.a.name).toBe('Zed');
  });
});

describe('buildMap links', () => {
  it('groups import lines per file pair, sorted by line, with trimmed evidence', () => {
    const l = model.links.find((x) => x.from === 'web/App.tsx' && x.to === 'server/routes/r00.ts')!;
    expect(l.evidence.map((e) => e.line)).toEqual([3, 4]);
    expect(l.evidence[0]).toMatchObject({ file: 'web/App.tsx', text: "import x from 'server/routes/r00.ts';" });
  });

  it('points toKind dir imports at the folder, including through a collapsed chain', () => {
    expect(model.links.some((l) => l.from === 'web/App.tsx' && l.to === 'web/ui')).toBe(true);
    expect(model.links.some((l) => l.from === 'web/App.tsx' && l.to === 'web/lib/deep/only')).toBe(true);
  });

  it('counts unknown endpoints as unresolved and drops them', () => {
    expect(model.stats.unresolved).toBe(2); // nope.ts and ext:missing
    expect(model.links.some((l) => l.to === 'nope.ts' || l.to === 'ext:missing')).toBe(false);
    expect(model.stats.imports).toBe(12);
  });

  it('keeps facts.links as given', () => {
    expect(model.links.find((l) => l.to === 'ext:stripe')).toMatchObject({ kind: 'call', label: 'charges' });
  });
});

describe('buildMap overlay', () => {
  it('renames nodes and marks them ai, leaving ids alone', () => {
    const m = buildMap(FIXTURE, { names: { server: { name: 'Backend', desc: 'Takes the orders.' } } });
    expect(m.nodes.server).toMatchObject({ name: 'Backend', desc: 'Takes the orders.', ai: true });
    expect(m.nodes.web.ai).toBeUndefined();
  });

  it('groups loose files of a folder and folds inside the group', () => {
    const m = buildMap(FIXTURE, { groups: { 'server/routes': [{ key: 'pay', name: 'Payments', files: ['server/routes/r01.ts', 'server/routes/r02.ts', 'server/routes/zzz.ts'] }] } });
    expect(m.nodes['server/routes#pay']).toMatchObject({ kind: 'group', name: 'Payments', ai: true, files: 2 });
    expect(m.nodes['server/routes'].children).toContain('server/routes#pay');
    expect(m.nodes['server/routes/r01.ts'].parent).toBe('server/routes#pay');
    expect(m.nodes['server/routes'].children.filter((c) => c.endsWith('.ts'))).toHaveLength(14); // 14 left: under the fold limit
  });

  it('skips a group keyed "more" and a repeated key rather than colliding', () => {
    const files = ['server/routes/r01.ts', 'server/routes/r02.ts', 'server/routes/r03.ts'];
    const m = buildMap(FIXTURE, { groups: { 'server/routes': [
      { key: 'more', name: 'Bad', files },
      { key: 'a', name: 'First', files: [files[0]] },
      { key: 'a', name: 'Second', files: [files[1]] },
    ] } });
    expect(m.nodes['server/routes#a'].name).toBe('First');
    expect(m.nodes['server/routes#more'].kind).toBe('more');
    expect(m.nodes['server/routes/r02.ts'].parent).toBe('server/routes');
  });

  it('applies a name keyed by a shallower path of a collapsed chain to the surviving node', () => {
    const m = buildMap(FIXTURE, { names: { 'web/lib': { name: 'Helpers', desc: 'Small tools.' } } });
    expect(m.nodes['web/lib/deep/only']).toMatchObject({ name: 'Helpers', desc: 'Small tools.', ai: true });
    const exact = buildMap(FIXTURE, { names: { 'web/lib': { name: 'Shallow' }, 'web/lib/deep/only': { name: 'Exact' } } });
    expect(exact.nodes['web/lib/deep/only'].name).toBe('Exact');
  });
});
