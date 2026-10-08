import { compare } from './tree';

// Semantic folding without AI (plan §2.4): split one box's loose files into groups so that no box
// holds more than the budget. Pure and deterministic: the same files and imports give the same groups
// in any input order. (a) communities on a hybrid graph (import lines plus shared filename words), else
// (b) shared filename prefixes/suffixes, else nothing: the least-connected files fold into "more".
// Words shared by half the folder (a namespace: `pixi`, `v2`) say nothing about which files belong
// together, so they are dropped before anything else looks at a name.

export interface Folded {
  groups: { key: string; name: string; files: string[] }[];
  loose: string[];
  more: string[];
}

const MIN_Q = 0.25; // modularity below this is not a real clustering (sparse folders cluster at 0.25-0.3)
const MIN_STEM = 3; // files a shared prefix/suffix needs to count as a group
const ROUNDS = 20; // move-pass cap; it usually settles in 2-4
const NAMESPACE = 0.5; // a word in at least this share of the files is the folder's namespace
const MAX_DF = 40; // a word in more files than this glues too many pairs (and is near-namespace anyway)
const BIG = 0.5; // a community holding more than this share of the files is split again
const GENERIC = new Set(['index', 'types', 'type', 'utils', 'util', 'helpers', 'helper', 'constants', 'config', 'file', 'files', 'test', 'tests', 'spec', 'init', 'main', 'mod']);
const WEAK_NAME = new Set(['index', 'init', 'main', 'mod']); // never a group's name: use the file's full name

/** Cap on how many boxes one folder may show (plan principle 2). */
export const MAX_CHILDREN = 14;

/**
 * Splits a box's child budget between its sub-boxes and its files (order is preserved). Subfolders keep their slots
 * (files get `limit - S`, never below 2). With too many subfolders the least connected ones fold into
 * the folder's `more` box together with overflow files; `files` then includes that box's slot.
 */
export function planBudget(subfolders: { id: string; degree: number }[], limit = MAX_CHILDREN): { keep: string[]; folded: string[]; files: number } {
  const all = subfolders.map((s) => s.id);
  if (subfolders.length <= limit - 2) return { keep: all, folded: [], files: limit - subfolders.length };
  const ranked = [...subfolders].sort((a, b) => b.degree - a.degree || compare(a.id, b.id));
  const kept = new Set(ranked.slice(0, limit - 3).map((s) => s.id));
  return { keep: all.filter((id) => kept.has(id)), folded: all.filter((id) => !kept.has(id)), files: 2 };
}

/**
 * `imports` (internal to these files) only shape the clustering. Which boxes survive an overflow is
 * ranked by `degreeOf`, the file's imports in or out across the whole repo, when given.
 */
export function foldFiles(files: string[], imports: { from: string; to: string }[], budget: number, degreeOf?: ReadonlyMap<string, number>): Folded {
  const paths = [...new Set(files)].sort(compare);
  const room = Math.max(2, budget);
  if (paths.length <= room) return { groups: [], loose: paths, more: [] };

  const n = paths.length;
  const index = new Map(paths.map((p, i) => [p, i]));
  const adj: Map<number, number>[] = paths.map(() => new Map());
  const degree = new Array<number>(n).fill(0);
  const inDegree = new Array<number>(n).fill(0);
  const link = (a: number, b: number) => {
    adj[a].set(b, (adj[a].get(b) ?? 0) + 1);
    adj[b].set(a, (adj[b].get(a) ?? 0) + 1);
  };
  // An edge says "these two are linked", not how many lines say so. Pairs are linked in sorted order so
  // the adjacency (and every tie it decides) is the same whatever order the imports arrive in.
  const directed = new Set<number>();
  for (const { from, to } of imports) {
    const a = index.get(from);
    const b = index.get(to);
    if (a !== undefined && b !== undefined && a !== b) directed.add(a * n + b);
  }
  const linked = new Set<number>();
  for (const key of [...directed].sort((x, y) => x - y)) {
    const a = Math.floor(key / n);
    const b = key % n;
    inDegree[b]++;
    const pair = Math.min(a, b) * n + Math.max(a, b);
    if (linked.has(pair)) continue;
    linked.add(pair);
    link(a, b);
    degree[a]++;
    degree[b]++;
  }

  const words = distinctive(paths);
  // Files that share a distinctive word are probably siblings in meaning, whatever they import.
  const byWord = new Map<string, number[]>();
  words.forEach((ws, i) => new Set(ws).forEach((w) => (byWord.get(w) ?? byWord.set(w, []).get(w)!).push(i)));
  for (const at of byWord.values()) {
    // Rarer words glue harder (inverse document frequency): a word half the folder shares binds nothing.
    const w = Math.log(n / at.length) / Math.log(n);
    if (at.length > 1 && at.length <= MAX_DF) for (let x = 0; x < at.length; x++) for (let y = x + 1; y < at.length; y++) link2(adj, at[x], at[y], w);
  }

  const community = byCommunity(adj);
  const acr = acronyms(paths);
  const named = community ? nameByWords(community, paths, words, inDegree, acr) : nameByStem(byStem(words) ?? [], paths, words, acr);
  const grouped = new Set(named.flatMap((g) => g.files));
  const loose = paths.filter((p) => !grouped.has(p));

  // Over budget: keep the best-connected boxes, send the rest to "more" (the more box takes a slot).
  const score = (p: string) => degreeOf?.get(p) ?? degree[index.get(p)!];
  interface Item { group?: Folded['groups'][number]; file?: string; score: number; id: string }
  const items: Item[] = [
    ...named.map((g) => ({ group: g, score: g.files.reduce((s, f) => s + score(f), 0), id: g.files[0] })),
    ...loose.map((f) => ({ file: f, score: score(f), id: f })),
  ];
  if (items.length <= room) return { groups: named, loose, more: [] };
  const ranked = [...items].sort((a, b) => b.score - a.score || compare(a.id, b.id));
  const kept = new Set(ranked.slice(0, room - 1));
  const more = items.filter((it) => !kept.has(it)).flatMap((it) => (it.group ? it.group.files : [it.file!])).sort(compare);
  return {
    groups: items.filter((it) => kept.has(it) && it.group).map((it) => it.group!),
    loose: items.filter((it) => kept.has(it) && it.file).map((it) => it.file!).sort(compare),
    more,
  };
}

