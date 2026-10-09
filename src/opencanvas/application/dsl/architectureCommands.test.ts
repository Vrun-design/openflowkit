import { createTestNode } from '../../testing/builders/documentBuilder';
import { buildNodeWorldMatrices } from '../../domain/scene/worldGeometry';
import { describe, expect, it } from 'vitest';
import { compile, compileWorkspace } from '../../../dsl/compile';
import { buildDslPageCommand, nextDslFrameOrigin } from './dslPageCommand';
import { architectureWorkspaceText } from '../../../dsl/families/architecture/text';
import { archModelOfPage, archViewIdOfPage, placedElementId } from '../../../dsl/model/model';
import { applyDocumentCommand } from '../../domain/commands/execute';
import type { SceneDocumentV1 } from '../../domain/document/types';
import type { ElementKind } from '../../../dsl/model/types';
import { createEmptyV2Document } from '../../presentation/v2/v2Document';
import {
  buildArchElementAddCommand, defaultChildKind, buildArchFlowCreateCommand, buildArchElementEditCommand, buildArchElementRemoveCommand,
  buildArchRelationCommands, buildArchUnplaceCommand, buildWorkspacePagesCommand, firstViewLanding,
} from './architectureCommands';

const WORKSPACE = `architecture
model {
  person Customer
  system Shop {
    container Web [tech: React]
    container API [tech: Go]
    store DB
    Web -> API : calls
  }
  Customer -> Shop.Web : uses
}
views {
  view context of Shop
  view container of Shop
}
`;

const EDITED = WORKSPACE.replace('container Web [tech: React]', 'container Web [tech: Remix]');

let counter = 0;
const mintId = (prefix: string) => `${prefix}-test-${counter++}`;

/** A document whose pages come from generating the workspace once. */
async function generatedDocument(text = WORKSPACE): Promise<SceneDocumentV1> {
  const workspace = await compileWorkspace(text);
  const empty = createEmptyV2Document('doc-1', 'Shop');
  const command = buildWorkspacePagesCommand(empty, workspace, { mintId });
  if (!command) throw new Error('no command');
  const applied = applyDocumentCommand(empty, command);
  return applied.document;
}

function apply(document: SceneDocumentV1, command: NonNullable<ReturnType<typeof buildArchElementEditCommand>>) {
  return applyDocumentCommand(document, command);
}

