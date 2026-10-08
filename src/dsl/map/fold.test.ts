import { describe, expect, it } from 'vitest';
import { foldFiles, planBudget, tokens } from './fold';

const f = (names: string[]) => names.map((n) => `d/${n}`);
const edges = (pairs: [string, string][], times = 1) => pairs.flatMap(([a, b]) => Array.from({ length: times }, () => ({ from: `d/${a}`, to: `d/${b}` })));
const all = (r: ReturnType<typeof foldFiles>) => [...r.groups.flatMap((g) => g.files), ...r.loose, ...r.more].sort();

// Two tight clusters (a1..a5 chain-ish, b1..b5) and one bridge edge, plus two unrelated files.
const A = ['a1.ts', 'a2.ts', 'a3.ts', 'a4.ts', 'a5.ts'];
const B = ['b1.ts', 'b2.ts', 'b3.ts', 'b4.ts', 'b5.ts'];
const clique = (xs: string[]): [string, string][] => xs.flatMap((x, i) => xs.slice(i + 1).map((y): [string, string] => [x, y]));
const CLUSTER_FILES = f([...A, ...B, 'x.ts', 'y.ts']);
const CLUSTER_EDGES = [...edges(clique(A)), ...edges(clique(B)), ...edges([['a1.ts', 'b1.ts']])];

describe('tokens', () => {
  it('splits camel, Pascal, kebab, snake and digits, dropping extensions', () => {
    expect(tokens('x/useV2Canvas.test.tsx')).toEqual(['use', 'v2', 'canvas']);
    expect(tokens('x/PixiTextRenderer.ts')).toEqual(['pixi', 'text', 'renderer']);
    expect(tokens('x/edge-label_panel.ts')).toEqual(['edge', 'label', 'panel']);
    expect(tokens('x/HTMLParser.ts')).toEqual(['html', 'parser']);
  });
});

describe('foldFiles: import communities', () => {
  it('splits two tight clusters joined by one bridge into two groups, named by the most-imported file', () => {
    const r = foldFiles(CLUSTER_FILES, CLUSTER_EDGES, 6);
    expect(r.groups.map((g) => g.files)).toEqual([f(A), f(B)]);
    expect(r.groups.map((g) => g.key)).toEqual(['a5', 'b5']); // a5 and b5 receive the most imports in their clique
    expect(r.loose).toEqual(f(['x.ts', 'y.ts']));
    expect(r.more).toEqual([]);
  });

  it('still groups by shared filename words when the imports show no clusters', () => {
    const names = ['useAlpha.ts', 'useBeta.ts', 'useGamma.ts', ...A, ...B.slice(0, 3)];
    // every file imports four others spread around the folder: one tangled blob
    const tangle = names.flatMap((n, i): [string, string][] => [1, 2, 4, 5].map((d) => [n, names[(i + d) % names.length]]));
    const r = foldFiles(f(names), edges(tangle), 5);
    expect(r.groups.map((g) => g.name)).toEqual(['Hooks']);
  });
});

