import ELK from 'elkjs/lib/elk.bundled.js';
import { describe, expect, it } from 'vitest';
import { C4_STARTER } from '../../agent/starterTemplates';
import { validateSceneDocumentV1 } from '../../opencanvas/domain/document/validation';
import { SCENE_DOCUMENT_FORMAT, SCENE_DOCUMENT_VERSION, type ScenePage } from '../../opencanvas/domain/document/types';
import { paletteResolver } from '../../opencanvas/domain/nodes/nodePalette';
import { compile } from '../compile';
import { archModelFromJson } from '../model/model';
import type { ArchModel } from '../model/types';
import { budgetEdges } from './edgeBudget';
import { fromElkLayout, toElkGraph, type ElkNode } from './elk';
import { fromArch } from './fromArch';
import { closedBoxSize, mapScene, type MapLook } from './scene';
import type { Depth } from './types';
import { aggregate, presets } from './view';

const fixtures = import.meta.glob('../fixtures/**/*.dsl', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
const WANTED = /\/(04|05|06|07|10|11)-|aws-3tier/;

async function archOf(text: string): Promise<ArchModel | null> {
  const arch = (await compile(text)).frame.metadata.dsl as { arch?: { model?: unknown } };
  return archModelFromJson(arch.arch?.model);
}

const NESTED = `architecture
model {
  person Customer
  system Shop {
    container Web [tech: React]
    container API [tech: Go] { component Router; component Orders; Router -> Orders }
    store DB [tech: Postgres]
    Web -> API : calls
    API -> DB : reads
  }
  external Stripe
  Customer -> Shop.Web : uses
  Shop.API.Orders -> Stripe : charges [tech: HTTPS]
}
views { view container of Shop }
`;

/** The whole pipeline at one preset: model -> map -> real ELK layout -> scene. */
async function sceneAt(arch: ArchModel, depth: Depth, open?: ReadonlySet<string>): Promise<ScenePage> {
  const model = fromArch(arch);
  const shown = open ?? presets(model)[depth];
  const look: MapLook = { arch, swatch: paletteResolver('pastel') };
  const edges = budgetEdges(model, aggregate(model, shown).edges).filter((e) => !e.minor);
  const graph = toElkGraph(model, shown, edges, (n) => closedBoxSize(look, n), (t) => t.length * 6);
  const laid = fromElkLayout((await new ELK().layout(graph as never)) as unknown as ElkNode);
  return mapScene(model, shown, { rects: laid.rects, edges }, look);
}

const valid = (page: ScenePage) => validateSceneDocumentV1({
  format: SCENE_DOCUMENT_FORMAT, schemaVersion: SCENE_DOCUMENT_VERSION, id: 'd', name: 'd',
  createdAt: '2026-10-08T00:00:00.000Z', updatedAt: '2026-10-08T00:00:00.000Z', pages: [page], metadata: {}, extensions: {},
});

describe('closedBoxSize', () => {
  it('measures a synthetic box by its own name, not a stand-in', async () => {
    const arch = (await archOf(NESTED))!;
    const look: MapLook = { arch, swatch: paletteResolver('pastel') };
    const node = { id: 'x#more', kind: 'more' as const, name: 'A much longer name than the stand-in ever was', parent: null, children: [], files: 0, loc: 0 };
    const short = closedBoxSize(look, { ...node, name: 'Few' });
    expect(closedBoxSize(look, node).width).toBeGreaterThan(short.width);
    expect(() => closedBoxSize(look, { ...node, kind: 'file' })).toThrow(/no element/);
  });
});

describe('mapScene', () => {
  it('has no C4 model in the graph-style architecture fixtures (04-07, 10, 11, aws-3tier), so they are not drawn', async () => {
    const names = Object.keys(fixtures).filter((k) => WANTED.test(k));
    expect(names).toHaveLength(7);
    for (const k of names) expect(await archOf(fixtures[k]), k).toBeNull();
  });

  it.each([['C4 starter', C4_STARTER], ['nested system', NESTED]])('%s: every preset is a valid scene', async (_name, text) => {
    const arch = (await archOf(text))!;
    for (const depth of ['overview', 'detailed', 'everything'] as const) {
      const page = await sceneAt(arch, depth);
      const result = valid(page);
      expect(result.success, `${depth}: ${JSON.stringify('issues' in result ? result.issues : [])}`).toBe(true);
      const ids = page.nodes.map((n) => n.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const c of page.connectors) {
        expect(ids).toContain(c.source.nodeId);
        expect(ids).toContain(c.target.nodeId);
      }
    }
  });

  it('draws the C4 starter at overview: closed boxes as the family draws them, arrows with counts', async () => {
    const page = await sceneAt((await archOf(C4_STARTER))!, 'overview');
    expect(page.nodes.map((n) => [n.id, n.kind, n.parentId, n.size, n.transform.translation])).toMatchSnapshot();
    expect(page.connectors.map((c) => [c.id, c.source.nodeId, c.target.nodeId, c.labels.map((l) => l.text), c.appearance, c.metadata.map])).toMatchSnapshot();
  });

  it('draws an open box as a container holding its children, positioned relative to it', async () => {
    const arch = (await archOf(NESTED))!;
    const open = new Set(['shop', 'shop.api']);
    const page = await sceneAt(arch, 'detailed', open);
    const byId = new Map(page.nodes.map((n) => [n.id, n]));
    expect(byId.get('shop')).toMatchObject({ kind: 'frame', parentId: null, content: { label: 'Shop' } });
    expect(byId.get('shop.api')).toMatchObject({ kind: 'frame', parentId: 'shop' });
    expect(byId.get('shop.api.router')).toMatchObject({ parentId: 'shop.api' });
    expect(byId.get('shop.db')!.kind).not.toBe('frame');
    // Children sit inside their container: positive offsets within its size.
    for (const n of page.nodes.filter((x) => x.parentId)) {
      const p = byId.get(n.parentId!)!;
      expect(n.transform.translation.x).toBeGreaterThanOrEqual(0);
      expect(n.transform.translation.y).toBeGreaterThanOrEqual(0);
      expect(n.transform.translation.x + n.size.width).toBeLessThanOrEqual(p.size.width + 1.5);
      expect(n.transform.translation.y + n.size.height).toBeLessThanOrEqual(p.size.height + 1.5);
    }
  });

  it('dashes an arrow that rides up from deeper boxes and keeps a direct one solid', async () => {
    const page = await sceneAt((await archOf(NESTED))!, 'overview', new Set(['shop']));
    const solid = page.connectors.find((c) => c.source.nodeId === 'shop.web' && c.target.nodeId === 'shop.api')!;
    const rolledUp = page.connectors.find((c) => c.source.nodeId === 'shop' && c.target.nodeId === 'stripe')!;
    expect(solid.appearance).toEqual({});
    expect(rolledUp.appearance).toEqual({ dashPattern: 'dashed' });
    expect(rolledUp.labels[0].text).toBe('charges [HTTPS]');
  });

  it('is deterministic', async () => {
    const arch = (await archOf(NESTED))!;
    expect(await sceneAt(arch, 'everything')).toEqual(await sceneAt(arch, 'everything'));
  });

  it('refuses a box the layout never placed', async () => {
    const arch = (await archOf(NESTED))!;
    expect(() => mapScene(fromArch(arch), new Set(), { rects: new Map(), edges: [] }, { arch, swatch: paletteResolver('pastel') })).toThrow(/nothing to draw/);
  });

  const wide = (n: number): ArchModel => ({
    elements: Array.from({ length: n }, (_, i) => ({ id: `s${String(i).padStart(3, '0')}`, kind: 'container' as const, name: `Svc ${i}`, parent: null, tags: [], links: [] })),
    relations: [{ id: 'rel:s000->s001', from: 's000', to: 's001', tags: [] }, { id: 'rel:s000->s019', from: 's000', to: 's019', label: 'syncs', tags: [] }],
    views: [], flows: [],
  });

  it('draws the #more box and its range groups as plain boxes, and a valid scene at every preset with folding', async () => {
    const arch = wide(300);
    for (const depth of ['overview', 'detailed', 'everything'] as const) expect(valid(await sceneAt(arch, depth)).success).toBe(true);
    const model = fromArch(arch);
    const more = '#model#more';
    const open = new Set([more, `${more}#r0`]);
    const page = await sceneAt(arch, 'detailed', open);
    expect(valid(page).success).toBe(true);
    const byId = new Map(page.nodes.map((n) => [n.id, n]));
    expect(byId.get(more)).toMatchObject({ kind: 'frame', content: { label: '287 more containers' } });
    expect(byId.get(`${more}#r0`)).toMatchObject({ kind: 'frame', parentId: more });
    expect(page.nodes.filter((n) => n.parentId === `${more}#r0`).length).toBeGreaterThan(0);
    expect(page.nodes.filter((n) => !n.parentId && n.id.startsWith('s'))).toHaveLength(model.nodes['#model'].children.length - 1);
    const shut = (await sceneAt(arch, 'overview')).nodes.find((n) => n.id === more)!;
    expect(shut).toMatchObject({ content: { label: '287 more containers', subLabel: 'Fewer connections; open to list them.' } });
    expect(shut.content.icon).toBeUndefined();
    expect(page.nodes.every((n) => n.content.subLabel !== '[Service]' || n.id.startsWith('s'))).toBe(true);
  });

  it('an arrow to a folded element lands on the #more box', async () => {
    const base = wide(20);
    const hub = { ...base, relations: Array.from({ length: 19 }, (_, i) => ({ id: `rel:${i}`, from: 's000', to: `s${String(i + 1).padStart(3, '0')}`, tags: [] })) };
    const page = await sceneAt(hub, 'overview');
    const into = page.connectors.find((c) => c.source.nodeId === 's000' && c.target.nodeId === '#model#more');
    expect(into?.labels[0].text).toBe('7 links');
    expect(into?.appearance).toEqual({ dashPattern: 'dashed' });
  });

  it('draws an empty model as an empty scene', async () => {
    const arch: ArchModel = { elements: [], relations: [], views: [], flows: [] };
    const page = mapScene(fromArch(arch), new Set(), { rects: new Map(), edges: [] }, { arch, swatch: paletteResolver('pastel') });
    expect(page.nodes).toEqual([]);
    expect(page.connectors).toEqual([]);
  });

  it('refuses an arrow whose end the layout never placed', async () => {
    const arch = (await archOf(NESTED))!;
    const model = fromArch(arch);
    const look = { arch, swatch: paletteResolver('pastel') };
    const edges = aggregate(model, new Set()).edges;
    expect(edges.length).toBeGreaterThan(0);
    const rects = new Map([['customer', { x: 0, y: 0, width: 10, height: 10, open: false }]]);
    expect(() => mapScene(model, new Set(['customer']), { rects, edges }, look)).toThrow(/nothing to draw/);
  });
});