describe('workspace pages command', () => {
  it('creates one page per view and records the view on the frame', async () => {
    const document = await generatedDocument();
    expect(document.pages).toHaveLength(3); // the empty starter page stays
    const shopPages = document.pages.filter((page) => archViewIdOfPage(page));
    expect(shopPages.map((page) => page.name)).toEqual(['Overview: Shop', 'Services: Shop']);
    expect(shopPages.every((page) => page.diagramKind === 'architecture')).toBe(true);
    const contextNodes = shopPages[0]!.nodes.map((node) => node.id).sort();
    expect(contextNodes).toEqual(expect.arrayContaining(['customer', 'shop']));
    expect(archModelOfPage(shopPages[0]!)?.elements.map((element) => element.id)).toEqual([
      'customer', 'shop', 'shop.web', 'shop.api', 'shop.db',
    ]);
  });

  it('puts the first view on the empty page it is generated from, as one undo step', async () => {
    const empty = createEmptyV2Document('doc-4', 'Shop');
    const pageId = empty.pages[0]!.id;
    const command = buildWorkspacePagesCommand(empty, await compileWorkspace(WORKSPACE), { mintId, intoPageId: pageId })!;
    const applied = applyDocumentCommand(empty, command);
    expect(applied.document.pages.map((page) => page.name)).toEqual(['Overview: Shop', 'Services: Shop']);
    expect(applied.document.pages[0]!.id).toBe(pageId);
    expect(archViewIdOfPage(applied.document.pages[0]!)).toBe('view:context:shop');
    expect(applyDocumentCommand(applied.document, applied.inverse).document.pages).toEqual(empty.pages);
  });

  it('says where the first view lands: the empty page, a new page, or the page it regenerates', async () => {
    const empty = createEmptyV2Document('doc-5', 'Shop');
    const frameOf = (document: SceneDocumentV1, pageId: string) => document.pages.find((page) => page.id === pageId)!.nodes.find((node) => node.kind === 'frame')!.id;
    const shop = await compileWorkspace(WORKSPACE);
    const onEmpty = buildWorkspacePagesCommand(empty, shop, { mintId, intoPageId: empty.pages[0]!.id })!;
    const landed = firstViewLanding(empty, shop, onEmpty)!;
    expect(landed.pageId).toBe(empty.pages[0]!.id);
    const document = applyDocumentCommand(empty, onEmpty).document;
    expect(landed.frameId).toBe(frameOf(document, landed.pageId));

    const bank = await compileWorkspace('architecture\nmodel {\n  person Bob\n  system Bank\n  Bob -> Bank\n}\n');
    const beside = buildWorkspacePagesCommand(document, bank, { mintId, intoPageId: document.pages[0]!.id })!;
    const second = firstViewLanding(document, bank, beside)!;
    expect(second.pageId).not.toBe(landed.pageId);
    expect(second.frameId).toBe(frameOf(applyDocumentCommand(document, beside).document, second.pageId));

    const again = buildWorkspacePagesCommand(document, await compileWorkspace(EDITED), { mintId, intoPageId: document.pages[0]!.id });
    expect(firstViewLanding(document, await compileWorkspace(EDITED), again)).toEqual({ pageId: landed.pageId, frameId: landed.frameId });
  });

  it('keeps a page name the user chose, and renames one still carrying the generated name', async () => {
    const document = await generatedDocument();
    const [, context, containers] = document.pages;
    const renamed = { ...document, pages: document.pages.map((page) => page.id === context!.id ? { ...page, name: 'Shop overview' } : page) };
    const applied = applyDocumentCommand(renamed, buildWorkspacePagesCommand(renamed, await compileWorkspace(EDITED), { mintId })!).document;
    expect(applied.pages.find((page) => page.id === context!.id)!.name).toBe('Shop overview');
    expect(applied.pages.find((page) => page.id === containers!.id)!.name).toBe('Services: Shop');
    // A page still named like its frame (a pre-level-names document) follows the view.
    const stale = { ...document, pages: document.pages.map((page) => page.id === containers!.id ? { ...page, name: 'container of Shop' } : page) };
    const frame = stale.pages.find((page) => page.id === containers!.id)!.nodes.find((node) => node.kind === 'frame')!;
    const label = { ...stale, pages: stale.pages.map((page) => page.id === containers!.id ? { ...page, nodes: page.nodes.map((node) => node.id === frame.id ? { ...node, content: { ...node.content, label: 'container of Shop' } } : node) } : page) };
    const migrated = applyDocumentCommand(label, buildWorkspacePagesCommand(label, await compileWorkspace(WORKSPACE.replace('Web [tech: React]', 'Web [tech: Vue]')), { mintId })!).document;
    expect(migrated.pages.find((page) => page.id === containers!.id)!.name).toBe('Services: Shop');
  });

  it('leaves a page that holds drawings alone', async () => {
    const seeded = await generatedDocument('architecture\nmodel {\n  person Alice\n  system Shop\n  Alice -> Shop\n}\n');
    const busy = seeded.pages.find((page) => archViewIdOfPage(page))!;
    const bob = await compileWorkspace('architecture\nmodel {\n  person Bob\n  system Bank\n  Bob -> Bank\n}\n');
    const applied = applyDocumentCommand(seeded, buildWorkspacePagesCommand(seeded, bob, { mintId, intoPageId: busy.id })!).document;
    expect(applied.pages).toHaveLength(seeded.pages.length + 1);
    expect(applied.pages.find((page) => page.id === busy.id)).toEqual(busy);
  });

  it('regenerates the same pages instead of duplicating them', async () => {
    const document = await generatedDocument();
    const again = await compileWorkspace(EDITED);
    const command = buildWorkspacePagesCommand(document, again, { mintId });
    const applied = applyDocumentCommand(document, command!);
    expect(applied.document.pages).toHaveLength(document.pages.length);
    const web = applied.document.pages
      .filter((page) => archViewIdOfPage(page))
      .flatMap((page) => page.nodes)
      .find((node) => node.id === 'shop.web')!;
    expect(web.content).toMatchObject({ label: 'Web', subLabel: '[Service · Remix]' });
  });

  it('replaces a bound frame in place and is one undo step', async () => {
    const empty = createEmptyV2Document('doc-2', 'Shop');
    const bound = {
      kind: 'insert-node' as const,
      id: 'seed',
      label: 'Seed',
      pageId: empty.pages[0]!.id,
      index: 0,
      node: {
        id: 'bound-frame', kind: 'frame', parentId: null, layerId: 'default', zIndex: 0,
        transform: { translation: { x: 400, y: 60 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
        size: { width: 320, height: 200 }, content: { label: 'Old fence' }, appearance: {}, ports: [],
        metadata: {}, extensions: {},
      },
    };
    const seeded = applyDocumentCommand(empty, bound).document;
    const command = buildWorkspacePagesCommand(seeded, await compileWorkspace(WORKSPACE), { mintId, replaceFrameId: 'bound-frame' })!;
    expect(command.kind).toBe('batch');
    const applied = applyDocumentCommand(seeded, command);
    const page = applied.document.pages[0]!;
    expect(page.nodes.some((node) => node.id === 'bound-frame')).toBe(true);
    expect(page.name).toBe('Overview: Shop');
    expect(page.nodes.some((node) => node.id === 'customer')).toBe(true);
    expect(applied.inverse).toBeTruthy();
    const undone = applyDocumentCommand(applied.document, applied.inverse).document;
    expect(undone.pages[0]!.nodes.map((node) => node.id)).toEqual(['bound-frame']);
  });

  it('leaves an unrelated workspace alone and adds the new one beside it', async () => {
    const shop = await generatedDocument();
    const bank = await compileWorkspace('architecture\nmodel {\n  person Teller\n  system Bank\n  Teller -> Bank\n}\nviews {\n  view context of Bank\n}\n');
    const applied = applyDocumentCommand(shop, buildWorkspacePagesCommand(shop, bank, { mintId })!).document;
    expect(applied.pages.map((page) => page.name)).toEqual(['Page 1', 'Overview: Shop', 'Services: Shop', 'Overview: Bank']);
  });

  it('keeps implicit landscapes of two different models on separate pages', async () => {
    const alice = await generatedDocument('architecture\nmodel {\n  person Alice\n  system Shop\n  Alice -> Shop\n}\n');
    const bob = await compileWorkspace('architecture\nmodel {\n  person Bob\n  system Bank\n  Bob -> Bank\n}\n');
    const applied = applyDocumentCommand(alice, buildWorkspacePagesCommand(alice, bob, { mintId })!).document;
    const placed = applied.pages.map((page) => page.nodes.flatMap((node) => placedElementId(node) ?? []));
    expect(placed.filter((ids) => ids.length)).toEqual([['alice', 'shop'], ['bob', 'bank']]);
  });

  it('regenerates the bound frame when a page holds two model diagrams', async () => {
    const A = 'architecture\nmodel {\n  person Alice\n  system Shop\n  Alice -> Shop\n}\n';
    const B = 'architecture\nmodel {\n  person Bob\n  system Bank\n  Bob -> Bank\n}\n';
    let document = createEmptyV2Document('doc-3', 'Two');
    document = applyDocumentCommand(document, buildDslPageCommand(document.pages[0]!, await compile(A))!).document;
    const second = await compile(B, { origin: nextDslFrameOrigin(document.pages[0]!) });
    document = applyDocumentCommand(document, buildDslPageCommand(document.pages[0]!, second)!).document;
    const secondFrame = document.pages[0]!.nodes.filter((node) => node.kind === 'frame')[1]!;
    const edited = await compileWorkspace(B.replaceAll('Bob', 'Robert'));
    const applied = applyDocumentCommand(document, buildWorkspacePagesCommand(document, edited, { mintId, replaceFrameId: secondFrame.id })!).document;
    expect(applied.pages).toHaveLength(1);
    expect(applied.pages[0]!.nodes.flatMap((node) => placedElementId(node) ?? [])).toEqual(['alice', 'shop', 'robert', 'bank']);
  });
});

describe('element edits', () => {
  it('leaves another model on another page alone', async () => {
    const alice = await generatedDocument('architecture\nmodel {\n  person Alice\n  system Shop\n  Alice -> Shop\n}\n');
    const bob = await compileWorkspace('architecture\nmodel {\n  person Bob\n  system Bank\n  Bob -> Bank\n}\n');
    const both = applyDocumentCommand(alice, buildWorkspacePagesCommand(alice, bob, { mintId })!).document;
    const ids = (document: SceneDocumentV1) => document.pages.flatMap((page) => {
      const model = archModelOfPage(page);
      return model ? [model.elements.map((element) => element.id).join(',')] : [];
    });
    const renamed = apply(both, buildArchElementEditCommand(both, 'bob', { name: 'Robert' })!).document;
    expect(ids(renamed)).toEqual(['alice,shop', 'bob,bank']);
    const removed = applyDocumentCommand(renamed, buildArchElementRemoveCommand(renamed, 'shop')!).document;
    expect(ids(removed)).toEqual(['alice', 'bob,bank']);
    const related = buildArchRelationCommands(removed, 'bank', 'bob', 'pays')!;
    const linked = applyDocumentCommand(removed, { kind: 'batch', id: 'r', label: 'r', commands: related.commands }).document;
    expect(archModelOfPage(linked.pages.find((page) => ids({ ...linked, pages: [page] })[0] === 'alice')!)!.relations).toHaveLength(0);
  });

  it('renames an element across every view as one undo step', async () => {
    const document = await generatedDocument();
    const command = buildArchElementEditCommand(document, 'shop.web', { name: 'Frontend' })!;
    expect(command.kind).toBe('batch');
    const applied = apply(document, command);
    for (const page of applied.document.pages.filter((candidate) => archViewIdOfPage(candidate))) {
      const model = archModelOfPage(page)!;
      expect(model.elements.find((element) => element.id === 'shop.web')?.name).toBe('Frontend');
    }
    const web = applied.document.pages
      .flatMap((page) => page.nodes)
      .filter((node) => placedElementId(node) === 'shop.web');
    expect(web.length).toBeGreaterThan(0);
    expect(web.every((node) => node.content.label === 'Frontend')).toBe(true);
    const undone = applyDocumentCommand(applied.document, applied.inverse).document;
    expect(undone).toEqual(document);
  });

  it('keeps the kind-colour marker consistent with the element colour', async () => {
    const document = await generatedDocument(WORKSPACE.replace('person Customer', 'person Customer [icon: tabler/user]'));
    const placed = (doc: SceneDocumentV1) => doc.pages.flatMap((page) => page.nodes).filter((node) => placedElementId(node) === 'customer');
    expect(placed(document).every((node) => node.content.archKindColor === 'violet')).toBe(true);
    const authored = apply(document, buildArchElementEditCommand(document, 'customer', { color: 'red' })!).document;
    for (const node of placed(authored)) {
      expect(node.content.archKindColor).toBeUndefined();
      expect(node.content.color).toBe('red');
    }
  });

  it('returns null when nothing changes and keeps ids stable on tech edits', async () => {
    const document = await generatedDocument();
    expect(buildArchElementEditCommand(document, 'shop.web', { name: 'Web' })).toBeNull();
    expect(buildArchElementEditCommand(document, 'nope', { name: 'X' })).toBeNull();
    const applied = apply(document, buildArchElementEditCommand(document, 'shop.web', { tech: '', desc: 'The front door' })!);
    const web = applied.document.pages.flatMap((page) => page.nodes).find((node) => node.id === 'shop.web')!;
    expect(web.id).toBe('shop.web');
    expect(web.content.label).toBe('Web');
    expect(web.content.subLabel).toBe('[Service]\nThe front door');
    const element = archModelOfPage(applied.document.pages.find((page) => archViewIdOfPage(page))!)!
      .elements.find((candidate) => candidate.id === 'shop.web')!;
    expect(element.tech).toBeUndefined();
    expect(element.desc).toBe('The front door');
  });

  it('keeps the model copies of every view identical across a run of edits', async () => {
    let document = await generatedDocument();
    const edits: Array<Parameters<typeof buildArchElementEditCommand>[2]> = [
      { name: 'Frontend' }, { tech: 'Remix' }, { desc: 'Talks to the API' },
      { tags: ['edge'] }, { links: ['adr/0001.md'] }, { name: 'Web' }, { tech: '' },
    ];
    for (const patch of edits) {
      const command = buildArchElementEditCommand(document, 'shop.web', patch);
      if (command) document = apply(document, command).document;
      const models = document.pages.filter((page) => archViewIdOfPage(page)).map((page) => archModelOfPage(page));
      expect(models.length).toBeGreaterThan(1);
      // Order-insensitive identity: every page carries the same model value.
      const serialized = new Set(models.map((model) => JSON.stringify(model)));
      expect(serialized.size).toBe(1);
    }
    const web = document.pages.flatMap((page) => page.nodes).filter((node) => placedElementId(node) === 'shop.web');
    expect(web.every((node) => node.content.label === 'Web')).toBe(true);
  });

  it('unplaces from one view without touching the model or the other view', async () => {
    const document = await generatedDocument();
    const containerPage = document.pages.find((page) => archViewIdOfPage(page) === 'view:container:shop')!;
    const command = buildArchUnplaceCommand(containerPage, ['shop.db'])!;
    const applied = applyDocumentCommand(document, command);
    const after = applied.document;
    const container = after.pages.find((page) => archViewIdOfPage(page) === 'view:container:shop')!;
    expect(container.nodes.some((node) => node.id === 'shop.db')).toBe(false);
    expect(archModelOfPage(container)!.elements.some((element) => element.id === 'shop.db')).toBe(true);
    const context = after.pages.find((page) => archViewIdOfPage(page) === 'view:context:shop')!;
    expect(archModelOfPage(context)!.elements.some((element) => element.id === 'shop.db')).toBe(true);
  });

  it('removes an element and its descendants from the model and every view', async () => {
    const document = await generatedDocument();
    const command = buildArchElementRemoveCommand(document, 'shop')!;
    const applied = applyDocumentCommand(document, command);
    for (const page of applied.document.pages.filter((candidate) => archViewIdOfPage(candidate))) {
      const model = archModelOfPage(page)!;
      expect(model.elements.some((element) => element.id.startsWith('shop'))).toBe(false);
      expect(page.nodes.some((node) => node.id.startsWith('shop'))).toBe(false);
      expect(page.connectors).toHaveLength(0);
    }
    const undone = applyDocumentCommand(applied.document, applied.inverse).document;
    expect(undone).toEqual(document);
  });

  it('merges a model relation with a canvas connector in one valid batch', async () => {
    const document = await generatedDocument();
    const containerPage = document.pages.find((page) => archViewIdOfPage(page) === 'view:container:shop')!;
    const relation = buildArchRelationCommands(document, 'shop.web', 'shop.db', 'writes cache', { exceptPageId: containerPage.id })!;
    const connector = {
      kind: 'insert-connector' as const,
      id: 'insert-connector:rel:shop.web->shop.db',
      label: 'Insert connector',
      pageId: containerPage.id,
      index: containerPage.connectors.length,
      connector: {
        id: 'rel:shop.web->shop.db',
        source: { nodeId: 'shop.web', portId: null, anchor: null, point: null },
        target: { nodeId: 'shop.db', portId: null, anchor: null, point: null },
        route: { kind: 'orthogonal' as const, ownership: 'automatic' as const },
        waypoints: [], labels: [], appearance: {}, semantics: {}, metadata: {}, extensions: {},
      },
    };
    const command = {
      kind: 'batch' as const,
      id: 'connector-with-relation',
      label: 'Connect elements',
      commands: [...relation.commands, connector],
    };
    const applied = applyDocumentCommand(document, command);
    const page = applied.document.pages.find((candidate) => candidate.id === containerPage.id)!;
    expect(page.connectors.some((edge) => edge.id === 'rel:shop.web->shop.db')).toBe(true);
    expect(archModelOfPage(page)!.relations.some((edge) => edge.id === 'rel:shop.web->shop.db')).toBe(true);
    expect(applyDocumentCommand(applied.document, applied.inverse).document).toEqual(document);
  });

  it('draws a new relation on every other view that places both ends, like Generate would', async () => {
    const document = await generatedDocument(WORKSPACE.replace('  view container of Shop\n', '  view container of Shop\n  view custom "Data" { include Shop.API; include Shop.DB }\n'));
    const containerPage = document.pages.find((page) => archViewIdOfPage(page) === 'view:container:shop')!;
    const dataPage = document.pages.find((page) => page.name === 'Data');
    expect(dataPage).toBeDefined();
    const relation = buildArchRelationCommands(document, 'shop.api', 'shop.db', 'reads', { exceptPageId: containerPage.id })!;
    const applied = applyDocumentCommand(document, { kind: 'batch', id: 'b', label: 'b', commands: relation.commands });
    const container = applied.document.pages.find((page) => page.id === containerPage.id)!;
    const data = applied.document.pages.find((page) => page.id === dataPage!.id)!;
    // The drawing page is left to the caller; the other view gets the compiled shape of the connector.
    expect(container.connectors.some((edge) => edge.id === 'rel:shop.api->shop.db')).toBe(false);
    const drawn = data.connectors.find((edge) => edge.id === 'rel:shop.api->shop.db')!;
    expect(drawn.labels[0]?.text).toBe('reads');
    expect(drawn.metadata.model).toEqual({ relationId: 'rel:shop.api->shop.db' });
    // Relabel: existing connectors follow, none are duplicated.
    const relabel = buildArchRelationCommands(applied.document, 'shop.api', 'shop.db', 'queries')!;
    const relabelled = applyDocumentCommand(applied.document, { kind: 'batch', id: 'c', label: 'c', commands: relabel.commands }).document;
    const after = relabelled.pages.find((page) => page.id === dataPage!.id)!;
    expect(after.connectors.filter((edge) => edge.id === 'rel:shop.api->shop.db')).toHaveLength(1);
    expect(after.connectors.find((edge) => edge.id === 'rel:shop.api->shop.db')!.labels[0]?.text).toBe('queries');
  });

  it('removing an element drops the views of it and their pages, and is one undo step', async () => {
    const document = await generatedDocument();
    expect(document.pages.some((page) => archViewIdOfPage(page) === 'view:container:shop')).toBe(true);
    const applied = applyDocumentCommand(document, buildArchElementRemoveCommand(document, 'shop')!);
    // Every view was of Shop; one page stays so the model (Customer) is not lost with them.
    const modelPages = applied.document.pages.filter((page) => archViewIdOfPage(page));
    expect(modelPages).toHaveLength(1);
    const model = archModelOfPage(modelPages[0]!)!;
    expect(model.elements.map((element) => element.id)).toEqual(['customer']);
    expect(model.views.map((view) => view.id)).toEqual([]);
    expect(applyDocumentCommand(applied.document, applied.inverse).document).toEqual(document);
  });
});

 it('removes obsolete workspace views, retaining unrelated pages and reversible history', async () => {
    const before = await generatedDocument();
    const workspace = await compileWorkspace(WORKSPACE.replace('  view context of Shop\n', ''));
    const applied = applyDocumentCommand(before, buildWorkspacePagesCommand(before, workspace, {mintId})!);
    expect(applied.document.pages.map(archViewIdOfPage).filter(Boolean)).toEqual(['view:container:shop']);
    expect(applied.document.pages[0]).toEqual(before.pages[0]);
    expect(applyDocumentCommand(applied.document, applied.inverse).document).toEqual(before);
  });

 it('creates a flow across all model views atomically, rejecting invalid and duplicate flows', async () => {
    const before = await generatedDocument();
    const flow = {id: 'flow:order', name: 'Order', steps: [{id: 'flow:order:step:1', kind: 'message' as const, from: 'shop.web', to: 'shop.api', label: 'Submit order', tags: []}]};
    const applied = applyDocumentCommand(before, buildArchFlowCreateCommand(before, flow)!);
    for (const page of applied.document.pages.filter((page) => archModelOfPage(page))) expect(archModelOfPage(page)!.flows).toContainEqual(flow);
    expect(applyDocumentCommand(applied.document, applied.inverse).document).toEqual(before);
    expect(buildArchFlowCreateCommand(applied.document, flow)).toBeNull();
    expect(buildArchFlowCreateCommand(before, {...flow, steps: [{...flow.steps[0]!, to: 'missing'}]})).toBeNull();
  });

 it('relabels the selected parallel relation and can clear its label without changing its protocol', async () => {
    const before = await generatedDocument(WORKSPACE.replace('Web -> API : calls', 'Web -> API : calls [tech: HTTPS]\n    Web -> API : events [tech: AMQP]'));
    const edit = buildArchRelationCommands(before, 'shop.web', 'shop.api', '', {relationId: 'rel:shop.web->shop.api:2'})!;
    const applied = applyDocumentCommand(before, {kind: 'batch', id: 'relabel', label: 'Relabel', commands: edit.commands});
    const model = archModelOfPage(applied.document.pages[1]!)!;
    expect(model.relations.find((relation) => relation.id === 'rel:shop.web->shop.api')!.label).toBe('calls');
    expect(model.relations.find((relation) => relation.id === 'rel:shop.web->shop.api:2')).toMatchObject({tech: 'AMQP'});
    expect(model.relations.find((relation) => relation.id === 'rel:shop.web->shop.api:2')!.label).toBeUndefined();
    expect(applyDocumentCommand(applied.document, applied.inverse).document).toEqual(before);
  });

 it('records a second drawn relationship separately and projects it onto higher views', async () => {
    const before = await generatedDocument();
    const unlabelled = applyDocumentCommand(before, {kind: 'batch', id: 'unlabel', label: 'Unlabel', commands: buildArchRelationCommands(before, 'customer', 'shop.web', '')!.commands}).document;
    // The new relationship is labelled and the old one isn't: it outscores it, but the pair is already drawn.
    const edit = buildArchRelationCommands(unlabelled, 'customer', 'shop.web', 'tracks orders', {create: true})!;
    expect(edit.relation.id).toBe('rel:customer->shop.web:2');
    const applied = applyDocumentCommand(unlabelled, {kind: 'batch', id: 'parallel', label: 'Connect', commands: edit.commands});
    const model = archModelOfPage(applied.document.pages[1]!)!;
    expect(model.relations.filter((relation) => relation.from === 'customer' && relation.to === 'shop.web')).toHaveLength(2);
    expect(applied.document.pages[1]!.connectors.filter((connector) => connector.source.nodeId === 'customer' && connector.target.nodeId === 'shop')).toHaveLength(1);
    expect(applyDocumentCommand(applied.document, applied.inverse).document).toEqual(unlabelled);
  });

 it('keeps notes inside an obsolete view at their exact world transforms', async () => {
    const original = await generatedDocument();
    const page = original.pages[1]!;
    const frame = page.nodes.find((node) => node.kind === 'frame')!;
    const note = createTestNode('review-note', {parentId: frame.id, content: {label: 'Keep this note'}});
    const before = {...original, pages: original.pages.map((entry) => entry.id === page.id ? {...entry, nodes: [...entry.nodes, note]} : entry)};
    const workspace = await compileWorkspace(WORKSPACE.replace('  view context of Shop\n', ''));
    const applied = applyDocumentCommand(before, buildWorkspacePagesCommand(before, workspace, {mintId})!);
    const kept = applied.document.pages.find((entry) => entry.id === page.id)!;
    expect(archViewIdOfPage(kept)).toBeNull();
    expect(archModelOfPage(kept)).toBeNull();
    expect(buildNodeWorldMatrices(kept).get(note.id)).toEqual(buildNodeWorldMatrices(before.pages[1]!).get(note.id));
    expect(applyDocumentCommand(applied.document, applied.inverse).document).toEqual(before);
  });

describe('add element command', () => {
  const modelsOf = (document: SceneDocumentV1) => document.pages.flatMap((page) => archModelOfPage(page) ?? []);
  const modelPageId = (document: SceneDocumentV1) => document.pages.find((page) => archModelOfPage(page))!.id;
  const add = (document: SceneDocumentV1, parentId: string | null, kind: ElementKind, name: string) =>
    buildArchElementAddCommand(document, modelPageId(document), { parentId, kind, name });

  it('adds a top-level element to every page copy and the code text, and undo restores exactly', async () => {
    const document = await generatedDocument();
    const { command, id } = add(document, null, 'system', 'Billing')!;
    expect(id).toBe('billing');
    expect(command.label).toBe('Add element');
    const after = applyDocumentCommand(document, command);
    const models = modelsOf(after.document);
    expect(models.length).toBeGreaterThan(1);
    for (const model of models) expect(model.elements.find((e) => e.id === 'billing')).toMatchObject({ kind: 'system', name: 'Billing', parent: null });
    expect(architectureWorkspaceText(models[0]!)).toContain('system Billing');
    expect(applyDocumentCommand(after.document, after.inverse).document).toEqual(document);
  });

  it('adds a child under a system and de-duplicates ids', async () => {
    const document = await generatedDocument();
    const first = applyDocumentCommand(document, add(document, 'shop', 'container', 'Web')!.command).document;
    expect(modelsOf(first)[0]!.elements.find((e) => e.id === 'shop.web-2')).toMatchObject({ parent: 'shop', name: 'Web' });
    const second = add(first, 'shop', 'container', 'Web')!.command;
    expect(modelsOf(applyDocumentCommand(first, second).document)[0]!.elements.some((e) => e.id === 'shop.web-3')).toBe(true);
    expect(architectureWorkspaceText(modelsOf(first)[0]!)).toContain('container Web');
  });

  it('rejects parents that cannot hold children, unknown parents and empty names', async () => {
    const document = await generatedDocument();
    expect(add(document, 'customer', 'component', 'X')).toBeNull();
    expect(add(document, 'shop.db', 'component', 'X')).toBeNull();
    expect(add(document, 'nope', 'container', 'X')).toBeNull();
    expect(add(document, null, 'system', '  ')).toBeNull();
  });

  it('adds to the model of the given page only, and to an empty model', async () => {
    const alice = await generatedDocument('architecture\nmodel {\n  person Alice\n  system Shop\n  Alice -> Shop\n}\n');
    const bob = await compileWorkspace('architecture\nmodel {\n  person Bob\n  system Bank\n  Bob -> Bank\n}\n');
    const both = applyDocumentCommand(alice, buildWorkspacePagesCommand(alice, bob, { mintId })!).document;
    const bobPage = both.pages.find((page) => archModelOfPage(page)?.elements.some((e) => e.id === 'bob'))!;
    const added = applyDocumentCommand(both, buildArchElementAddCommand(both, bobPage.id, { parentId: null, kind: 'system', name: 'Ledger' })!.command).document;
    expect(modelsOf(added).map((model) => model.elements.map((e) => e.id).join(','))).toEqual(['alice,shop', 'bob,bank,ledger']);

    const empty = await generatedDocument('architecture\nmodel {}\n');
    const first = buildArchElementAddCommand(empty, modelPageId(empty), { parentId: null, kind: 'system', name: 'Shop' })!;
    expect(modelsOf(applyDocumentCommand(empty, first.command).document)[0]!.elements.map((e) => e.id)).toEqual(['shop']);
  });

  it('picks the default kind by parent', () => {
    expect([null, 'system', 'container', 'component', 'person', 'store', 'external'].map((kind) => defaultChildKind(kind as never)))
      .toEqual(['system', 'container', 'component', null, null, null, null]);
  });
});