describe('foldFiles: filename stems', () => {
  const names = ['useA.ts', 'useB.ts', 'useC.ts', 'XPanel.tsx', 'YPanel.tsx', 'ZPanel.tsx', 'misc.ts', 'other.ts', 'zed.ts'];

  it('groups shared leading and trailing words and names them in plain words', () => {
    const r = foldFiles(f(names), [], 5);
    expect(r.groups.map((g) => [g.name, g.key, g.files.length])).toEqual([['Panel', 'panel', 3], ['Hooks', 'hooks', 3]]);
    expect(r.loose).toEqual(f(['misc.ts', 'other.ts', 'zed.ts']));
  });

  it('names a shared prefix and suffix together', () => {
    const r = foldFiles(f(['PixiAxisRenderer.ts', 'PixiBoxRenderer.ts', 'PixiTextRenderer.ts', 'a.ts', 'b.ts', 'c.ts', 'd.ts']), [], 5);
    expect(r.groups[0]).toMatchObject({ name: 'Pixi renderer', key: 'pixi-renderer' });
  });

  it('needs three files for a group and never groups everything into one', () => {
    expect(foldFiles(f(['useA.ts', 'useB.ts', 'a.ts', 'b.ts', 'c.ts', 'd.ts']), [], 4).groups).toEqual([]);
    expect(foldFiles(f(['useA.ts', 'useB.ts', 'useC.ts', 'useD.ts']), [], 2).groups).toEqual([]);
  });

  it('keeps group keys unique inside the folder', () => {
    const r = foldFiles(f(['aPanel.ts', 'bPanel.ts', 'cPanel.ts', 'Panel/x.ts', 'xPanel.ts', 'x_panel.ts', 'q1.ts', 'q2.ts', 'q3.ts']), [], 4);
    const keys = r.groups.map((g) => g.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('foldFiles: budget', () => {
  it('returns everything loose when it already fits', () => {
    const r = foldFiles(f(['b.ts', 'a.ts']), [], 14);
    expect(r).toEqual({ groups: [], loose: f(['a.ts', 'b.ts']), more: [] });
  });

  it('keeps groups + loose + the more box within the budget, folding the least connected', () => {
    const names = Array.from({ length: 20 }, (_, i) => `f${String(i).padStart(2, '0')}.ts`);
    const r = foldFiles(f(names), edges([['f19.ts', 'f18.ts'], ['f19.ts', 'f17.ts'], ['f18.ts', 'f17.ts']]), 6);
    expect(r.groups).toEqual([]);
    expect(r.loose).toEqual(f(['f00.ts', 'f01.ts', 'f17.ts', 'f18.ts', 'f19.ts']));
    expect(r.more).toHaveLength(15);
    expect(all(r)).toEqual(f(names).sort());
    expect(r.groups.length + r.loose.length + 1).toBeLessThanOrEqual(6);
  });

  it('every file lands in exactly one place, also when groups overflow the budget', () => {
    const r = foldFiles(CLUSTER_FILES, CLUSTER_EDGES, 3);
    expect(all(r)).toEqual([...CLUSTER_FILES].sort());
    expect(r.groups.length + r.loose.length + (r.more.length ? 1 : 0)).toBeLessThanOrEqual(3);
  });

  it('ignores imports to files outside the folder and self imports', () => {
    const r = foldFiles(CLUSTER_FILES, [...CLUSTER_EDGES, { from: 'd/a1.ts', to: 'elsewhere/z.ts' }, { from: 'd/x.ts', to: 'd/x.ts' }], 6);
    expect(r.groups).toHaveLength(2);
  });
});

describe('foldFiles: determinism', () => {
  it('gives the same answer for any input order', () => {
    const base = JSON.stringify(foldFiles(CLUSTER_FILES, CLUSTER_EDGES, 6));
    expect(JSON.stringify(foldFiles([...CLUSTER_FILES].reverse(), [...CLUSTER_EDGES].reverse(), 6))).toBe(base);
    const stems = f(['useA.ts', 'useB.ts', 'useC.ts', 'XPanel.tsx', 'YPanel.tsx', 'ZPanel.tsx', 'misc.ts', 'other.ts']);
    expect(JSON.stringify(foldFiles(stems.reverse(), [], 5))).toBe(JSON.stringify(foldFiles([...stems].sort(), [], 5)));
  });
});

describe('planBudget', () => {
  const subs = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `s${String(i).padStart(2, '0')}`, degree: i }));
  it('gives files what the subfolders leave, never less than 2', () => {
    expect(planBudget(subs(0))).toEqual({ keep: [], folded: [], files: 14 });
    expect(planBudget(subs(5)).files).toBe(9);
    expect(planBudget(subs(12))).toMatchObject({ folded: [], files: 2 });
  });

  it('folds the least connected subfolders into more when there are too many', () => {
    const p = planBudget(subs(20));
    expect(p.keep).toHaveLength(11);
    expect(p.keep).toContain('s19');
    expect(p.folded).toHaveLength(9);
    expect(p.folded).toContain('s00');
    expect(p.files).toBe(2);
    expect(p.keep.length + p.files).toBeLessThanOrEqual(14);
  });
});

describe('foldFiles: filename words', () => {
  const chart = ['ChartAxisPanel.tsx', 'ChartLegendPanel.tsx', 'ChartDataPanel.tsx', 'ChartTitlePanel.tsx'];
  const icons = ['autoIcon.ts', 'iconMatch.ts', 'iconSet.ts'];
  const other = ['alpha.ts', 'beta.ts', 'gamma.ts', 'delta.ts', 'omega.ts'];

  it('treats a word in half the folder as its namespace and leaves it out of names', () => {
    const names = ['PixiBoxRenderer.ts', 'PixiLineRenderer.ts', 'PixiTextRenderer.ts', 'PixiAxisOverlay.ts', 'PixiGridOverlay.ts', 'PixiKeyOverlay.ts', 'PixiHost.ts', 'PixiStage.ts'];
    const r = foldFiles(f(names), [], 5);
    expect(r.groups.map((g) => g.name)).toEqual(['Overlay', 'Renderer']);
  });

  it('groups files that share a rarer word with no imports at all, and names it plainly', () => {
    const r = foldFiles(f([...icons, 'tableRow.ts', 'tableCell.ts', 'tableHead.ts', ...other, 'zeta.ts', 'eta.ts']), [], 12);
    expect(r.groups.map((g) => g.name)).toEqual(['Icon', 'Table']);
    expect(r.groups[0].files).toEqual(f(icons).sort());
  });

  it('names a group with two words when they travel together ("Chart panels"), never "files"', () => {
    const r = foldFiles(f([...chart, ...icons, ...other]), [], 8);
    const names = r.groups.map((g) => g.name);
    expect(names).toContain('Chart panel');
    expect(names.some((n) => /files/i.test(n))).toBe(false);
  });

  it('uses the most-imported file when members share no word', () => {
    const r = foldFiles(CLUSTER_FILES, CLUSTER_EDGES, 6);
    expect(r.groups.map((g) => g.name)).toEqual(['a5', 'b5']);
  });

  it('splits a community that swallows over half the folder', () => {
    const X = ['x1.ts', 'x2.ts', 'x3.ts', 'x4.ts'];
    const Y = ['y1.ts', 'y2.ts', 'y3.ts', 'y4.ts'];
    const Z = ['z1.ts', 'z2.ts', 'z3.ts', 'z4.ts'];
    const files = f([...X, ...Y, ...Z, 'p.ts', 'q.ts']);
    const r = foldFiles(files, edges([...clique(X), ...clique(Y), ...clique(Z), ['x1.ts', 'y1.ts'], ['y2.ts', 'z1.ts'], ['x2.ts', 'z2.ts']]), 6);
    expect(r.groups.length).toBeGreaterThanOrEqual(3);
    expect(Math.max(...r.groups.map((g) => g.files.length))).toBeLessThanOrEqual(files.length / 2);
  });

  it('uppercases a short word that was written as an acronym, and leaves plain short words alone', () => {
    const r = foldFiles(f(['AIPanel.ts', 'AIChat.ts', 'AIKey.ts', 'boxA.ts', 'boxB.ts', 'boxC.ts', 'zeta.ts', 'eta.ts', 'iota.ts']), [], 7);
    expect(r.groups.map((g) => g.name)).toEqual(['AI', 'Box']);
  });

  it('names a use* group after its next word, or plain "Hooks"', () => {
    const names = ['useCanvasZoom.ts', 'useCanvasPan.ts', 'useCanvasTool.ts', 'tableRow.ts', 'tableCell.ts', 'tableHead.ts', ...other, 'zeta.ts', 'eta.ts', 'iota.ts', 'kappa.ts'];
    expect(foldFiles(f(names), [], 12).groups.map((g) => g.name)).toEqual(['Table', 'Canvas hooks']);
    // a prefix shared with nothing else: only the stem is left to name it
    const plain = ['useAlpha.ts', 'useBeta.ts', 'useGamma.ts', ...other, 'zeta.ts', 'eta.ts', 'iota.ts', 'kappa.ts', 'lambda.ts', 'mu.ts'];
    expect(foldFiles(f(plain), [], 12).groups.map((g) => g.name)).toEqual(['Hooks']);
  });

  it('tells two groups with the same name apart by their next word, not a number', () => {
    const names = ['AxisChartPanel.ts', 'LegendChartPanel.ts', 'TitleChartPanel.ts', 'AxisTablePanel.ts', 'LegendTablePanel.ts', 'TitleTablePanel.ts', 'zz1.ts', 'zz2.ts', 'zz3.ts'];
    const r = foldFiles(f(names), [], 7);
    const out = r.groups.map((g) => g.name);
    expect(new Set(out).size).toBe(out.length);
    expect(out.every((n) => !/\d$/.test(n))).toBe(true);
  });

  it('never names a group "index", "main" or empty: the top file keeps its full name', () => {
    const A2 = ['p1.ts', 'p2.ts', 'p3.ts', 'p4.ts'];
    const B2 = ['q1.ts', 'q2.ts', 'q3.ts', 'q4.ts'];
    const hub = (xs: string[], to: string): [string, string][] => xs.map((x) => [x, to]);
    const files = f(['index.ts', ...A2, 'main.ts', ...B2, 'r.ts', 's.ts']);
    const r = foldFiles(files, edges([...hub(A2, 'index.ts'), ...hub(B2, 'main.ts'), ...clique(A2), ...clique(B2)]), 8);
    expect(r.groups.map((g) => g.name).sort()).toEqual(['index.ts', 'main.ts']);
  });

  it('ranks overflow by the global degree when it is given, not the internal one', () => {
    const names = Array.from({ length: 10 }, (_, i) => `z${i}.ts`);
    const global = new Map(f(names).map((p, i) => [p, 10 - i]));
    const r = foldFiles(f(names), [], 4, global);
    expect(r.loose).toEqual(f(['z0.ts', 'z1.ts', 'z2.ts']));
    expect(r.more).toHaveLength(7);
  });

  it('counts a pair of files once however many lines import it', () => {
    const lines = Array.from({ length: 50 }, () => ({ from: 'd/a1.ts', to: 'd/b1.ts' }));
    const once = foldFiles(CLUSTER_FILES, [...CLUSTER_EDGES.filter((e) => !(e.from === 'd/a1.ts' && e.to === 'd/b1.ts'))], 6);
    expect(JSON.stringify(foldFiles(CLUSTER_FILES, [...CLUSTER_EDGES, ...lines], 6))).toBe(JSON.stringify(foldFiles(CLUSTER_FILES, [...CLUSTER_EDGES, lines[0]], 6)));
    expect(once.groups).toHaveLength(2);
  });
});
