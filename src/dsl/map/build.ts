import { foldFiles, MAX_CHILDREN, planBudget } from './fold';
import { compare } from './tree';
import type { Evidence, MapFacts, MapLink, MapModel, MapNode, MapNodeKind, MapOverlay } from './types';

// Facts -> tree. Ids: folder = path, file = path, group = `${folder}#${key}`,
// more = `${container}#more`, outside group = 'root#outside'. A folder chain with one
// child and no files (a/b/c) collapses into ONE node that keeps the DEEPEST id (a/b/c),
// named "a/b/c/"; the shallower paths stay resolvable for `toKind: 'dir'` imports.
// No box holds more than MAX_CHILDREN children: overlay groups first, then fold.ts groups what is left
// (by imports and filename words), and the least connected folders/files wait in one `more` box,
// which is itself folded the same way when it is big.

const TEXT_MAX = 140;
const OUTSIDE = 'root#outside';

const push = (map: Map<string, string[]>, key: string, value: string) => {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
};

export function buildMap(facts: MapFacts, overlay: MapOverlay = {}): MapModel {
  // No prototype: a folder called `constructor` or `__proto__` is a key like any other.
  const nodes: Record<string, MapNode> = Object.create(null);
  const alias = new Map<string, string>(); // folder path -> id of the node that stands for it
  const loc = new Map<string, number>();
  for (const f of facts.files) loc.set(f.path, Math.max(loc.get(f.path) ?? f.loc, f.loc)); // duplicates: the larger count, whatever the order
  const paths = [...loc.keys()].sort(compare);

  // How connected a file is decides which ones survive folding.
  const degree = new Map<string, number>();
  const bump = (id: string) => degree.set(id, (degree.get(id) ?? 0) + 1);
  for (const i of facts.imports) {
    bump(i.from);
    if (i.toKind !== 'dir') bump(i.to);
  }
  for (const l of facts.links ?? []) {
    bump(l.from);
    bump(l.to);
  }

  const add = (id: string, kind: MapNodeKind, parent: string | null, name: string, extra: Partial<MapNode> = {}): MapNode => {
    const given = overlay.names?.[id];
    if (nodes[id]) throw new Error(`map: duplicate node id ${id}`);
    const node: MapNode = {
      id, kind, name: given?.name ?? name, parent, children: [], files: 0, loc: 0, ...extra,
      ...(given ? { desc: given.desc ?? extra.desc, ai: true } : {}),
    };
    for (const k of Object.keys(node) as (keyof MapNode)[]) if (node[k] === undefined) delete node[k];
    nodes[id] = node;
    if (parent) nodes[parent].children.push(id);
    return node;
  };

  const split = (dir: string, files: string[]) => {
    const sub = new Map<string, string[]>();
    const loose: string[] = [];
    for (const f of files) {
      const rel = dir ? f.slice(dir.length + 1) : f;
      const slash = rel.indexOf('/');
      if (slash < 0) loose.push(f);
      else push(sub, rel.slice(0, slash), f);
    }
    return { sub, loose };
  };

  const importsFrom = new Map<string, string[]>();
  for (const i of facts.imports) if (i.toKind !== 'dir') push(importsFrom, i.from, i.to);
  const baseName = (p: string) => p.slice(p.lastIndexOf('/') + 1);
  const addFile = (f: string, parent: string) => add(f, 'file', parent, baseName(f), { path: f, files: 1, loc: loc.get(f) });
  const sum = (fs: string[]) => fs.reduce((s, f) => s + (degree.get(f) ?? 0), 0);

  // Anything that can sit in a box: a folder, a part, an overlay group, an outside service, a file.
  // `make` builds it under a parent id, so a box can decide late whether it is kept or folded away.
  interface Item { key: string; label: string; noun: string; degree: number; make: (parent: string) => void }
  const fileItem = (f: string): Item => ({ key: f, label: baseName(f).split('.')[0], noun: 'file', degree: degree.get(f) ?? 0, make: (p) => addFile(f, p) });
  const folderItem = (dir: string, files: string[], kind: MapNodeKind = 'folder'): Item => ({
    key: dir, label: baseName(dir), noun: kind === 'part' ? 'part' : 'folder', degree: sum(files), make: (p) => folder(dir, p, files, kind),
  });
  // Overlay group ids are reserved up front: a folded group is only built later, inside `more`.
  const reserved = new Set<string>();

  // Phone-book split for what overflowed: sorted by name, then cut into ranges of at most MAX_CHILDREN,
  // each range a box named "first - last", recursively. No graph, nothing to rank: just findable.
  const placeMore = (parent: string, items: Item[]) => {
    const sorted = [...items].sort((a, b) => compare(a.label.toLowerCase(), b.label.toLowerCase()) || compare(a.key, b.key));
    if (sorted.length <= MAX_CHILDREN) return sorted.forEach((it) => it.make(parent));
    let size = 1;
    while (Math.ceil(sorted.length / size) > MAX_CHILDREN) size *= MAX_CHILDREN;
    for (let i = 0; i < sorted.length; i += size) {
      const chunk = sorted.slice(i, i + size);
      if (chunk.length === 1) { chunk[0].make(parent); continue; }
      const range = add(`${parent}#r${i}`, 'group', parent, `${chunk[0].label.slice(0, 12)} \u2013 ${chunk[chunk.length - 1].label.slice(0, 12)}`, { ai: false });
      placeMore(range.id, chunk);
    }
  };

  const count = (n: number, noun: string) => `${n} more ${n === 1 ? noun : noun.endsWith('x') ? `${noun}es` : `${noun}s`}`;
  const moreLabel = (folded: Item[], files: number) => {
    const nouns = new Set(folded.map((i) => i.noun));
    const boxes = folded.length ? count(folded.length, nouns.size === 1 ? [...nouns][0] : 'box') : '';
    return boxes && files ? `${boxes} and ${count(files, 'file')}` : boxes || count(files, 'file');
  };

  // One box, the same rule at every level (root, parts, folders, groups, outside): planBudget keeps the
  // best-connected sub-boxes, fold.ts groups the loose files, and what is left waits in `${id}#more`.
  const fillBox = (id: string, subs: Item[], files: string[], limit = MAX_CHILDREN) => {
    const plan = planBudget(subs.map((s) => ({ id: s.key, degree: s.degree })), limit);
    const byKey = new Map(subs.map((s) => [s.key, s]));
    for (const k of plan.keep) byKey.get(k)!.make(id);
    const here = new Set(files);
    const internal = files.flatMap((from) => (importsFrom.get(from) ?? []).filter((to) => here.has(to)).map((to) => ({ from, to })));
    const { groups, loose, more } = foldFiles(files, internal, plan.files, degree);
    for (const g of groups) {
      // fold.ts keeps its keys unique among its own groups; an overlay group may still hold one of them.
      let gid = `${id}#${g.key}`;
      for (let n = 2; nodes[gid] || reserved.has(gid); n++) gid = `${id}#${g.key}-${n}`;
      add(gid, 'group', id, g.name, { ai: false, path: nodes[id].path });
      fillBox(gid, [], g.files);
    }
    for (const f of loose) addFile(f, id);
    const folded = plan.folded.map((k) => byKey.get(k)!);
    if (!folded.length && !more.length) return;
    const box = add(`${id}#more`, 'more', id, moreLabel(folded, more.length), { desc: 'Fewer connections; open to list them.' });
    placeMore(box.id, [...folded, ...more.map(fileItem)]);
  };

  // Fill a folder: overlay groups are sub-boxes like any other and win over folding, so fold.ts only
  // sees the files they leave loose.
  const fill = (id: string, dir: string, files: string[]) => {
    const { sub, loose: all } = split(dir, files);
    let loose = all;
    const subs = [...sub.keys()].sort(compare).map((seg) => folderItem(dir ? `${dir}/${seg}` : seg, sub.get(seg)!));
    for (const g of overlay.groups?.[id] ?? (dir ? overlay.groups?.[dir] : undefined) ?? []) {
      const gid = `${id}#${g.key}`;
      const wanted = new Set(g.files);
      const mine = loose.filter((f) => wanted.has(f));
      // 'more' would collide with the overflow box `${id}#more`; a repeated key with the first group. Skipped, not drawn.
      if (!mine.length || g.key === 'more' || reserved.has(gid)) continue;
      reserved.add(gid);
      loose = loose.filter((f) => !wanted.has(f));
      subs.push({
        key: gid, label: g.name, noun: 'group', degree: sum(mine),
        make: (p) => {
          add(gid, 'group', p, g.name, { desc: g.desc, ai: true, path: dir || undefined });
          fillBox(gid, [], mine);
        },
      });
    }
    fillBox(id, subs, loose);
  };

  const folder = (start: string, parent: string, files: string[], kind: MapNodeKind = 'folder') => {
    let dir = start;
    const seen = [dir];
    for (;;) {
      const { sub, loose } = split(dir, files);
      if (loose.length || sub.size !== 1) break;
      dir = `${dir}/${[...sub.keys()][0]}`;
      seen.push(dir);
    }
    for (const p of seen) alias.set(p, dir);
    const label = dir.slice(start.lastIndexOf('/') + 1);
    // A name keyed by a shallower path of a collapsed chain belongs to the surviving node.
    const shallow = overlay.names?.[dir] ? undefined : seen.slice(0, -1).reverse().map((p) => overlay.names?.[p]).find(Boolean);
    add(dir, kind, parent, `${label}/`, { path: dir, ...(shallow ? { name: shallow.name, desc: shallow.desc, ai: true } : {}) });
    fill(dir, dir, files);
  };

  add('root', 'folder', null, facts.source?.repo?.split('/').pop() ?? 'Repository');

  // Parts own the files under their dir; the longest matching dir wins (nested parts).
  // A part IS its folder: its node id is the normalised dir, so it cannot collide with a top-level folder.
  // Sorted by dir for determinism; a second part on the same dir is dropped.
  const parts = [...(facts.parts ?? [])]
    .map((p) => ({ ...p, dir: p.dir.replace(/\/+$/, '') }))
    .sort((a, b) => compare(a.dir, b.dir))
    .filter((p, i, all) => i === 0 || all[i - 1].dir !== p.dir);
  const owner = (f: string) => parts.filter((p) => f.startsWith(`${p.dir}/`)).sort((a, b) => b.dir.length - a.dir.length)[0];
  const byPart = new Map<string, string[]>();
  const rest: string[] = [];
  for (const f of paths) {
    const p = owner(f);
    if (p) push(byPart, p.dir, f);
    else rest.push(f);
  }
  const items: Item[] = parts.map((p) => ({
    key: p.dir, label: p.name, noun: 'part', degree: sum(byPart.get(p.dir) ?? []),
    make: (parent: string) => {
      alias.set(p.dir, p.dir);
      add(p.dir, 'part', parent, p.name, { desc: p.desc, path: p.dir });
      fill(p.dir, p.dir, byPart.get(p.dir) ?? []);
    },
  }));
  // Everything outside a declared part: top-level folders become parts, root files fold loosely.
  const top = split('', rest);
  for (const seg of [...top.sub.keys()].sort(compare)) items.push(folderItem(seg, top.sub.get(seg)!, 'part'));

  // Config and tooling files at the repo root are not part of the product: one quiet group, so they
  // neither compete with the parts for the top level nor get ranked into it.
  const filesBox = items.length && top.loose.length;
  if (filesBox) {
    items.push({
      key: 'root#files', label: 'Repo files', noun: 'group', degree: sum(top.loose),
      make: (p) => {
        add('root#files', 'group', p, 'Repo files', { ai: false });
        fillBox('root#files', [], top.loose);
      },
    });
  }

  const externals = [...(facts.externals ?? [])]
    .sort((a, b) => compare(a.id, b.id))
    .filter((e, i, all) => i === 0 || all[i - 1].id !== e.id);
  if (externals.length) {
    const services: Item[] = externals.map((e) => ({
      key: e.id, label: e.name, noun: 'service', degree: degree.get(e.id) ?? 0, make: (p) => add(e.id, 'external', p, e.name, { desc: e.desc }),
    }));
    items.push({
      key: OUTSIDE, label: 'Outside services', noun: 'group', degree: services.reduce((s, x) => s + x.degree, 0),
      make: (p) => {
        add(OUTSIDE, 'group', p, 'Outside services', { desc: 'Services the code calls over the network.' });
        fillBox(OUTSIDE, services, []);
      },
    });
  }
  fillBox('root', items, filesBox ? [] : top.loose);

  const total = (id: string): void => {
    const n = nodes[id];
    if (n.kind === 'file') return;
    n.files = 0;
    n.loc = 0;
    for (const c of n.children) {
      total(c);
      n.files += nodes[c].files;
      n.loc += nodes[c].loc;
    }
  };
  total('root');

  // Links. A dir import lands on the folder; anything unknown is counted, never drawn.
  let unresolved = facts.unresolvedImports ?? 0;
  let importLines = 0;
  const grouped = new Map<string, MapLink>();
  for (const i of facts.imports) {
    // A dir import of '' or '.' is the repo-root package (Go): the root box. aggregate drops it as an ancestor link.
    const dir = i.to.replace(/\/$/, '');
    const to = i.toKind === 'dir' ? (dir === '' || dir === '.' ? 'root' : alias.get(dir)) : nodes[i.to]?.kind === 'file' ? i.to : undefined;
    if (nodes[i.from]?.kind !== 'file' || !to) { unresolved++; continue; }
    if (to === i.from) continue;
    const key = `${i.from}\0${to}`;
    const link = grouped.get(key) ?? grouped.set(key, { from: i.from, to, kind: 'import', evidence: [] }).get(key)!;
    link.evidence.push({ file: i.from, line: i.line, text: i.text.trim().slice(0, TEXT_MAX) });
    importLines++;
  }
  const byLine = (a: Evidence, b: Evidence) => a.line - b.line || compare(a.text, b.text);
  const links = [...grouped.values()]
    .map((l) => ({ ...l, evidence: l.evidence.sort(byLine) }))
    .sort((a, b) => compare(a.from, b.from) || compare(a.to, b.to));
  const known = (id: string) => (nodes[id] ? id : alias.get(id));
  const extra: MapLink[] = [];
  for (const l of facts.links ?? []) {
    const from = known(l.from);
    const to = known(l.to);
    if (from && to) extra.push({ ...l, from, to, evidence: [...l.evidence].sort((a, b) => compare(a.file, b.file) || byLine(a, b)) });
    else unresolved++;
  }
  const first = (l: MapLink) => (l.evidence[0] ? `${l.evidence[0].file}\0${String(l.evidence[0].line).padStart(9, '0')}` : '');
  links.push(...extra.sort((a, b) => compare(a.from, b.from) || compare(a.to, b.to) || compare(a.kind, b.kind) || compare(first(a), first(b)) || compare(a.label ?? '', b.label ?? '')));

  return {
    root: 'root', nodes, links, source: facts.source ?? {},
    stats: { files: paths.length, loc: nodes.root.loc, imports: importLines, unresolved },
  };
}
