import { describe, expect, it } from 'vitest';
import { buildMap } from './build';
import { FIXTURE } from './fixture';
import type { MapFacts } from './types';

const model = buildMap(FIXTURE);
const childIds = (id: string) => model.nodes[id].children;

describe('buildMap tree', () => {
  it('makes parts from facts.parts under the root, then loose root files', () => {
    expect(childIds('root')).toEqual(['server', 'web', 'root#files', 'root#outside']);
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

  it('folds a flat folder of 16 files into the 13 most connected plus "3 more files": 14 children with the box', () => {
    const kids = childIds('server/routes');
    expect(kids).toHaveLength(14);
    expect(kids.slice(0, 3)).toEqual(['server/routes/r00.ts', 'server/routes/r01.ts', 'server/routes/r02.ts']);
    expect(kids.at(-1)).toBe('server/routes#more');
    expect(model.nodes['server/routes#more']).toMatchObject({ kind: 'more', name: '3 more files', files: 3 });
    expect(childIds('server/routes#more')).toEqual(['server/routes/r13.ts', 'server/routes/r14.ts', 'server/routes/r15.ts']);
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

  it('treats a dir import of the repo root as a real import of the root box, not unresolved', () => {
    const m = buildMap({ files: [{ path: 'sub/s.go', loc: 1 }, { path: 'gin.go', loc: 1 }], imports: [{ from: 'sub/s.go', to: '', line: 3, text: 'import "x/gin"', toKind: 'dir' }, { from: 'sub/s.go', to: '.', line: 4, text: 'import "x/gin"', toKind: 'dir' }] });
    expect(m.stats).toMatchObject({ unresolved: 0, imports: 2 });
    expect(m.links).toMatchObject([{ from: 'sub/s.go', to: 'root' }]);
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
    expect(m.nodes['server/routes'].children.filter((c) => c.endsWith('.ts'))).toHaveLength(12); // 14 left, 13 slots (one is the group) minus the more box
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

describe('buildMap folding', () => {
  const widest = (m: ReturnType<typeof buildMap>) => Math.max(...Object.values(m.nodes).map((n) => n.children.length));

  it('keeps every box in the fixture to 14 children or fewer', () => {
    expect(widest(model)).toBeLessThanOrEqual(14);
  });

  it('keeps every box to 14 children for a 200-file folder beside 20 subfolders, and places every file once', () => {
    const kinds = ['Panel', 'Menu', 'Dialog', 'Chart', 'Table'];
    const loose = Array.from({ length: 200 }, (_, i) => ({ path: `app/${kinds[i % 5]}${String(i).padStart(3, '0')}Item.ts`, loc: 1 + i }));
    const subs = Array.from({ length: 20 }, (_, s) => Array.from({ length: 3 }, (_, i) => ({ path: `app/s${String(s).padStart(2, '0')}/f${i}.ts`, loc: 5 })));
    const files = [...loose, ...subs.flat()];
    const imports = loose.slice(1).map((f, i) => ({ from: f.path, to: loose[i].path, line: 1, text: 'i' }));
    const m = buildMap({ files, imports });
    expect(widest(m)).toBeLessThanOrEqual(14);
    const placed = Object.values(m.nodes).filter((n) => n.kind === 'file');
    expect(placed).toHaveLength(260);
    expect(new Set(placed.map((n) => n.id)).size).toBe(260);
    expect(m.nodes.root.files).toBe(260);
    const app = m.nodes.app;
    expect(app.children.length).toBeLessThanOrEqual(14);
    expect(m.nodes['app#more'].name).toMatch(/^\d+ more folders?( and \d+ more files?)?$|^\d+ more files?$/);
    expect(Object.values(m.nodes).some((n) => n.kind === 'group' && n.ai === false)).toBe(true);
  });

  it('puts loose root files in one "Repo files" group once there are parts or folders, and not otherwise', () => {
    expect(model.nodes['root#files']).toMatchObject({ kind: 'group', name: 'Repo files', ai: false, parent: 'root', children: ['README.md'] });
    const m = buildMap({ files: [file('vite.config.ts'), file('a/x.ts'), ...Array.from({ length: 20 }, (_, i) => file(`tool${String(i).padStart(2, '0')}.config.js`))], imports: [] });
    expect(m.nodes.root.children).toContain('root#files');
    expect(m.nodes['vite.config.ts'].parent).not.toBe('root');
    expect(widest(m)).toBeLessThanOrEqual(14);
    const flat = buildMap({ files: [file('a.ts'), file('b.ts')], imports: [] });
    expect(flat.nodes.root.children).toEqual(['a.ts', 'b.ts']);
  });

  it('names a more box for what it holds: folders, files or both', () => {
    const subs = Array.from({ length: 14 }, (_, s) => ({ path: `p/d${String(s).padStart(2, '0')}/a.ts`, loc: 1 }));
    expect(buildMap({ files: subs, imports: [] }).nodes['p#more'].name).toBe('3 more folders');
    const files = Array.from({ length: 18 }, (_, i) => ({ path: `q/f${String(i).padStart(2, '0')}.ts`, loc: 1 }));
    expect(buildMap({ files, imports: [] }).nodes['q#more'].name).toBe('5 more files');
    expect(buildMap({ files: [...files, ...subs.slice(0, 3).map((f) => ({ path: `q/${f.path.slice(2)}`, loc: 1 }))], imports: [] }).nodes['q#more']).toBeDefined();
  });

  it('lets overlay groups win: fold.ts only sees the files the overlay leaves loose', () => {
    const mine = ['server/routes/r05.ts', 'server/routes/r06.ts'];
    const m = buildMap(FIXTURE, { groups: { 'server/routes': [{ key: 'x', name: 'Mine', files: mine }] } });
    expect(m.nodes['server/routes#x']).toMatchObject({ ai: true, files: 2 });
    for (const f of mine) expect(m.nodes[f].parent).toBe('server/routes#x');
    expect(widest(m)).toBeLessThanOrEqual(14);
  });

  // Reviewer's inputs: every one used to leave some box wider than 14.
  const check = (m: ReturnType<typeof buildMap>, files: number) => {
    expect(widest(m)).toBeLessThanOrEqual(14);
    expect(Object.values(m.nodes).filter((n) => n.kind === 'file')).toHaveLength(files);
    expect(m.nodes.root.files).toBe(files);
  };
  const file = (path: string) => ({ path, loc: 1 });

  it('folds 20 top-level folders into the root `more` box', () => {
    const m = buildMap({ files: Array.from({ length: 20 }, (_, i) => file(`t${String(i).padStart(2, '0')}/a.ts`)), imports: [] });
    check(m, 20);
    expect(m.nodes['root#more'].name).toBe('9 more parts');
  });

  it('folds 16 declared parts', () => {
    const ids = Array.from({ length: 16 }, (_, i) => `p${String(i).padStart(2, '0')}`);
    const m = buildMap({ files: ids.map((d) => file(`${d}/a.ts`)), imports: [], parts: ids.map((d) => ({ name: d, dir: d })) });
    check(m, 16);
    expect(m.nodes.root.children).toHaveLength(12); // 11 kept parts + the more box
  });

  it('fits 12 top-level folders, 20 root files and an external in 14', () => {
    const files = [...Array.from({ length: 12 }, (_, i) => file(`t${String(i).padStart(2, '0')}/a.ts`)), ...Array.from({ length: 20 }, (_, i) => file(`root${String(i).padStart(2, '0')}.ts`))];
    check(buildMap({ files, imports: [], externals: [{ id: 'ext:x', name: 'X' }] }), 32);
  });

  it('counts overlay groups against the 14: 12 and 16 groups', () => {
    for (const n of [12, 16]) {
      const names = Array.from({ length: n * 2 }, (_, i) => `server/routes/g${String(i).padStart(2, '0')}.ts`);
      const groups = Array.from({ length: n }, (_, g) => ({ key: `k${g}`, name: `Group ${g}`, files: [names[g * 2], names[g * 2 + 1]] }));
      const m = buildMap({ files: names.map(file), imports: [] }, { groups: { 'server/routes': groups } });
      check(m, n * 2);
    }
  });

  it('folds many outside services too', () => {
    const externals = Array.from({ length: 20 }, (_, i) => ({ id: `ext:s${String(i).padStart(2, '0')}`, name: `S${i}` }));
    const m = buildMap({ files: [file('a/x.ts')], imports: [], externals });
    expect(widest(m)).toBeLessThanOrEqual(14);
    expect(Object.values(m.nodes).filter((n) => n.kind === 'external')).toHaveLength(20);
  });

  it('splits an overflowing `more` box into alphabetical ranges, each 14 or fewer', () => {
    const files = Array.from({ length: 300 }, (_, i) => file(`big/x${String(i).padStart(3, '0')}.ts`));
    const m = buildMap({ files, imports: [] });
    check(m, 300);
    const ranges = Object.values(m.nodes).filter((n) => n.kind === 'group' && n.name.includes('\u2013'));
    expect(ranges.length).toBeGreaterThan(1);
    expect(ranges[0].name).toMatch(/^x\d+ \u2013 x\d+$/);
  });
});

describe('buildMap speed', () => {
  it('builds a 1,000-file folder with 2,000 imports well inside the budget', () => {
    const words = ['panel', 'menu', 'dialog', 'chart', 'table', 'canvas', 'export', 'import', 'style', 'theme', 'pointer', 'camera', 'layer', 'frame', 'render', 'input', 'tool', 'page', 'home', 'agent'];
    const cap = (w: string) => w[0].toUpperCase() + w.slice(1);
    const files = Array.from({ length: 1000 }, (_, i) => ({ path: `big/${cap(words[i % 20])}${cap(words[(i * 7 + 3) % 20])}V${i}.ts`, loc: 10 }));
    const imports = Array.from({ length: 2000 }, (_, i) => ({ from: files[(i * 13) % 1000].path, to: files[(i * 29 + 5) % 1000].path, line: 1, text: 'i' }));
    const t0 = performance.now();
    const m = buildMap({ files, imports });
    const ms = performance.now() - t0;
    console.log(`buildMap 1,000 files / 2,000 imports: ${ms.toFixed(0)} ms`);
    expect(Math.max(...Object.values(m.nodes).map((n) => n.children.length))).toBeLessThanOrEqual(14);
    expect(ms).toBeLessThan(250);
  });
});
