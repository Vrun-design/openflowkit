import { describe, expect, it } from 'vitest';
import { compileWorkspace } from '../../../dsl/compile';
import { archModelOfPage, archViewIdOfPage, placedElementId } from '../../../dsl/model/model';
import { applyDocumentCommand } from '../../domain/commands/execute';
import type { SceneDocumentV1 } from '../../domain/document/types';
import { createEmptyV2Document } from '../../presentation/v2/v2Document';
import {
  buildArchElementEditCommand, buildArchElementRemoveCommand,
  buildArchRelationCommands, buildArchUnplaceCommand, buildWorkspacePagesCommand,
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
    expect(shopPages.map((page) => page.name)).toEqual(['context of Shop', 'container of Shop']);
    expect(shopPages.every((page) => page.diagramKind === 'architecture')).toBe(true);
    const contextNodes = shopPages[0]!.nodes.map((node) => node.id).sort();
    expect(contextNodes).toEqual(expect.arrayContaining(['customer', 'shop']));
    expect(archModelOfPage(shopPages[0]!)?.elements.map((element) => element.id)).toEqual([
      'customer', 'shop', 'shop.web', 'shop.api', 'shop.db',
    ]);
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
    expect(web.content).toMatchObject({ label: 'Web', subLabel: 'Remix' });
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
    expect(page.name).toBe('context of Shop');
    expect(page.nodes.some((node) => node.id === 'customer')).toBe(true);
    expect(applied.inverse).toBeTruthy();
    const undone = applyDocumentCommand(applied.document, applied.inverse).document;
    expect(undone.pages[0]!.nodes.map((node) => node.id)).toEqual(['bound-frame']);
  });
});

describe('element edits', () => {
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

  it('returns null when nothing changes and keeps ids stable on tech edits', async () => {
    const document = await generatedDocument();
    expect(buildArchElementEditCommand(document, 'shop.web', { name: 'Web' })).toBeNull();
    expect(buildArchElementEditCommand(document, 'nope', { name: 'X' })).toBeNull();
    const applied = apply(document, buildArchElementEditCommand(document, 'shop.web', { tech: '', desc: 'The front door' })!);
    const web = applied.document.pages.flatMap((page) => page.nodes).find((node) => node.id === 'shop.web')!;
    expect(web.id).toBe('shop.web');
    expect(web.content.label).toBe('Web');
    expect('subLabel' in web.content).toBe(false);
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
