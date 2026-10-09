import ELK from 'elkjs/lib/elk.bundled.js';
import { describe, expect, it } from 'vitest';
import { C4_STARTER } from '../../../agent/starterTemplates';
import { compileWorkspace } from '../../../dsl/compile';
import { budgetEdges } from '../../../dsl/map/edgeBudget';
import { fromElkLayout, toElkGraph, type ElkNode } from '../../../dsl/map/elk';
import { fromArch } from '../../../dsl/map/fromArch';
import { closedBoxSize, mapScene, type MapLook } from '../../../dsl/map/scene';
import { aggregate, presets } from '../../../dsl/map/view';
import { archFrameOf, archModelFromJson } from '../../../dsl/model/model';
import type { ArchModel } from '../../../dsl/model/types';
import { applyDocumentCommand } from '../../domain/commands/execute';
import { createDefaultSceneLayer } from '../../domain/document/defaults';
import { validateSceneDocumentV1 } from '../../domain/document/validation';
import { paletteResolver } from '../../domain/nodes/nodePalette';
import { SCENE_DOCUMENT_FORMAT, SCENE_DOCUMENT_VERSION, type SceneDocumentV1, type ScenePage } from '../../domain/document/types';
import { buildArchElementAddCommand, buildWorkspacePagesCommand, modelPages } from '../dsl/architectureCommands';
import { buildPinPageCommand } from './pinPage';

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

async function world(text: string) {
  const workspace = await compileWorkspace(text);
  const view = workspace.views[0]!;
  const arch = (view.result.frame.metadata.dsl as { arch: { model: unknown } }).arch.model;
  const model = archModelFromJson(arch)!;
  const page: ScenePage = {
    id: 'p1', name: 'Page 1', diagramKind: 'architecture', layers: [createDefaultSceneLayer()],
    nodes: [view.result.frame, ...view.result.groups, ...view.result.nodes], connectors: view.result.connectors,
    metadata: { view: { id: view.viewId } }, extensions: {},
  };
  const document: SceneDocumentV1 = {
    format: SCENE_DOCUMENT_FORMAT, schemaVersion: SCENE_DOCUMENT_VERSION, id: 'd', name: 'd',
    createdAt: '2026-10-08T00:00:00.000Z', updatedAt: '2026-10-08T00:00:00.000Z', pages: [page], metadata: {}, extensions: {},
  };
  return { workspace, model, document };
}

async function mapPageOf(arch: ArchModel, open?: ReadonlySet<string>): Promise<ScenePage> {
  const map = fromArch(arch);
  const shown = open ?? presets(map).overview;
  const look: MapLook = { arch, swatch: paletteResolver('pastel') };
  const edges = budgetEdges(map, aggregate(map, shown).edges).filter((e) => !e.minor);
  const graph = toElkGraph(map, shown, edges, (n) => closedBoxSize(look, n), (t) => t.length * 6);
  const laid = fromElkLayout((await new ELK().layout(graph as never)) as unknown as ElkNode);
  return mapScene(map, shown, { rects: laid.rects, edges }, look);
}

const pin = (document: SceneDocumentV1, mapPage: ScenePage) => buildPinPageCommand(document, mapPage, { pageId: 'pinned', name: 'Shop (pinned)', index: 1 });
const pinnedPage = (command: ReturnType<typeof pin>) => (command as { page: ScenePage }).page;

