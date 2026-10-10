import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { compileWorkspace } from '../../../dsl/compile';
import { architectureWorkspaceText } from '../../../dsl/families/architecture/text';
import { archModelOfPage, archViewIdOfPage, placedElementId } from '../../../dsl/model/model';
import { buildWorkspacePagesCommand } from '../../application/dsl/architectureCommands';
import { applyDocumentCommand } from '../../domain/commands/execute';
import type { DocumentCommand } from '../../domain/commands/types';
import type { SceneDocumentV1, ScenePage } from '../../domain/document/types';
import { useV2Architecture } from './useV2Architecture';
import { useV2ArchitectureActions, type ArchitectureActionHost } from './useV2ArchitectureActions';
import { createEmptyV2Document } from './v2Document';

let counter = 0;
const mintId = (prefix: string) => `${prefix}-actions-${counter++}`;

const WORKSPACE = `architecture
model {
  person Customer
  system Shop {
    container Web
    container API
    Web -> API : calls
  }
  Customer -> Shop.Web : uses
}
views {
  view context of Shop
  view container of Shop
  view custom "Just the web" {
    include Shop.Web
  }
}
`;

/** The workspace generated, then arranged by hand: every frame and node moved, a note on each frame. */
async function generated(): Promise<SceneDocumentV1> {
  const empty = createEmptyV2Document('d', 'Shop');
  const command = buildWorkspacePagesCommand(empty, await compileWorkspace(WORKSPACE), { mintId, intoPageId: empty.pages[0]!.id })!;
  const document = applyDocumentCommand(empty, command).document;
  return { ...document, pages: document.pages.map((page) => {
    const frame = page.nodes.find((node) => node.kind === 'frame')!;
    const moved = page.nodes.map((node, at) => ({ ...node,
      transform: { ...node.transform, translation: node === frame ? { x: 500, y: 300 } : { x: 9000 + at * 300, y: 9999 } },
      appearance: node === frame ? node.appearance : { ...node.appearance, stroke: '#ff0000' } }));
    const note = { ...frame, id: `${page.id}-note`, kind: 'text' as const, parentId: frame.id, content: { label: 'my note' }, metadata: {}, appearance: {} };
    return { ...page, nodes: [...moved, note] };
  }) };
}

/** Every node that was on the page before, exactly as it was. */
function untouched(before: SceneDocumentV1, after: SceneDocumentV1): void {
  for (const page of before.pages) {
    const next = after.pages.find((candidate) => candidate.id === page.id)!;
    for (const node of page.nodes) {
      const kept = next.nodes.find((candidate) => candidate.id === node.id);
      expect(kept, node.id).toBeDefined();
      expect(JSON.stringify(kept!.transform), node.id).toBe(JSON.stringify(node.transform));
      expect(JSON.stringify(kept!.appearance), node.id).toBe(JSON.stringify(node.appearance));
      expect(kept!.parentId, node.id).toBe(node.parentId);
    }
  }
}

const pageOf = (document: SceneDocumentV1, viewId: string) => document.pages.find((page) => archViewIdOfPage(page) === viewId)!;
const placed = (page: ScenePage) => page.nodes.flatMap((node) => placedElementId(node) ?? []);

/** The actions on one page, with a host that records every commit. */
function actionsOn(document: SceneDocumentV1, viewId: string) {
  const commits: DocumentCommand[] = [];
  const page = pageOf(document, viewId);
  const host: ArchitectureActionHost = {
    glideToNodes: () => {}, openPage: () => {}, selectNodes: () => {}, announce: () => {},
    commit: (command) => { commits.push(command); },
    compileWorkspace: (text) => compileWorkspace(text),
    compileSequence: (text) => compileWorkspace(text),
  };
  const { result } = renderHook(() => {
    const architecture = useV2Architecture(document, page);
    return useV2ArchitectureActions({ architecture, document, pageRef: { current: page }, readOnly: false, mintId }, host);
  });
  return { actions: result.current, commits };
}