/** Lowercase words of a file name: camel/Pascal/kebab/snake split, digits kept with their word, extensions dropped. */
export function tokens(path: string): string[] {
  const stem = path.slice(path.lastIndexOf('/') + 1).split('.')[0];
  return stem.split(/[-_\s]+/).flatMap((w) => w.match(/[A-Z]+[0-9]*(?![a-z])|[A-Z]?[a-z]+[0-9]*|[0-9]+/g) ?? []).map((t) => t.toLowerCase());
}

// Each file's meaningful words: no namespace (shared by half the folder), no generic filler, no lone
// letters or numbers. Order is kept so prefixes and suffixes still mean something.
function link2(adj: Map<number, number>[], a: number, b: number, w: number) {
  adj[a].set(b, (adj[a].get(b) ?? 0) + w);
  adj[b].set(a, (adj[b].get(a) ?? 0) + w);
}

function distinctive(paths: string[]): string[][] {
  const all = paths.map(tokens);
  const df = new Map<string, number>();
  for (const ws of all) for (const w of new Set(ws)) df.set(w, (df.get(w) ?? 0) + 1);
  const keep = (w: string) => w.length > 1 && !/^\d+$/.test(w) && !GENERIC.has(w) && df.get(w)! < paths.length * NAMESPACE;
  return all.map((ws) => ws.filter(keep));
}

// Greedy modularity moves (Louvain's first phase) on the weighted undirected graph restricted to `nodes`.
// Plain label propagation merged two cliques joined by one import; modularity moves do not. Nodes are
// visited in index (= path) order and ties go to the smallest community id: no randomness.
function louvain(nodes: number[], adj: Map<number, number>[]): { groups: number[][]; q: number } {
  const set = new Set(nodes);
  const k = new Map<number, number>();
  let m = 0;
  for (const i of nodes) {
    let d = 0;
    for (const [j, w] of adj[i]) if (set.has(j)) d += w;
    k.set(i, d);
    m += d;
  }
  m /= 2;
  if (!m) return { groups: nodes.map((i) => [i]), q: 0 };
  const label = new Map(nodes.map((i) => [i, i]));
  const tot = new Map(k);
  for (let round = 0; round < ROUNDS; round++) {
    let moved = false;
    for (const i of nodes) {
      const own = label.get(i)!;
      tot.set(own, tot.get(own)! - k.get(i)!);
      const into = new Map<number, number>([[own, 0]]);
      for (const [j, w] of adj[i]) if (set.has(j)) into.set(label.get(j)!, (into.get(label.get(j)!) ?? 0) + w);
      const gain = (c: number) => into.get(c)! - (tot.get(c)! * k.get(i)!) / (2 * m);
      // Highest gain wins; a tie goes to the smaller id (own stays unless something is strictly better).
      let best = own;
      let bestGain = gain(own);
      for (const c of into.keys()) {
        const g = gain(c);
        if (g > bestGain + 1e-9 || (best !== own && Math.abs(g - bestGain) <= 1e-9 && c < best)) {
          best = c;
          bestGain = g;
        }
      }
      tot.set(best, (tot.get(best) ?? 0) + k.get(i)!);
      if (best !== own) {
        label.set(i, best);
        moved = true;
      }
    }
    if (!moved) break;
  }
  const comms = new Map<number, number[]>();
  for (const i of nodes) (comms.get(label.get(i)!) ?? comms.set(label.get(i)!, []).get(label.get(i)!)!).push(i);
  // Q = sum over communities of (inside weight / m) - (degree sum / 2m)^2
  let q = 0;
  for (const c of comms.values()) {
    const inC = new Set(c);
    let inside = 0;
    let deg = 0;
    for (const i of c) for (const [j, w] of adj[i]) if (set.has(j)) {
      deg += w;
      if (inC.has(j) && i < j) inside += w;
    }
    q += inside / m - (deg / (2 * m)) ** 2;
  }
  return { groups: [...comms.values()], q };
}

