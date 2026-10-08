import { describe, expect, it } from 'vitest';
import { C4_STARTER } from '../../agent/starterTemplates';
import { compile } from '../compile';
import { archModelFromJson } from '../model/model';
import type { ArchModel } from '../model/types';
import { aggregate, presets, visible } from './view';
import { ARCH_ROOT, fromArch } from './fromArch';

async function archOf(text: string): Promise<ArchModel | null> {
  const arch = (await compile(text)).frame.metadata.dsl as { arch?: { model?: unknown } };
  return archModelFromJson(arch.arch?.model);
}

describe('fromArch', () => {
  it('keeps element ids and the C4 tree', async () => {
    const m = fromArch((await archOf(C4_STARTER))!);
    expect(m.nodes[ARCH_ROOT].children).toEqual(['customer', 'shop', 'payments']);
    expect(m.nodes.shop.children).toEqual(['shop.web', 'shop.api', 'shop.database']);
    expect(m.nodes['shop.api'].children).toEqual(['shop.api.orders']);
    expect(m.nodes['shop.api.orders'].parent).toBe('shop.api');
    expect(m.nodes.payments.kind).toBe('external');
    expect(m.nodes.shop.desc).toBe('Online shopping');
    expect(m.nodes.shop.files).toBe(3);
  });

  it('turns each relation into a call link whose evidence is the relation', async () => {
    const arch = (await archOf(C4_STARTER))!;
    const m = fromArch(arch);
    expect(m.links).toHaveLength(arch.relations.length);
    const charge = m.links.find((l) => l.from === 'shop.api' && l.to === 'payments')!;
    expect(charge).toMatchObject({ kind: 'call', label: 'charges [HTTPS]' });
    expect(charge.evidence[0]).toMatchObject({ file: expect.stringContaining('rel:shop.api->payments'), text: 'charges [HTTPS]' });
    expect(m.stats.unresolved).toBe(0);
  });

  it('lets the engine roll relations up: a call from deep inside Shop is one arrow customer -> shop when shut, and the arrow between its parts appears when it opens', async () => {
    const m = fromArch((await archOf(C4_STARTER))!);
    const shut = aggregate(m, new Set()).edges.find((e) => e.from === 'customer' && e.to === 'shop')!;
    expect(shut).toMatchObject({ from: 'customer', to: 'shop', count: 1 });
    const inside = aggregate(m, new Set(['shop'])).edges.find((e) => e.from === 'shop.web' && e.to === 'shop.api')!;
    expect(inside.parent).toBe('shop');
  });

  it('counts a relation to a missing element instead of drawing it', async () => {
    const arch = (await archOf(C4_STARTER))!;
    const m = fromArch({ ...arch, relations: [...arch.relations, { ...arch.relations[0], id: 'rel:x', to: 'Nope' }] });
    expect(m.stats.unresolved).toBe(1);
    expect(m.links).toHaveLength(arch.relations.length);
  });

  it('is deterministic and handles an empty model', async () => {
    const arch = (await archOf(C4_STARTER))!;
    expect(fromArch(arch)).toEqual(fromArch(arch));
    const empty = fromArch({ elements: [], relations: [], views: [], flows: [] });
    expect(empty.nodes[ARCH_ROOT]).toMatchObject({ children: [], files: 0 });
  });

  const el = (id: string, parent: string | null = null, name = id): ArchModel['elements'][number] => ({ id, kind: 'container', name, parent, tags: [], links: [] });
  const rel = (from: string, to: string): ArchModel['relations'][number] => ({ id: `rel:${from}->${to}`, from, to, tags: [] });
  const twenty = (): ArchModel => ({
    elements: Array.from({ length: 20 }, (_, i) => el(`c${String(i).padStart(2, '0')}`)),
    // c15..c19 are the only connected ones, c19 the most.
    relations: [rel('c15', 'c19'), rel('c16', 'c19'), rel('c17', 'c19'), rel('c18', 'c19'), rel('c15', 'c16')],
    views: [], flows: [],
  });

  it('folds a box of 20 children into 13 kept (best connected, authored order) and one #more', () => {
    const m = fromArch(twenty());
    const top = m.nodes[ARCH_ROOT].children;
    expect(top).toHaveLength(14);
    expect(top[13]).toBe(`${ARCH_ROOT}#more`);
    for (const id of ['c15', 'c16', 'c17', 'c18', 'c19']) expect(top).toContain(id);
    expect(top.slice(0, 13)).toEqual([...top.slice(0, 13)].sort());
    const more = m.nodes[`${ARCH_ROOT}#more`];
    expect(more).toMatchObject({ kind: 'more', name: '7 more containers', desc: 'Fewer connections; open to list them.', parent: ARCH_ROOT });
    expect(more.children).toHaveLength(7);
    for (const id of more.children) expect(m.nodes[id].parent).toBe(more.id);
    expect(m.nodes[more.id].files).toBe(7);
  });

  it('never opens #more in a preset, and every element stays reachable once it is open', () => {
    const arch = twenty();
    const m = fromArch(arch);
    const more = `${ARCH_ROOT}#more`;
    for (const open of Object.values(presets(m))) {
      expect(open.has(more)).toBe(false);
      expect(visible(m, open).filter((id) => id.startsWith('c'))).toHaveLength(13);
    }
    const all = visible(m, new Set([more]));
    for (const e of arch.elements) expect(all).toContain(e.id);
  });

  it('names a mixed #more "elements" and splits a huge one into alphabetical range boxes', () => {
    const elements = Array.from({ length: 300 }, (_, i) => ({ ...el(`e${String(i).padStart(3, '0')}`), kind: i % 2 ? 'store' as const : 'queue' as const }));
    const m = fromArch({ elements, relations: [], views: [], flows: [] });
    const more = m.nodes[`${ARCH_ROOT}#more`];
    expect(more.name).toBe('287 more elements');
    expect(more.children.length).toBeLessThanOrEqual(14);
    for (const id of more.children) expect(m.nodes[id].kind).toBe('group');
    expect(m.nodes[more.children[0]].id).toBe(`${more.id}#r0`);
    const reach = visible(m, new Set(Object.keys(m.nodes)));
    expect(reach.filter((id) => id.startsWith('e'))).toHaveLength(300);
    for (const n of Object.values(m.nodes)) expect(n.children.length).toBeLessThanOrEqual(14);
  });

  it('counts a child by the relations of everything inside it', () => {
    const arch = twenty();
    // c00 has no relation itself, but its child does: it outranks the lone c01..c14.
    const elements = [...arch.elements, el('c00.x', 'c00')];
    const m = fromArch({ ...arch, elements, relations: [...arch.relations, rel('c00.x', 'c19'), rel('c00.x', 'c18')] });
    expect(m.nodes[ARCH_ROOT].children).toContain('c00');
    expect(m.nodes[ARCH_ROOT].children).not.toContain('c14');
  });

  it('attaches a parent cycle, a self-parent and an unknown parent to the root: no element is lost', () => {
    const m = fromArch({
      elements: [el('a', 'b'), el('b', 'c'), el('c', 'a'), el('d', 'd'), el('e', 'ghost'), el('f', 'a')], relations: [], views: [], flows: [],
    });
    const reach = visible(m, new Set(Object.keys(m.nodes)));
    expect([...reach].sort()).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(m.nodes[ARCH_ROOT].children).toEqual(['a', 'd', 'e']);
  });
});
