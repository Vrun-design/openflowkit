import { describe, expect, it } from 'vitest';
import { applyDocumentCommand } from '@/opencanvas/domain/commands/execute';
import { buildDeleteSelectionCommand, buildMoveNodesCommand } from '@/opencanvas/domain/commands/sceneEdits';
import { createShapeNode } from '../../opencanvas/domain/nodes/shapeNode';
import { buildStyleNodesCommand } from '@/opencanvas/domain/commands/styleNodes';
import type { SceneDocumentV1, ScenePage } from '@/opencanvas/domain/document/types';
import { createAgentDocument } from '../index';
import { AGENT_OPS } from './index';
import type { AgentOp, OpContext } from './types';
import { createTestCapabilities } from './testHost';

const FLOW = '%% ofk 1\nflowchart\n\n  Client [blue] -> API [emerald]\n  API -> Store [cylinder, red]';

function op(name: string) {
  const found = AGENT_OPS.find((candidate) => candidate.name === name);
  if (!found) throw new RangeError(`missing op ${name}`);
  return found as AgentOp<unknown, unknown>;
}

/**
 * A test host that owns the document like a session would: each mutating run
 * applies its command and hands the next run the new document.
 */
async function host(document: SceneDocumentV1 = createAgentDocument('Ops fixture', 'doc-ops')) {
  const capabilities = createTestCapabilities();
  let current = document;
  const context = (): OpContext => ({ document: current, pageId: current.pages[0]!.id, capabilities });
  return {
    context,
    capabilities,
    document: () => current,
    page: (): ScenePage => current.pages[0]!,
    frame: (index = 0) => current.pages[0]!.nodes.filter((node) => node.kind === 'frame')[index]!,
    dataIds: () => current.pages[0]!.nodes.filter((node) => node.kind !== 'frame').map((node) => node.id),
    async run(name: string, input: unknown) {
      const outcome = await op(name).run(op(name).schema.parse(input), context());
      if (outcome.command) current = applyDocumentCommand(current, outcome.command).document;
      return outcome;
    },
  };
}