describe('buildPinPageCommand', () => {
  it('inserts a valid page in one undo step that restores the document exactly', async () => {
    const { model, document } = await world(NESTED);
    const command = pin(document, await mapPageOf(model, new Set(['shop'])));
    expect(command).toMatchObject({ kind: 'insert-page', label: 'Edit map as drawing', index: 1 });
    const applied = applyDocumentCommand(document, command);
    expect(applied.document.pages.map((p) => p.id)).toEqual(['p1', 'pinned']);
    expect(validateSceneDocumentV1(JSON.parse(JSON.stringify(applied.document)))).toEqual({ success: true, document: applied.document });
    expect(applyDocumentCommand(applied.document, applied.inverse).document).toEqual(document);
  });

  it('is a plain snapshot: no model, dsl or map metadata, invisible to the model', async () => {
    const { model, document } = await world(NESTED);
    const mapPage = await mapPageOf(model, new Set(['shop']));
    const page = pinnedPage(pin(document, mapPage));
    expect(page.nodes.length).toBe(mapPage.nodes.length);
    expect(page.connectors.length).toBe(mapPage.connectors.length);
    for (const item of [...page.nodes, ...page.connectors]) expect(item.metadata).toEqual({});
    expect(page.metadata).toEqual({});
    expect(archFrameOf(page)).toBeNull();
    expect(page.nodes.find((n) => n.id === 'shop.api')!.parentId).toBe('shop');
    expect(page.nodes.find((n) => n.id === 'shop.web')!.content.label).toBe('Web');
    expect(modelPages(applyDocumentCommand(document, pin(document, mapPage)).document, 'shop.web').map((p) => p.page.id)).toEqual(['p1']);
  });

  it('never brings back an element deleted in code, and survives the regenerate', async () => {
    const { model, document } = await world(NESTED);
    const { document: pinned } = applyDocumentCommand(document, pin(document, await mapPageOf(model, new Set(['shop']))));
    const edited = await compileWorkspace(NESTED.replace('  external Stripe\n', '').replace('  Shop.API.Orders -> Stripe : charges [tech: HTTPS]\n', ''));
    const regen = buildWorkspacePagesCommand(pinned, edited, { mintId: (p) => `${p}-new` });
    const after = regen ? applyDocumentCommand(pinned, regen).document : pinned;
    expect(after.pages.find((p) => p.id === 'pinned')).toEqual(pinned.pages[1]);
    const modelPage = after.pages.find((p) => p.id === 'p1')!;
    expect(JSON.stringify(modelPage)).not.toContain('"stripe"');
    const added = buildArchElementAddCommand(after, 'p1', { parentId: null, kind: 'system', name: 'Extra' })!;
    const done = applyDocumentCommand(after, added.command).document;
    expect(JSON.stringify(done.pages.find((p) => p.id === 'p1'))).not.toContain('"stripe"');
    expect(done.pages.find((p) => p.id === 'pinned')).toEqual(pinned.pages[1]);
  });

  it('starts the content on the margin on both axes, tight', async () => {
    const { model, document } = await world(C4_STARTER);
    const page = pinnedPage(pin(document, await mapPageOf(model)));
    const tops = page.nodes.filter((n) => n.parentId === null);
    expect(Math.min(...tops.map((n) => n.transform.translation.x))).toBe(40);
    expect(Math.min(...tops.map((n) => n.transform.translation.y))).toBe(40);
  });

  it('keeps solid vs dashed, both heads of a two-way arrow, and the count label', async () => {
    const { model, document } = await world(NESTED.replace('Web -> API : calls', 'Web -> API : calls\n    Web -> API : pings\n    API -> Web : acks'));
    const mapPage = await mapPageOf(model, new Set(['shop']));
    const page = pinnedPage(pin(document, mapPage));
    const byId = (list: ScenePage, c: { id: string }) => list.connectors.find((x) => x.id === c.id)!;
    const two = mapPage.connectors.find((c) => c.source.nodeId === 'shop.web' && c.target.nodeId === 'shop.api')!;
    expect(byId(page, two).appearance).toEqual(two.appearance);
    expect(byId(page, two).appearance).toMatchObject({ markerStart: 'arrow', markerEnd: 'arrow' });
    expect(byId(page, two).appearance.dashPattern).toBeUndefined();
    expect(byId(page, two).labels[0]!.text).toBe('3 links');
    const implied = mapPage.connectors.find((c) => c.source.nodeId === 'shop' && c.target.nodeId === 'stripe')!;
    expect(byId(page, implied).appearance).toMatchObject({ dashPattern: 'dashed', markerEnd: 'arrow' });
  });

  it('refuses a taken page id, an empty id and an empty name; an empty page is fine', async () => {
    const { document } = await world(C4_STARTER);
    const empty: ScenePage = { ...document.pages[0]!, nodes: [], connectors: [] };
    expect(() => buildPinPageCommand(document, empty, { pageId: 'p1', name: 'x' })).toThrow(/unique/);
    expect(() => buildPinPageCommand(document, empty, { pageId: ' ', name: 'x' })).toThrow(/unique/);
    expect(() => buildPinPageCommand(document, empty, { pageId: 'q', name: ' ' })).toThrow(/name/);
    expect(applyDocumentCommand(document, buildPinPageCommand(document, empty, { pageId: 'q', name: 'x' })).document.pages).toHaveLength(2);
  });
});
