import { describe, expect, it } from 'vitest';
import { compile } from '../../../dsl/compile';
import type { SceneDocumentV1, ScenePage } from '../../domain/document/types';
import { createShapeNode } from '../../domain/nodes/shapeNode';
import { createEmptyV2Document, createEmptyV2Page } from '../../presentation/v2/v2Document';
import { buildDslPageCommand } from '../dsl/dslPageCommand';
import { assistantToolkit, type AssistantOpWrite } from './assistantTools';

// A page with one generated diagram and three hand-drawn shapes, one of them locked.
async function setup(selection: readonly string[] | null = null) {
  const seed = await compile('flowchart\nPay -> Ship', { origin: { x: 0, y: 0 } });
  let page = (buildDslPageCommand(createEmptyV2Page(), seed) as { after: ScenePage }).after;
  const add = (id: string, x: number, label: string) => {
    page = { ...page, nodes: [...page.nodes, createShapeNode(page, { kind: 'rectangle', id, at: { x, y: 600 }, label })] };
  };
  add('box', 0, 'Box');
  add('other', 300, 'Other');
  add('pinned', 600, 'Pinned');
  page = { ...page, nodes: page.nodes.map((node) => (node.id === 'pinned' ? { ...node, content: { ...node.content, sectionLocked: true } } : node)) };
  const document: SceneDocumentV1 = { ...createEmptyV2Document('doc'), pages: [page] };
  const toolkit = assistantToolkit({
    document, pageId: page.id, inScope: new Set([seed.frame.id]),
    selection: selection ? new Set(selection) : null,
    capabilities: { syntax: () => '', searchIcons: async () => [] },
    compile: (text) => compile(text),
  });
  const call = (name: string, input: Record<string, unknown>) => toolkit.run({ id: name, name, input });
  const ops = () => toolkit.blocks().filter((write): write is AssistantOpWrite => 'op' in write);
  return { frameId: seed.frame.id, toolkit, call, ops };
}

describe('assistant scene tools', () => {
  it('queues a style and a move on the selected shape, in call order', async () => {
    const { call, ops } = await setup(['box']);
    expect((await call('style_shapes', { ids: ['box'], fill: '#ff0000' })).isError).toBeFalsy();
    expect((await call('move_shapes', { ids: ['box'], dx: 120, dy: 0 })).isError).toBeFalsy();
    expect(ops().map(({ op, input }) => [op.name, input])).toEqual([
      ['style', { ids: ['box'], fill: '#ff0000' }],
      ['move', { ids: ['box'], delta: { x: 120, y: 0 } }],
    ]);
  });

  it('lists the hand-drawn shapes in scope, never a generated diagram’s children', async () => {
    const { call } = await setup(['box']);
    const listed = JSON.parse((await call('list_shapes', {})).content) as { id: string; label: string }[];
    expect(listed.map(({ id }) => id)).toEqual(['box']);
    const page = await setup();
    const all = JSON.parse((await page.call('list_shapes', {})).content) as { id: string; locked: boolean }[];
    expect(all.map(({ id }) => id)).toEqual(['box', 'other', 'pinned']);
    expect(all.find(({ id }) => id === 'pinned')?.locked).toBe(true);
  });

  it('refuses locked shapes, shapes outside the selection, invented ids and empty ids, queueing nothing', async () => {
    const { call, ops } = await setup(['box', 'pinned']);
    const locked = await call('style_shapes', { ids: ['pinned'], fill: '#ff0000' });
    expect(locked).toMatchObject({ isError: true });
    expect(locked.content).toContain('locked');
    const outside = await call('delete_shapes', { ids: ['other'] });
    expect(outside).toMatchObject({ isError: true });
    expect(outside.content).toContain('outside');
    const invented = await call('move_shapes', { ids: ['shape-42'], dx: 10, dy: 0 });
    expect(invented).toMatchObject({ isError: true });
    expect(invented.content).toContain('list_shapes');
    expect(await call('move_shapes', { ids: [], dx: 10, dy: 0 })).toMatchObject({ isError: true });
    expect(ops()).toEqual([]);
  });

  it('sends a shape inside a generated diagram to update_diagram', async () => {
    const { call, ops } = await setup();
    const result = await call('style_shapes', { ids: ['pay'], fill: '#ff0000' });
    expect(result).toMatchObject({ isError: true });
    expect(result.content).toContain('update_diagram');
    expect(ops()).toEqual([]);
  });

  it('a move by zero queues nothing and says so', async () => {
    const { call, ops } = await setup();
    const result = await call('move_shapes', { ids: ['box'], dx: 0, dy: 0 });
    expect(result.isError).toBeFalsy();
    expect(result.content).toContain('Nothing');
    expect(ops()).toEqual([]);
  });

  it('a shape added this turn can be styled and moved by the id it was given', async () => {
    const { call, ops } = await setup(['box']);
    const added = await call('add_shape', { kind: 'ellipse', label: 'Cache', x: 900, y: 600 });
    const id = /id ([\w-]+)/.exec(added.content)?.[1];
    expect(id).toBeTruthy();
    expect((await call('style_shapes', { ids: [id], fill: '#00ff00' })).isError).toBeFalsy();
    expect(ops()[0]!.input).toMatchObject({ kind: 'ellipse', id });
  });

  it('two ops on one shape compose against the working copy', async () => {
    const { call, ops } = await setup();
    await call('move_shapes', { ids: ['box'], dx: 10, dy: 0 });
    await call('move_shapes', { ids: ['box'], dx: -10, dy: 0 });
    await call('delete_shapes', { ids: ['box'] });
    const gone = await call('style_shapes', { ids: ['box'], fill: '#ff0000' });
    expect(gone).toMatchObject({ isError: true });
    expect(ops().map(({ op }) => op.name)).toEqual(['move', 'move', 'delete']);
  });

  it('a second add with the same title replaces the queued draft; another title adds', async () => {
    const { call, toolkit } = await setup();
    await call('add_diagram', { dsl: 'flowchart\ntitle: Login\nA -> B' });
    const redo = await call('add_diagram', { dsl: 'flowchart\ntitle: Login\nA -> B -> C' });
    expect(redo.content).toMatch(/^Replaced your earlier draft titled “Login” \(3 shapes\)/);
    expect(toolkit.blocks()).toEqual([{ frameId: null, dsl: 'flowchart\ntitle: Login\nA -> B -> C' }]);
    await call('add_diagram', { dsl: 'flowchart\ntitle: Signup\nA -> B' });
    expect(toolkit.blocks()).toHaveLength(2);
  });

  it('tells the model a C4 model without views drew only its landscape', async () => {
    const { call } = await setup();
    const model = 'architecture\ntitle: Shop\nmodel {\n  person Buyer\n  system Shop {\n    container Web\n  }\n  Buyer -> Web\n}';
    expect((await call('add_diagram', { dsl: model })).content).toMatch(/Only the landscape view is drawn/);
    expect((await call('add_diagram', { dsl: `${model}\nviews {\n  view container of Shop\n}` })).content).not.toMatch(/landscape/);
  });

  it('cannot rewrite a diagram it deleted this turn', async () => {
    const { call, frameId } = await setup();
    expect((await call('delete_shapes', { ids: [frameId] })).isError).toBeFalsy();
    const result = await call('update_diagram', { frame_id: frameId, dsl: 'flowchart\nA -> B' });
    expect(result).toMatchObject({ isError: true });
    expect(result.content).toContain('deleted');
  });
});