describe('agent ops', () => {
  it('creates a diagram as one undoable page command and reads its authored text back', async () => {
    const run = await host();
    const created = await run.run('create_diagram', { dsl: FLOW });
    expect(created.command!.kind).toBe('set-page');
    expect(created.output).toMatchObject({ family: 'flowchart', nodes: 3, connectors: 2 });

    const read = await run.run('get_diagram', { frameId: run.frame().id });
    expect(read.output).toMatchObject({ edited: false, losses: [], dsl: FLOW });
    expect(run.page().diagramKind).toBe('flowchart');
  });

  it('lands a C4 workspace as one page per view, and regenerates the same pages', async () => {
    const run = await host();
    const C4 = `architecture
model {
  person Customer
  system Shop { container Web; container API; Web -> API }
  Customer -> Shop.Web : uses
}
views { view context of Shop; view container of Shop }
`;
    const created = await run.run('create_diagram', { dsl: C4 });
    expect(created.command!.kind).toBe('batch');
    expect(created.output).toMatchObject({ family: 'architecture', views: [{ viewId: 'view:context:shop' }, { viewId: 'view:container:shop' }] });
    expect(run.document().pages.map((page) => page.name)).toEqual(['Page 1', 'context of Shop', 'container of Shop']);
    const again = await run.run('create_diagram', { dsl: C4 });
    expect(again.command).toBeNull();
    expect(run.document().pages).toHaveLength(3);
    const listed = await run.run('list_diagrams', {});
    expect((listed.output as { diagrams: unknown[] }).diagrams).toHaveLength(2);
  });

  it('reports canvas drift and unrepresentable paint through get_diagram', async () => {
    const run = await host();
    await run.run('create_diagram', { dsl: FLOW });
    const ids = run.dataIds();

    await run.run('move', { ids: [ids[0]!], delta: { x: 40, y: 0 } });
    const moved = await run.run('get_diagram', { frameId: run.frame().id });
    expect(moved.output).toMatchObject({ edited: true });
    expect((moved.output as { dsl: string }).dsl).toContain('Client -> API');

    await run.run('style', { ids, opacity: 0.4 });
    const styled = await run.run('get_diagram', { frameId: run.frame().id });
    expect((styled.output as { losses: readonly string[] }).losses).toEqual(
      expect.arrayContaining([expect.stringContaining('opacity is not in the language')]));
  });

  it('regenerates a frame in place, keeping its position and id', async () => {
    const run = await host();
    await run.run('create_diagram', { dsl: FLOW, at: { x: 300, y: 120 } });
    const before = run.frame();
    const updated = await run.run('update_diagram', { frameId: before.id, dsl: '%% ofk 1\nflowchart\n\n  Client -> API -> Store -> Cache' });
    const after = run.frame();
    expect(after.id).toBe(before.id);
    expect(after.transform.translation).toEqual({ x: 300, y: 120 });
    expect(updated.output).toMatchObject({ nodes: 4, connectors: 3 });
    expect(run.dataIds()).toHaveLength(4);
  });

  it('lists diagrams across pages with drift flags', async () => {
    const run = await host();
    await run.run('create_diagram', { dsl: FLOW });
    const listed = await run.run('list_diagrams', {});
    expect(listed.output).toMatchObject({ diagrams: [{ family: 'flowchart', pageName: 'Page 1', edited: false }] });
  });

  it('serves the grammar section and expands icon concepts', async () => {
    const run = await host();
    const syntax = await run.run('get_syntax', { family: 'sequence' });
    expect(syntax.output).toMatchObject({ family: 'sequence', syntax: '## family sequence' });
    expect(run.capabilities.recording.syntaxCalls).toContain('sequence');

    const search = await run.run('search_icons', { query: 'lambda' });
    expect((search.output as { matches: readonly unknown[] }).matches).toHaveLength(1);

    const concept = await run.run('find_icons_for', { concept: 'cache', limit: 8 });
    expect(concept.output).toMatchObject({ concept: 'cache' });
    const slugs = (concept.output as { matches: readonly { slug: string }[] }).matches.map(({ slug }) => slug);
    expect(slugs).toContain('elasticache');
    expect(slugs).toContain('cache-for-redis');
    expect(slugs).not.toContain('lambda');
  });

  it('exports, screenshots and fits the view through host capabilities', async () => {
    const run = await host();
    await run.run('create_diagram', { dsl: FLOW });
    const frameId = run.frame().id;

    const exported = await run.run('export', { format: 'svg', scope: 'document' });
    expect(exported.output).toMatchObject({ files: [{ filename: 'diagram.svg', text: '<svg/>' }] });

    // Animated SVG comes from the same host; raster animation asks for an editor.
    const animated = await run.run('export', { format: 'svg-animated', scope: 'page', preset: 'pulse', order: 'code' });
    expect(animated.output).toMatchObject({ files: [{ filename: 'diagram.svg-animated', text: '<svg-animated/>' }] });
    const lastMotion = run.capabilities.recording.exported.at(-1) as { format: string; preset?: string };
    expect(lastMotion).toMatchObject({ format: 'svg-animated', preset: 'pulse' });


    const shot = await run.run('screenshot', { frameId, scale: 2 });
    expect(shot.output).toMatchObject({ frameId, mime: 'image/png', base64: 'UE5H' });
    const lastExport = run.capabilities.recording.exported.at(-1) as { selectedNodeIds: readonly string[] };
    expect(lastExport).toMatchObject({ format: 'png', scale: 2 });
    // The frame id alone: the serializer expands a selected container itself.
    expect(lastExport.selectedNodeIds).toEqual([frameId]);

    await run.run('fit_view', { frameId });
    expect(run.capabilities.recording.fitted.at(-1)).toContain(frameId);
  });

  it('builds the same records the UI builders do', async () => {
    const run = await host();
    await run.run('create_diagram', { dsl: FLOW });
    const ids = run.dataIds();

    const moved = await op('move').run(op('move').schema.parse({ ids, delta: { x: 24, y: -8 } }), run.context());
    expect(moved.command).toEqual(buildMoveNodesCommand(run.page(), ids, { x: 24, y: -8 }));

    const styled = await op('style').run(op('style').schema.parse({ ids, fill: '#123456', strokeWidth: 3 }), run.context());
    expect(styled.command).toEqual(buildStyleNodesCommand(run.page(), ids, { fill: '#123456', strokeWidth: 3 }));

    const deleted = await op('delete').run(op('delete').schema.parse({ ids: [ids[0]!] }), run.context());
    expect(deleted.command).toEqual(buildDeleteSelectionCommand(run.page(), [ids[0]!], []));

    // add_shape is the toolbar's create: identical insert record, same ids.
    const added = await op('add_shape').run(
      op('add_shape').schema.parse({ kind: 'rectangle', x: 10, y: 20, id: 'added-1' }), run.context());
    expect(added.command).toEqual({
      kind: 'insert-node', id: 'create-node:added-1', label: 'Create rectangle', pageId: run.page().id, index: run.page().nodes.length,
      node: createShapeNode(run.page(), { kind: 'rectangle', id: 'added-1', at: { x: 10, y: 20 } }),
    });
    await expect(run.run('add_shape', { kind: 'process', x: 0, y: 0 })).rejects.toThrow(/label/);
  });

  it('refuses unknown ids, missing diagrams and unknown palettes with clear errors', async () => {
    const run = await host();
    await expect(run.run('move', { ids: ['nope'], delta: { x: 1, y: 0 } })).rejects.toThrow(/nope/);
    await expect(run.run('delete', { ids: ['nope'] })).rejects.toThrow(/nope/);
    await expect(run.run('style', { ids: ['nope'], fill: '#ffffff' })).rejects.toThrow(/nope/);
    await expect(run.run('get_diagram', {})).rejects.toThrow(/no diagram frames/);
    await expect(run.run('create_diagram', { dsl: FLOW, at: { x: 0, y: 0 }, palette: 'neon' })).rejects.toThrow();
    expect(run.document().pages[0]!.nodes).toHaveLength(0);
  });
});