const real = (groups: number[][]) => groups.filter((g) => g.length >= 2);

// (a) Communities, only when believable (modularity >= MIN_Q, two or more of two or more files).
// One that swallows over half the folder is split once more, since a lone giant tells the reader nothing.
function byCommunity(adj: Map<number, number>[]): number[][] | null {
  const top = louvain(adj.map((_, i) => i), adj);
  const groups = real(top.groups);
  if (top.q < MIN_Q || groups.length < 2) return null;
  return groups.flatMap((g) => {
    if (g.length <= adj.length * BIG) return [g];
    const sub = louvain([...g].sort((a, b) => a - b), adj);
    const parts = real(sub.groups);
    return sub.q >= MIN_Q && parts.length >= 2 ? parts : [g];
  });
}

// (b) Shared leading or trailing words (`*Panel`, `Connector*`). Greedy: take the candidate that covers
// the most still-ungrouped files, ties to the more specific (more words), then prefix, then key.
function byStem(words: string[][]): number[][] | null {
  const cands = new Map<string, { len: number; prefix: boolean; at: number[] }>();
  words.forEach((t, i) => {
    for (let k = 1; k <= 2 && k < t.length; k++) {
      for (const prefix of [true, false]) {
        const key = `${prefix ? 'p' : 's'}:${(prefix ? t.slice(0, k) : t.slice(-k)).join(' ')}`;
        (cands.get(key) ?? cands.set(key, { len: k, prefix, at: [] }).get(key)!).at.push(i);
      }
    }
  });
  const taken = new Set<number>();
  const out: number[][] = [];
  for (;;) {
    let best: { key: string; at: number[]; len: number; prefix: boolean } | null = null;
    for (const [key, c] of cands) {
      const at = c.at.filter((i) => !taken.has(i));
      if (at.length < MIN_STEM || at.length === words.length) continue;
      const better = !best || at.length > best.at.length
        || (at.length === best.at.length && (c.len > best.len || (c.len === best.len && ((c.prefix && !best.prefix) || (c.prefix === best.prefix && key < best.key)))));
      if (better) best = { key, at, len: c.len, prefix: c.prefix };
    }
    if (!best) break;
    for (const i of best.at) taken.add(i);
    out.push(best.at);
  }
  return out.length ? out : null;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const baseOf = (p: string) => p.slice(p.lastIndexOf('/') + 1);
const stemOf = (p: string) => baseOf(p).split('.')[0];

// Words that were written as a short all-caps run somewhere in the folder (`AIPanel`, `SVGExport`) are
// acronyms and keep that look in names; "box" or "map" in lower case stay words.
function acronyms(paths: string[]): Set<string> {
  const out = new Set<string>();
  for (const p of paths) for (const m of stemOf(p).match(/[A-Z]{2,3}(?![a-z])/g) ?? []) out.add(m.toLowerCase());
  return out;
}

const say = (words: string[], acr: Set<string>) => words.map((w, i) => (acr.has(w) ? w.toUpperCase() : i ? w : cap(w))).join(' ');

// Slug keys, unique inside the folder (never "more", which is the overflow box); groups ordered by their
// first path. Two groups with one name are told apart by their next most distinctive word ("Panel · chart");
// a number is the last resort.
function finish(raw: { name: string; files: string[]; extras: string[] }[]) {
  const same = new Map<string, number>();
  for (const g of raw) same.set(g.name, (same.get(g.name) ?? 0) + 1);
  const keys = new Set(['more']);
  const names = new Set<string>();
  return raw.map((g) => ({ ...g, files: [...g.files].sort(compare) })).sort((a, b) => compare(a.files[0], b.files[0])).map((g) => {
    let name = !g.name.trim() ? baseOf(g.files[0]) : same.get(g.name)! > 1 && g.extras.length ? `${g.name} · ${g.extras[0]}` : g.name;
    for (let i = 2; names.has(name); i++) name = `${g.name} ${i}`;
    names.add(name);
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'group';
    let key = base;
    for (let i = 2; keys.has(key); i++) key = `${base}-${i}`;
    keys.add(key);
    return { key, name, files: g.files };
  });
}

// A community is named by what its members share: the commonest distinctive word, plus a second one when
// it travels with the first in 60% of them ("Chart panel"). A leading `use` (the hooks convention) makes it
// "<next word> hooks". No shared word: the most-imported member's stem.
function nameByWords(groups: number[][], paths: string[], words: string[][], inDegree: number[], acr: Set<string>) {
  return finish(groups.map((g) => {
    const count = new Map<string, number>();
    for (const i of g) for (const w of new Set(words[i])) count.set(w, (count.get(w) ?? 0) + 1);
    const ranked = [...count].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1] || compare(a[0], b[0])).map(([w]) => w);
    const files = g.map((i) => paths[i]);
    if (!ranked.length) {
      const top = [...g].sort((a, b) => inDegree[b] - inDegree[a] || a - b)[0];
      const stem = stemOf(paths[top]);
      return { name: !stem || WEAK_NAME.has(stem.toLowerCase()) ? baseOf(paths[top]) : stem, files, extras: [] };
    }
    const first = ranked[0];
    const withFirst = g.filter((i) => words[i].includes(first));
    let second = ranked.slice(1).find((w) => withFirst.filter((i) => words[i].includes(w)).length >= 0.6 * g.length);
    if (first === 'use' && !second) second = ranked[1];
    const at = (w: string) => withFirst.reduce((s, i) => s + words[i].indexOf(w), 0);
    const parts = second ? [first, second].sort((a, b) => at(a) - at(b)) : [first];
    const name = parts[0] === 'use' ? (parts[1] ? `${say([parts[1]], acr)} hooks` : 'Hooks') : say(parts, acr);
    return { name, files, extras: ranked.filter((w) => !parts.includes(w)).map((w) => (acr.has(w) ? w.toUpperCase() : w)) };
  }));
}

