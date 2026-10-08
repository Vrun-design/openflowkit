import { compare } from './tree';
import type { Evidence, MapFacts, MapLink, MapModel, MapNode, MapNodeKind, MapOverlay } from './types';

// Facts -> tree. Ids: folder = path, file = path, group = `${folder}#${key}`,
// more = `${container}#more`, outside group = 'root#outside'. A folder chain with one
// child and no files (a/b/c) collapses into ONE node that keeps the DEEPEST id (a/b/c),
// named "a/b/c/"; the shallower paths stay resolvable for `toKind: 'dir'` imports.

const MAX_LOOSE = 14; // more loose files than this in one box...
const KEEP = 12; // ...and only this many most-connected ones stay; the rest fold into "N more files"
const TEXT_MAX = 140;
const OUTSIDE = 'root#outside';

const push = (map: Map<string, string[]>, key: string, value: string) => {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
};

export function buildMap(facts: MapFacts, overlay: MapOverlay = {}): MapModel {
  const nodes: Record<string, MapNode> = {};
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

  const fold = (list: string[], parent: string, container: string) => {
    const sorted = [...list].sort((a, b) => (degree.get(b) ?? 0) - (degree.get(a) ?? 0) || compare(a, b));
    const shown = sorted.length > MAX_LOOSE ? sorted.slice(0, KEEP) : sorted;
    for (const f of shown.sort(compare)) add(f, 'file', parent, f.slice(f.lastIndexOf('/') + 1), { path: f, files: 1, loc: loc.get(f) });
    const rest = sorted.slice(shown.length).sort(compare);
    if (!rest.length) return;
    const more = add(`${container}#more`, 'more', parent, `${rest.length} more files`, { desc: 'Fewer connections; open to list them.' });
    for (const f of rest) add(f, 'file', more.id, f.slice(f.lastIndexOf('/') + 1), { path: f, files: 1, loc: loc.get(f) });
  };

  // Fill a box with its subfolders, then overlay groups, then the files nobody grouped.
  const fill = (id: string, dir: string, files: string[]) => {
    const { sub, loose: all } = split(dir, files);
    for (const seg of [...sub.keys()].sort(compare)) folder(dir ? `${dir}/${seg}` : seg, id, sub.get(seg)!);
    let loose = all;
    for (const g of overlay.groups?.[id] ?? (dir ? overlay.groups?.[dir] : undefined) ?? []) {
      const gid = `${id}#${g.key}`;
      const wanted = new Set(g.files);
      const mine = loose.filter((f) => wanted.has(f));
      // 'more' would collide with the fold box `${id}#more`; a repeated key with the first group. Skipped, not drawn.
      if (!mine.length || g.key === 'more' || nodes[gid]) continue;
      add(gid, 'group', id, g.name, { desc: g.desc, ai: true, path: dir || undefined });
      loose = loose.filter((f) => !wanted.has(f));
      fold(mine, gid, gid);
    }
    fold(loose, id, id);
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
  for (const p of parts) {
    alias.set(p.dir, p.dir);
    add(p.dir, 'part', 'root', p.name, { desc: p.desc, path: p.dir });
    fill(p.dir, p.dir, byPart.get(p.dir) ?? []);
  }
  // Everything outside a declared part: top-level folders become parts, root files fold loosely.
  const top = split('', rest);
  for (const seg of [...top.sub.keys()].sort(compare)) folder(seg, 'root', top.sub.get(seg)!, 'part');
  fold(top.loose, 'root', 'root');

  const externals = [...(facts.externals ?? [])]
    .sort((a, b) => compare(a.id, b.id))
    .filter((e, i, all) => i === 0 || all[i - 1].id !== e.id);
  if (externals.length) {
    add(OUTSIDE, 'group', 'root', 'Outside services', { desc: 'Services the code calls over the network.' });
    for (const e of externals) add(e.id, 'external', OUTSIDE, e.name, { desc: e.desc });
  }

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
  let unresolved = 0;
  let importLines = 0;
  const grouped = new Map<string, MapLink>();
  for (const i of facts.imports) {
    const to = i.toKind === 'dir' ? alias.get(i.to.replace(/\/$/, '')) : nodes[i.to]?.kind === 'file' ? i.to : undefined;
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