describe('model edits re-run the views', () => {
  it('an element added inside a system appears in its include * view, as one undo step', async () => {
    const document = await generated();
    const { actions, commits } = actionsOn(document, 'view:container:shop');
    let id: string | null = null;
    await act(async () => { id = await actions.addElement('shop', 'container'); });
    expect(id).toBe('shop.new-container');
    expect(commits).toHaveLength(1);
    const after = applyDocumentCommand(document, commits[0]!).document;
    expect(placed(pageOf(after, 'view:container:shop'))).toContain('shop.new-container');
    expect(placed(pageOf(after, 'view:custom:just-the-web'))).not.toContain('shop.new-container');
    untouched(document, after);
    // Placed inside its system's boundary, clear of the nodes already there.
    const containers = pageOf(after, 'view:container:shop');
    const added = containers.nodes.find((node) => node.id === 'shop.new-container')!;
    expect(added.parentId).toBe('shop');
  });

  it('the first rename of a just-added element moves its id to the new name; a referenced one keeps it', async () => {
    const document = await generated();
    const adding = actionsOn(document, 'view:container:shop');
    await act(async () => { await adding.actions.addElement('shop', 'container'); });
    const added = applyDocumentCommand(document, adding.commits[0]!).document;
    const { actions, commits } = actionsOn(added, 'view:container:shop');
    let id: string | null = null;
    await act(async () => { id = await actions.editElement('shop.new-container', { name: 'Payments API' }); });
    expect(id).toBe('shop.payments-api');
    expect(commits).toHaveLength(1);
    const renamed = applyDocumentCommand(added, commits[0]!).document;
    const model = archModelOfPage(pageOf(renamed, 'view:container:shop'))!;
    expect(model.elements.map((element) => element.id)).toContain('shop.payments-api');
    expect(model.elements.map((element) => element.id)).not.toContain('shop.new-container');
    expect(placed(pageOf(renamed, 'view:container:shop'))).toContain('shop.payments-api');
    untouched({ ...added, pages: added.pages.map((page) => ({ ...page, nodes: page.nodes.filter((node) => node.id !== 'shop.new-container') })) }, renamed);

    const kept = actionsOn(renamed, 'view:container:shop');
    await act(async () => { id = await kept.actions.editElement('shop.web', { name: 'Storefront' }); });
    expect(id).toBe('shop.web');
  });

  it('Add to this view includes an element the view leaves out', async () => {
    const document = await generated();
    const { actions, commits } = actionsOn(document, 'view:custom:just-the-web');
    await act(async () => { await actions.addToView('shop.api'); });
    expect(commits).toHaveLength(1);
    const after = applyDocumentCommand(document, commits[0]!).document;
    expect(placed(pageOf(after, 'view:custom:just-the-web'))).toEqual(expect.arrayContaining(['shop.web', 'shop.api']));
    untouched(document, after);
    // Its relation to an element already there is drawn.
    expect(pageOf(after, 'view:custom:just-the-web').connectors.map((connector) => `${connector.source.nodeId}->${connector.target.nodeId}`)).toContain('shop.web->shop.api');
  });

  it('a rename after Add to this view keeps the element in the view (the rule follows the id)', async () => {
    const document = await generated();
    const adding = actionsOn(document, 'view:custom:just-the-web');
    let id: string | null = null;
    await act(async () => { id = await adding.actions.addElement(null, 'system'); });
    let doc = applyDocumentCommand(document, adding.commits[0]!).document;
    const viewing = actionsOn(doc, 'view:custom:just-the-web');
    await act(async () => { await viewing.actions.addToView(id!); });
    doc = applyDocumentCommand(doc, viewing.commits[0]!).document;
    expect(placed(pageOf(doc, 'view:custom:just-the-web'))).toContain('new-system');
    const renaming = actionsOn(doc, 'view:custom:just-the-web');
    await act(async () => { id = await renaming.actions.editElement('new-system', { name: 'Billing' }); });
    doc = applyDocumentCommand(doc, renaming.commits[0]!).document;
    expect(id).toBe('billing');
    expect(placed(pageOf(doc, 'view:custom:just-the-web'))).toContain('billing');
    const view = archModelOfPage(pageOf(doc, 'view:custom:just-the-web'))!.views.find((candidate) => candidate.id === 'view:custom:just-the-web')!;
    expect(view.rules.map((rule) => rule.subject)).toContain('billing');
    expect((await compileWorkspace(architectureWorkspaceText(archModelOfPage(pageOf(doc, 'view:custom:just-the-web'))!))).views
      .find((entry) => entry.viewId === 'view:custom:just-the-web')!.result.nodes.map((node) => node.id)).toContain('billing');
  });
});