// A stem group is named by the words all its members share at the start and/or end ("Pixi renderer").
function nameByStem(groups: number[][], paths: string[], words: string[][], acr: Set<string>) {
  return finish(groups.map((g) => {
    const t = g.map((i) => words[i]);
    let lead = 0;
    while (t.every((x) => x.length > lead + 1 && x[lead] === t[0][lead])) lead++;
    let tail = 0;
    while (t.every((x) => x.length > lead + tail + 1 && x[x.length - 1 - tail] === t[0][t[0].length - 1 - tail])) tail++;
    const head = t[0].slice(0, lead);
    const end = t[0].slice(t[0].length - tail);
    const name = head[0] === 'use' ? (end.length || head.length > 1 ? `${say(head.slice(1).concat(end), acr)} hooks` : 'Hooks') : say([...head, ...end], acr);
    return { name, files: g.map((i) => paths[i]), extras: [] };
  }));
}

/**
 * Phone-book split for what overflowed a box: sorted by label, then cut into ranges of at most MAX_CHILDREN,
 * each range a box (`${parent}#r${i}`) named "first - last", recursively. No graph, nothing to rank: just findable.
 * The caller says how an item and a range box are made, so buildMap and fromArch share the rule.
 */
export function placeMore<T extends { key: string; label: string }>(
  parent: string, items: readonly T[], make: { item: (item: T, parent: string) => void; range: (id: string, parent: string, name: string) => void },
): void {
  const sorted = [...items].sort((a, b) => compare(a.label.toLowerCase(), b.label.toLowerCase()) || compare(a.key, b.key));
  if (sorted.length <= MAX_CHILDREN) return sorted.forEach((it) => make.item(it, parent));
  let size = 1;
  while (Math.ceil(sorted.length / size) > MAX_CHILDREN) size *= MAX_CHILDREN;
  for (let i = 0; i < sorted.length; i += size) {
    const chunk = sorted.slice(i, i + size);
    if (chunk.length === 1) { make.item(chunk[0], parent); continue; }
    const id = `${parent}#r${i}`;
    make.range(id, parent, `${chunk[0].label.slice(0, 12)} \u2013 ${chunk[chunk.length - 1].label.slice(0, 12)}`);
    placeMore(id, chunk, make);
  }
}

const count = (n: number, noun: string) => `${n} more ${n === 1 ? noun : noun.endsWith('x') ? `${noun}es` : `${noun}s`}`;

/** "5 more folders" when the folded boxes share a noun, else "5 more <fallback>s"; `files` loose files are added to it. */
export function moreLabel(nouns: readonly string[], files = 0, fallback = 'box'): string {
  const same = new Set(nouns);
  const boxes = nouns.length ? count(nouns.length, same.size === 1 ? nouns[0] : fallback) : '';
  return boxes && files ? `${boxes} and ${count(files, 'file')}` : boxes || count(files, 'file');
}