describe('add_shape chart', () => {
  it('inserts a bar chart with the given data as one node', async () => {
    const run = await host();
    const parsed = op('add_shape').schema.parse({
      kind: 'chart', label: 'Revenue', x: 20, y: 30,
      chart: { kind: 'bar', categories: ['Jan', 'Feb'], series: [{ name: 'Rev', values: [1, 2] }] },
    });
    const result = await op('add_shape').run(parsed, run.context());
    const node = (result.command as unknown as { node: {
      kind: string; content: { chart: string; categories: string[] };
    } }).node;
    expect(node.kind).toBe('chart');
    expect(node.content.chart).toBe('bar');
    expect(node.content.categories).toEqual(['Jan', 'Feb']);
  });
});

describe('add_shape wireframe', () => {
  it('adds a phone frame and a widget inside it, as the rail would', async () => {
    const run = await host();
    await run.run('add_shape', { kind: 'frame', preset: 'phone', id: 'phone', x: 0, y: 0, label: 'Login' });
    await run.run('add_shape', {
      kind: 'widget', id: 'remember', parentId: 'phone', x: 16, y: 60, label: 'Remember me',
      widget: { kind: 'checkbox', checked: false },
    });
    const [frame, widget] = run.document().pages[0]!.nodes;
    expect(frame).toMatchObject({ kind: 'frame', content: { preset: 'phone', label: 'Login' } });
    expect(widget).toMatchObject({ kind: 'widget', parentId: 'phone', content: { widget: 'checkbox', label: 'Remember me', checked: false } });
  });

  it('refuses a widget without a control or with a missing parent', async () => {
    const run = await host();
    await expect(run.run('add_shape', { kind: 'widget', x: 0, y: 0 })).rejects.toThrow(/widget/);
    await expect(run.run('add_shape', { kind: 'widget', parentId: 'nope', x: 0, y: 0, widget: { kind: 'button' } })).rejects.toThrow(/nope/);
  });
});
