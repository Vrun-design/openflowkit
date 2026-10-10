import type { CompileWorkspaceResult } from '../../../dsl/compile';
import { projectRelations, selectViewElements } from '../../../dsl/model/predicates';
import { contentColor, elementColorKey, elementNode, relationConnector } from '../../../dsl/families/architecture/scene';
import {
  archFrameOf, archModelFromJson, archModelOfPage, archViewIdOfPage, createArchIndex, elementAncestors, elementDescendantIds, flattenFlowSteps, placedElementId,
} from '../../../dsl/model/model';
import { ELEMENT_KIND_LABEL, type ElementKind, type ArchElement, type ArchFlow, type ArchModel, type ArchRelation, type ArchView, type FlowStep } from '../../../dsl/model/types';
import { nodePaletteName, paletteResolver } from '../../domain/nodes/nodePalette';
import { createDefaultSceneLayer } from '../../domain/document/defaults';
import type { BatchDocumentCommand, DocumentCommand } from '../../domain/commands/types';
import type { JsonObject } from '../../domain/document/json';
import type { SceneDocumentV1, SceneNode, ScenePage } from '../../domain/document/types';
import { buildDeleteSelectionCommand } from '../../domain/commands/sceneEdits';
import { slugifyDslId } from '../../../dsl/text';
import { buildDslPageCommand } from './dslPageCommand';
import { hasAutoIcon, hasIcon, refreshAutoIcon, withElementIcon, withoutElementIcon, type IconResolver } from './iconCommands';

/**
 * Model-aware commands: one element, many views. Every builder returns ONE
 * batch so a rename, a relation or a workspace generate is one undo step.
 */

export type ArchElementPatch = Partial<Pick<ArchElement, 'name' | 'tech' | 'desc' | 'tags' | 'links' | 'color' | 'icon'>>;

interface ModelPage {
  readonly page: ScenePage;
  readonly model: ArchModel;
  readonly viewId: string | null;
}

/**
 * The pages of the model that holds `elementId`, each with the model copy off
 * its frame. Another model's pages never take this model's copy.
 */
// ponytail: element-overlap identity, like workspaceFrames — stamp a workspace id on view frames if two models share an id
export function modelPages(document: SceneDocumentV1, elementId: string): readonly ModelPage[] {
  const all = document.pages.flatMap((page) => {
    const model = archModelOfPage(page);
    return model ? [{ page, model, viewId: archViewIdOfPage(page) }] : [];
  });
  const home = all.find(({ model }) => model.elements.some((element) => element.id === elementId));
  if (!home) return [];
  const ids = new Set(home.model.elements.map((element) => element.id));
  return [home, ...all.filter((entry) => entry !== home && entry.model.elements.some((element) => ids.has(element.id)))];
}

export function isModelPlacement(node: SceneNode): boolean {
  return placedElementId(node) !== null;
}

/** Rewrites a page so its frames carry the new model and its placements follow it. */
function pageWithModel(page: ScenePage, model: ArchModel, resolveIcon?: IconResolver): ScenePage {
  const index = createArchIndex(model);
  const carriesModel = archFrameOf(page) !== null;
  const nodes = page.nodes.map((node) => {
    const withModelCopy = carriesModel && node.metadata.dsl
      ? { ...node, metadata: { ...node.metadata, dsl: withArchModel(node.metadata.dsl, model) } }
      : node;
    const elementId = placedElementId(node);
    const element = elementId ? index.byId.get(elementId) : undefined;
    if (!element) return withModelCopy;
    // `icon: none` on the element, or `icons: off` on the model, takes the card back to its shape.
    const iconGone = hasIcon(withModelCopy) && (element.icon === 'none' || (model.icons === 'off' && hasAutoIcon(withModelCopy)));
    // An icon the author picked (in the text, or on the canvas for every view) draws the element as its card.
    const iconPicked = !iconGone && resolveIcon && element.icon && element.icon !== 'none' && withModelCopy.content.icon !== element.icon;
    const stripped = iconGone ? withoutElementIcon(withModelCopy, element)
      : iconPicked ? withElementIcon(withModelCopy, element, resolveIcon) : withModelCopy;
    // A rename or a new `tech:` moves an inferred icon with it (needs the host's resolver).
    const drawn = resolveIcon
      ? refreshAutoIcon(stripped, element.name, element.tech, resolveIcon, (plain) => withoutElementIcon(plain, element))
      : stripped;
    const content: Record<string, unknown> = { ...drawn.content,
      label: element.name,
      subLabel: node.kind === 'frame' ? `[${ELEMENT_KIND_LABEL[element.kind]}]` : `[${ELEMENT_KIND_LABEL[element.kind]}${element.tech ? ` · ${element.tech}` : ''}]${element.desc ? `\n${element.desc}` : ''}`,
    };
    if (drawn.kind === 'architecture') {
      content.assetPresentation = 'card';
      content.archProviderLabel = ELEMENT_KIND_LABEL[element.kind];
      content.archResourceType = element.tech ?? '';
      if (element.desc) content.archEnvironment = element.desc; else delete content.archEnvironment;
      // A kind-coloured card follows its element: an authored colour replaces it, a new kind brings its own.
      if (content.archKindColor !== undefined) {
        const { key, fromKind } = elementColorKey(element);
        delete content.customColor;
        if (key) Object.assign(content, contentColor(key)); else delete content.color;
        if (key && fromKind) content.archKindColor = key; else delete content.archKindColor;
      }
    }
    const placement: Record<string, unknown> = { ...(isRecord(drawn.metadata.model) ? drawn.metadata.model : {}), tags: [...element.tags] };
    if (element.desc) placement.desc = element.desc; else delete placement.desc;
    if (element.links.length) placement.links = [...element.links]; else delete placement.links;
    return {
      ...drawn,
      content: content as JsonObject,
      metadata: { ...drawn.metadata, model: placement as JsonObject },
    };
  });
  return { ...page, nodes };
}

function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function withArchModel(dsl: unknown, model: ArchModel): JsonObject {
  const record: Record<string, unknown> = isRecord(dsl) ? { ...dsl } : {};
  const arch: Record<string, unknown> = isRecord(record.arch) ? { ...record.arch } : {};
  arch.model = model;
  record.arch = arch;
  return record as JsonObject;
}

function batch(id: string, label: string, commands: readonly DocumentCommand[]): BatchDocumentCommand {
  return { kind: 'batch', id, label, commands };
}

function setPage(page: ScenePage, after: ScenePage, id: string, label: string): DocumentCommand {
  return { kind: 'set-page', id, label, pageId: page.id, before: page, after };
}

/* ------------------------------------------------------------------ pages */

export interface WorkspacePagesOptions {
  /** A frame the code panel is bound to: its view replaces the frame in place. */
  readonly replaceFrameId?: string;
  /** The page the user generates from: when it holds nothing, the first new view takes it instead of leaving it empty. */
  readonly intoPageId?: string;
  readonly mintId: (prefix: string) => string;
}

interface ModelFrame {
  readonly page: ScenePage;
  readonly frame: SceneNode;
  readonly viewId: string | null;
  readonly ids: ReadonlySet<string>;
}

function frameArch(frame: SceneNode): Pick<ModelFrame, 'viewId' | 'ids'> | null {
  const dsl = frame.metadata.dsl;
  if (!isRecord(dsl) || !isRecord(dsl.arch)) return null;
  const model = archModelFromJson(dsl.arch.model);
  return {
    viewId: typeof dsl.arch.view === 'string' ? dsl.arch.view : null,
    ids: new Set(model?.elements.map((element) => element.id) ?? []),
  };
}

function modelFrameCount(page: ScenePage): number {
  return page.nodes.filter((node) => frameArch(node)).length;
}

/**
 * Model frames that belong to the workspace being generated. Every model
 * without a `views` block is `view:landscape`, so a view id alone can't say
 * whose page it is.
 */
// ponytail: element-overlap identity; two models sharing an id merge — stamp a workspace id on view frames if that bites
function workspaceFrames(document: SceneDocumentV1, workspace: CompileWorkspaceResult): readonly ModelFrame[] {
  const first = workspace.views[0]!.result.frame;
  const incoming = frameArch(first)?.ids ?? new Set<string>();
  return document.pages.flatMap((page) => page.nodes.flatMap((frame) => {
    const arch = frameArch(frame);
    return arch && [...arch.ids].some((id) => incoming.has(id)) ? [{ page, frame, ...arch }] : [];
  }));
}

/** Where each generated view lives: the bound frame for its own view, else this workspace's frame for it. */
export function workspaceViewFrames(
  document: SceneDocumentV1,
  workspace: CompileWorkspaceResult,
  replaceFrameId?: string,
): readonly ({ readonly pageId: string; readonly frameId: string } | null)[] {
  const frames = workspaceFrames(document, workspace);
  return workspace.views.map((view) => {
    const found = frames.find((entry) => entry.viewId === view.viewId && entry.frame.id === replaceFrameId)
      ?? frames.find((entry) => entry.viewId === view.viewId);
    return found ? { pageId: found.page.id, frameId: found.frame.id } : null;
  });
}

/**
 * Generate a C4 workspace: one page per view, matched by stable view id among
 * this workspace's frames, so a regenerate updates the same pages rather than
 * duplicating them and another model's pages are never touched.
 */
export function buildWorkspacePagesCommand(
  document: SceneDocumentV1,
  workspace: CompileWorkspaceResult,
  options: WorkspacePagesOptions,
): DocumentCommand | null {
  if (workspace.views.length === 0) return null;
  const frames = workspaceFrames(document, workspace);
  const boundId = options.replaceFrameId;
  const boundPage = boundId ? document.pages.find((page) => page.nodes.some((node) => node.id === boundId)) : undefined;
  const boundNode = boundPage?.nodes.find((node) => node.id === boundId);
  const boundViewId = boundPage && boundNode ? frameArch(boundNode)?.viewId ?? null : null;
  const live = new Set(workspace.views.map((view) => view.viewId));
  const used = new Set<string>();
  const changed = new Map<string, ScenePage>();
  const inserts: DocumentCommand[] = [];
  // The first view that needs a page takes the empty one the user is on.
  let blank = document.pages.find((page) => page.id === options.intoPageId && page.nodes.length === 0 && page.connectors.length === 0);
  const regenerate = (page: ScenePage, frameId: string, view: CompileWorkspaceResult['views'][number]) => {
    used.add(frameId);
    const before = changed.get(page.id) ?? page;
    const command = buildDslPageCommand(before, view.result, frameId);
    let after = command?.kind === 'set-page' ? command.after : before;
    // A page that holds other diagrams, or that the user renamed, keeps its own name.
    const oldLabel = before.nodes.find((node) => node.id === frameId)?.content.label;
    const unnamed = /^Page \d+$/.test(before.name) || before.name === oldLabel;
    if (unnamed && after.name !== view.name && modelFrameCount(after) <= 1) after = { ...after, name: view.name };
    if (after !== page) changed.set(page.id, after);
  };
  for (const view of workspace.views) {
    const existing = frames.find((entry) => entry.viewId === view.viewId && entry.frame.id !== boundId && !used.has(entry.frame.id));
    // The bound frame takes its own view; a bound frame of no live view takes the first view nothing else holds.
    const boundTakes = boundPage && !used.has(boundId!)
      && (view.viewId === boundViewId || (!existing && !(boundViewId && live.has(boundViewId))));
    if (boundTakes) regenerate(boundPage, boundId!, view);
    else if (existing) regenerate(existing.page, existing.frame.id, view);
    else if (blank) {
      const { name, diagramKind, nodes, connectors, metadata } = viewPage(blank.id, view.viewId, view.name, view.result);
      changed.set(blank.id, { ...blank, name, diagramKind, nodes, connectors, metadata: { ...blank.metadata, ...metadata } });
      blank = undefined;
    } else inserts.push(insertViewPageCommand(document.pages.length + inserts.length, view.viewId, view.name, view.result, options.mintId));
  }
  const commands: DocumentCommand[] = [
    ...document.pages.flatMap((page) => {
      const after = changed.get(page.id);
      return after ? [setPage(page, after, `generate-view:${page.id}`, 'Generate view')] : [];
    }),
    ...inserts,
  ];
  // A workspace is authoritative for its generated views, including a single remaining view.
  if (workspace.views.some((view) => view.viewId.startsWith('view:'))) {
    for (let index = document.pages.length - 1; index >= 0; index -= 1) {
      const page = document.pages[index]!;
      const entry = frames.find((candidate) => candidate.page === page);
      // ponytail: a page holding several diagrams keeps an obsolete one — drop just that frame if it bites
      if (!entry?.viewId || live.has(entry.viewId) || used.has(entry.frame.id) || modelFrameCount(page) !== 1) continue;
      const { viewId, frame } = entry;
      const generated = new Set(page.nodes.filter((node) => placedElementId(node) || node.id === frame.id).map((node) => node.id));
      const notes = page.nodes.filter((node) => !generated.has(node.id));
      if (notes.length === 0) {
        commands.push({kind: 'remove-page', id: `remove-view:${viewId}`, label: 'Remove obsolete view', index, page});
      } else {
        // Invisible ancestor groups keep notes at exactly their original world transform,
        // including nested rotation/scale, without retaining a stale model view.
        const byId = new Map(page.nodes.map((node) => [node.id, node]));
        const ancestors = new Set<string>();
        for (const note of notes) {
          for (let parent = note.parentId; parent; parent = byId.get(parent)?.parentId ?? null) ancestors.add(parent);
        }
        const nodes = page.nodes.filter((node) => !generated.has(node.id) || ancestors.has(node.id)).map((node) =>
          generated.has(node.id) ? {...node, kind: 'group' as const, content: {}, metadata: {}, appearance: {}} : node);
        const {view: _view, ...metadata} = page.metadata;
        const connectors = page.connectors.filter((connector) =>
          !connector.metadata.model && !generated.has(connector.source.nodeId ?? '') && !generated.has(connector.target.nodeId ?? ''));
        commands.push(setPage(page, { ...page, nodes, connectors, metadata }, `detach-view:${viewId}`, 'Keep view notes'));
      }
    }
  }
  if (commands.length === 0) return null;
  if (commands.length === 1) return commands[0]!;
  return batch('architecture-workspace-generate', `Generate ${workspace.views.length} views`, commands);
}

/**
 * Where the generated views land once `command` (from `buildWorkspacePagesCommand`) is applied:
 * the page to open and the frame to fit. `stayOnPageId`, the page Generate ran from, wins when it
 * holds one of these views; else the first view. A view is matched by its model's pages, so two
 * models' landscapes never cross.
 */
export function firstViewLanding(
  document: SceneDocumentV1,
  workspace: CompileWorkspaceResult,
  command: DocumentCommand | null,
  replaceFrameId?: string,
  stayOnPageId?: string,
): { readonly pageId: string; readonly frameId: string } | null {
  const first = workspace.views[0]!;
  const frames = workspaceViewFrames(document, workspace, replaceFrameId);
  const here = stayOnPageId ? frames.find((entry) => entry?.pageId === stayOnPageId) : undefined;
  if (here) return here;
  const held = frames[0];
  if (held) return held;
  const pages = (command?.kind === 'batch' ? command.commands : command ? [command] : [])
    .flatMap((entry) => entry.kind === 'insert-page' ? [entry.page] : entry.kind === 'set-page' ? [entry.after] : []);
  const page = pages.find((candidate) => archViewIdOfPage(candidate) === first.viewId);
  return page ? { pageId: page.id, frameId: first.result.frame.id } : null;
}

function viewPage(pageId: string, viewId: string, name: string, result: CompileWorkspaceResult['views'][number]['result']): ScenePage {
  return {
    id: pageId,
    name,
    diagramKind: result.meta.family,
    layers: [createDefaultSceneLayer()],
    nodes: [result.frame, ...result.groups, ...result.nodes],
    connectors: result.connectors,
    metadata: { view: { id: viewId } },
    extensions: {},
  };
}

function insertViewPageCommand(
  index: number,
  viewId: string,
  name: string,
  result: CompileWorkspaceResult['views'][number]['result'],
  mintId: (prefix: string) => string,
): DocumentCommand {
  const page = viewPage(mintId('page'), viewId, name, result);
  return {
    kind: 'insert-page',
    id: `insert-view-page:${viewId}`,
    label: `Add view ${name}`,
    index,
    page,
  };
}

/* --------------------------------------------------------------- elements */

function optional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function mergeElement(element: ArchElement, patch: ArchElementPatch): ArchElement | null {
  const name = patch.name?.trim() || element.name;
  if (!name.trim()) return null;
  const { tech: _tech, desc: _desc, color: _color, icon: _icon, ...rest } = element;
  const tech = optional(patch.tech ?? element.tech);
  const desc = optional(patch.desc ?? element.desc);
  const color = optional(patch.color ?? element.color);
  const icon = optional(patch.icon ?? element.icon);
  const tags = (patch.tags ?? element.tags).map((tag) => tag.trim().toLowerCase()).filter(Boolean);
  const links = (patch.links ?? element.links).map((link) => link.trim()).filter(Boolean);
  const merged: ArchElement = {
    ...rest, name, tags, links,
    ...(tech ? { tech } : {}),
    ...(desc ? { desc } : {}),
    ...(color ? { color } : {}),
    ...(icon ? { icon } : {}),
  };
  const unchanged = (['name', 'tech', 'desc', 'color', 'icon'] as const).every((key) => merged[key] === element[key])
    && JSON.stringify(merged.tags) === JSON.stringify(element.tags)
    && JSON.stringify(merged.links) === JSON.stringify(element.links);
  return unchanged ? null : merged;
}

/** Rename or edit one element; every page that places it follows, ids stay stable. */
export function buildArchElementEditCommand(
  document: SceneDocumentV1,
  elementId: string,
  patch: ArchElementPatch,
  resolveIcon?: IconResolver,
): DocumentCommand | null {
  const pages = modelPages(document, elementId);
  const source = pages[0];
  if (!source) return null;
  const element = source.model.elements.find((candidate) => candidate.id === elementId);
  if (!element) return null;
  const merged = mergeElement(element, patch);
  if (!merged) return null;
  const next: ArchModel = {
    ...source.model,
    elements: source.model.elements.map((candidate) => candidate.id === elementId ? merged : candidate),
  };
  const label = patch.name !== undefined && merged.name !== element.name ? 'Rename element' : 'Edit element';
  const commands = pages.map(({ page }) => setPage(page, pageWithModel(page, next, resolveIcon), `model-edit:${elementId}`, label));
  return commands.length === 1 ? commands[0]! : batch('model-edit', label, commands);
}

/** The kind a new element takes under `parentKind` (null = top level); null when that parent cannot hold children. */
export function defaultChildKind(parentKind: ElementKind | null): ElementKind | null {
  if (parentKind === null) return 'system';
  if (parentKind === 'system') return 'container';
  if (parentKind === 'container') return 'component';
  return null;
}

export interface ArchElementAdd {
  readonly parentId: string | null;
  readonly kind: ElementKind;
  readonly name: string;
}

/** The view a page draws, the implicit landscape included. */
function pageView(model: ArchModel, page: ScenePage): ArchView | null {
  const viewId = archViewIdOfPage(page);
  if (!viewId) return null;
  return model.views.find((view) => view.id === viewId)
    ?? (viewId === 'view:landscape' ? { id: viewId, kind: 'landscape', name: 'Landscape', rules: [] } : null);
}

const PLACE_GAP = 40;
const PLACE_PADDING = { top: 72, right: 28, bottom: 52, left: 28 };

/**
 * Draws one element on a view page without touching its layout: inside the element's nearest boundary on the page
 * (else the view frame), below what is already there, with connectors to the elements already drawn. Every node on
 * the page keeps its transform; only the boundaries it lands in grow to hold it. An element whose parent is drawn as
 * a plain card is left off (drawing it would turn that card into a boundary: a Generate does that).
 */
function placeElement(page: ScenePage, model: ArchModel, elementId: string, resolveIcon?: IconResolver): ScenePage {
  const frame = archFrameOf(page);
  const index = createArchIndex(model);
  const element = index.byId.get(elementId);
  const byElement = new Map(page.nodes.flatMap((node) => {
    const id = placedElementId(node);
    return id ? [[id, node] as const] : [];
  }));
  if (!frame || !element || byElement.has(elementId)) return page;
  let parent: SceneNode = frame;
  for (const ancestor of elementAncestors(index, elementId)) {
    const drawn = byElement.get(ancestor);
    if (!drawn) continue;
    if (drawn.kind !== 'frame') return page;
    parent = drawn;
    break;
  }
  const siblings = page.nodes.filter((node) => node.parentId === parent.id);
  const x = siblings.length ? Math.min(...siblings.map((node) => node.transform.translation.x)) : PLACE_PADDING.left;
  const y = siblings.length ? Math.max(...siblings.map((node) => node.transform.translation.y + node.size.height)) + PLACE_GAP : PLACE_PADDING.top;
  const swatch = paletteResolver(nodePaletteName(frame));
  const zIndex = Math.max(0, ...page.nodes.map((node) => node.zIndex)) + 1;
  const drawn = elementNode(element, parent.id, zIndex, { origin: { x, y }, swatch, ...(resolveIcon ? { resolveIcon } : {}) });
  // Grow each container up the chain just enough to hold what is inside it; positions never move.
  const sizes = new Map<string, SceneNode['size']>();
  const byId = new Map(page.nodes.map((node) => [node.id, node]));
  let child: Pick<SceneNode, 'transform' | 'size'> = drawn;
  for (let host: SceneNode | undefined = parent; host; host = host.parentId ? byId.get(host.parentId) : undefined) {
    const size = sizes.get(host.id) ?? host.size;
    const width = Math.max(size.width, child.transform.translation.x + child.size.width + PLACE_PADDING.right);
    const height = Math.max(size.height, child.transform.translation.y + child.size.height + PLACE_PADDING.bottom);
    if (width === size.width && height === size.height) break;
    sizes.set(host.id, { width, height });
    child = { transform: host.transform, size: { width, height } };
  }
  const nodeOf = (id: string) => (id === elementId ? drawn : byElement.get(id))?.id ?? id;
  const shown = new Set([...byElement.keys(), elementId]);
  const drawnConnectors = new Set(page.connectors.map((connector) => connector.id));
  const connectors = projectRelations(index, shown)
    .filter((projection) => projection.from === elementId || projection.to === elementId)
    .map((projection) => {
      const connector = relationConnector(projection.relation, projection.from, projection.to, projection.implied);
      return { ...connector, source: { ...connector.source, nodeId: nodeOf(projection.from) }, target: { ...connector.target, nodeId: nodeOf(projection.to) } };
    })
    .filter((connector) => !drawnConnectors.has(connector.id));
  return {
    ...page,
    nodes: [...page.nodes.map((node) => sizes.has(node.id) ? { ...node, size: sizes.get(node.id)! } : node), drawn],
    connectors: [...page.connectors, ...connectors],
  };
}

/**
 * Every page of the model takes `next`; `elementId` is drawn, in place, on each view that now selects it
 * and does not draw it yet. One batch: one undo step.
 */
function modelChangeCommand(
  pages: readonly ModelPage[], next: ArchModel, elementId: string, id: string, label: string, resolveIcon?: IconResolver,
): DocumentCommand {
  const index = createArchIndex(next);
  const commands = pages.map(({ page }) => {
    const view = pageView(next, page);
    const updated = pageWithModel(page, next);
    const shows = view !== null && selectViewElements(index, view).shown.has(elementId);
    return setPage(page, shows ? placeElement(updated, next, elementId, resolveIcon) : updated, id, label);
  });
  return commands.length === 1 ? commands[0]! : batch(id, label, commands);
}

/**
 * Add an element to the model of `pageId`; every page sharing that model follows, so Map and the code text show it,
 * and each view whose rules include it draws it without moving anything else. Returns the new id with the command.
 */
/** `slug` under `parentId`, suffixed -2, -3… until no element has it. */
function freeId(model: ArchModel, parentId: string | null | undefined, slug: string): string {
  const taken = new Set(model.elements.map((element) => element.id));
  const base = `${parentId ? `${parentId}.` : ''}${slug}`;
  let id = base;
  for (let n = 2; taken.has(id); n += 1) id = `${base}-${n}`;
  return id;
}

export function buildArchElementAddCommand(
  document: SceneDocumentV1, pageId: string, add: ArchElementAdd, resolveIcon?: IconResolver,
): { command: DocumentCommand; id: string } | null {
  const name = add.name.trim();
  const page = document.pages.find((candidate) => candidate.id === pageId);
  const model = page ? archModelOfPage(page) : null;
  if (!page || !model || !name) return null;
  // ponytail: pages share a model by element overlap, so an empty model is only this page's — match by a model id if empties ever span views.
  const pages = model.elements.length ? modelPages(document, model.elements[0]!.id) : [{ page, model, viewId: archViewIdOfPage(page) }];
  const parent = add.parentId ? model.elements.find((element) => element.id === add.parentId) : null;
  if (add.parentId && (!parent || defaultChildKind(parent.kind) === null)) return null;
  const id = freeId(model, parent?.id, slugifyDslId(name));
  const element: ArchElement = { id, kind: add.kind, name, parent: parent?.id ?? null, tags: [], links: [] };
  const next: ArchModel = { ...model, elements: [...model.elements, element] };
  return { command: modelChangeCommand(pages, next, id, `model-add:${id}`, 'Add element', resolveIcon), id };
}

/** Includes an element in the view `pageId` draws (a view with no rules keeps its implicit `include *`), drawn in place. */
export function buildArchAddToViewCommand(document: SceneDocumentV1, pageId: string, elementId: string, resolveIcon?: IconResolver): DocumentCommand | null {
  const page = document.pages.find((candidate) => candidate.id === pageId);
  const model = page ? archModelOfPage(page) : null;
  const view = model && page ? model.views.find((candidate) => candidate.id === archViewIdOfPage(page)) : undefined;
  if (!model || !view || !model.elements.some((element) => element.id === elementId)) return null;
  const rules = [...(view.rules.length ? view.rules : [{ op: 'include', subject: '*' } as const]), { op: 'include', subject: elementId } as const];
  const next: ArchModel = { ...model, views: model.views.map((candidate) => candidate === view ? { ...view, rules } : candidate) };
  return modelChangeCommand(modelPages(document, elementId), next, elementId, `model-view-add:${elementId}`, 'Add to view', resolveIcon);
}

/**
 * A rename of an element still on the id "Add" gave it (`new-container`, `new-system-2`) moves the id to the new
 * name's slug while no relation, child, view scope or flow uses it; view rules that name it follow. Once referenced,
 * ids stay stable. Every page keeps its layout: the drawn node takes the new id in place. Null keeps the id.
 */
export function buildArchRenameReslugCommand(
  document: SceneDocumentV1, elementId: string, patch: ArchElementPatch, resolveIcon?: IconResolver,
): { command: DocumentCommand; id: string } | null {
  const pages = modelPages(document, elementId);
  const model = pages[0]?.model;
  const element = model?.elements.find((candidate) => candidate.id === elementId);
  const merged = element && patch.name !== undefined ? mergeElement(element, patch) : null;
  if (!model || !element || !merged || merged.name === element.name) return null;
  const local = element.parent ? element.id.slice(element.parent.length + 1) : element.id;
  if (!new RegExp(`^new-${element.kind}(?:-\\d+)?$`).test(local)) return null;
  const referenced = model.elements.some((other) => other.parent === elementId || other.instanceOf === elementId)
    || model.relations.some((relation) => relation.from === elementId || relation.to === elementId)
    || model.views.some((view) => view.of === elementId)
    || model.flows.some((flow) => flattenFlowSteps(flow).some(({ step }) => step.from === elementId || step.to === elementId));
  const slug = slugifyDslId(merged.name);
  if (referenced || !slug || slug === local) return null;
  const id = freeId(model, element.parent, slug);
  const follow = (value: string | undefined) => value === elementId ? id : value;
  const next: ArchModel = {
    ...model,
    elements: model.elements.map((candidate) => candidate.id === elementId ? { ...merged, id } : candidate),
    views: model.views.map((view) => ({ ...view, rules: view.rules.map((rule) => ({
      ...rule, subject: follow(rule.subject)!,
      ...(rule.arrow ? { arrow: { ...(rule.arrow.from ? { from: follow(rule.arrow.from)! } : {}), ...(rule.arrow.to ? { to: follow(rule.arrow.to)! } : {}) } } : {}),
    })) })),
  };
  const relabel = (node: SceneNode): SceneNode => {
    if (placedElementId(node) !== elementId) return node;
    const dsl = isRecord(node.metadata.dsl) && node.metadata.dsl.id === elementId ? { ...node.metadata.dsl, id } : node.metadata.dsl;
    return {
      ...node, id: node.id === elementId ? id : node.id,
      metadata: { ...node.metadata, model: { ...(isRecord(node.metadata.model) ? node.metadata.model : {}), elementId: id }, ...(dsl ? { dsl } : {}) },
    };
  };
  const commands = pages.map(({ page }) => {
    const nodeIds = new Map(page.nodes.flatMap((node) => placedElementId(node) === elementId ? [[node.id, relabel(node).id] as const] : []));
    const end = <T extends { nodeId: string | null }>(point: T): T => point.nodeId && nodeIds.has(point.nodeId) ? { ...point, nodeId: nodeIds.get(point.nodeId)! } : point;
    const moved: ScenePage = {
      ...page,
      nodes: page.nodes.map(relabel),
      connectors: page.connectors.map((connector) => ({ ...connector, source: end(connector.source), target: end(connector.target) })),
    };
    return setPage(page, pageWithModel(moved, next, resolveIcon), `model-edit:${elementId}`, 'Rename element');
  });
  return { command: commands.length === 1 ? commands[0]! : batch('model-edit', 'Rename element', commands), id };
}

/** `icon: none` on several elements at once; every view that places them follows. */
export function buildArchRemoveIconsCommand(document: SceneDocumentV1, elementIds: readonly string[]): DocumentCommand | null {
  const pages = modelPages(document, elementIds[0] ?? '');
  const source = pages[0];
  const ids = new Set(elementIds);
  if (!source || !source.model.elements.some((element) => ids.has(element.id))) return null;
  const next: ArchModel = {
    ...source.model,
    elements: source.model.elements.map((element) => ids.has(element.id) ? { ...element, icon: 'none' } : element),
  };
  const commands = pages.map(({ page }) => setPage(page, pageWithModel(page, next), 'model-remove-icons', 'Remove icon'));
  return commands.length === 1 ? commands[0]! : batch('model-remove-icons', 'Remove icon', commands);
}

/** Picks `icon` (`aws/compute-lambda`) for these elements, on every view of their model, as one undo step. */
export function buildArchSetIconCommand(document: SceneDocumentV1, elementIds: readonly string[], icon: string, resolveIcon: IconResolver): DocumentCommand | null {
  const pages = modelPages(document, elementIds[0] ?? '');
  const source = pages[0];
  const ids = new Set(elementIds);
  if (!source || !source.model.elements.some((element) => ids.has(element.id))) return null;
  const next: ArchModel = {
    ...source.model,
    elements: source.model.elements.map((element) => ids.has(element.id) ? { ...element, icon } : element),
  };
  const commands = pages.map(({ page }) => setPage(page, pageWithModel(page, next, resolveIcon), 'model-set-icon', 'Change icon'));
  return commands.length === 1 ? commands[0]! : batch('model-set-icon', 'Change icon', commands);
}

/**
 * `icons: off` for a whole workspace: the model records it (so regenerated
 * text keeps it) and every inferred icon on every view comes off in place.
 */
export function buildArchIconsOffCommand(document: SceneDocumentV1, elementId: string): DocumentCommand | null {
  const pages = modelPages(document, elementId);
  const source = pages[0];
  if (!source || source.model.icons === 'off') return null;
  const next: ArchModel = { ...source.model, icons: 'off' };
  const commands = pages.map(({ page }) => setPage(page, pageWithModel(page, next), 'model-icons-off', 'Turn off icons from labels'));
  return commands.length === 1 ? commands[0]! : batch('model-icons-off', 'Turn off icons from labels', commands);
}

/**
 * Remove an element (and its children) from the model and from every view.
 * Views *of* a removed element go too, page included; the document always
 * keeps at least one page.
 */
export function buildArchElementRemoveCommand(
  document: SceneDocumentV1,
  elementId: string,
): DocumentCommand | null {
  const pages = modelPages(document, elementId);
  const source = pages[0];
  if (!source) return null;
  const index = createArchIndex(source.model);
  if (!index.byId.has(elementId)) return null;
  const removed = new Set([elementId, ...elementDescendantIds(index, elementId)]);
  const orphanViews = new Set(source.model.views.filter((view) => view.of && removed.has(view.of)).map((view) => view.id));
  const next: ArchModel = {
    ...source.model,
    elements: source.model.elements.filter((element) => !removed.has(element.id)),
    relations: source.model.relations.filter((relation) => !removed.has(relation.from) && !removed.has(relation.to)),
    views: source.model.views.filter((view) => !orphanViews.has(view.id)),
    flows: source.model.flows.map((flow) => ({ ...flow, steps: stripSteps(flow.steps, removed) })),
  };
  const commands: DocumentCommand[] = [];
  const removals: DocumentCommand[] = [];
  // The model lives on view frames, so one model page always survives.
  // ponytail: follows from model-per-frame storage — goes away once the model
  // has a document-level slot.
  let remaining = pages.length;
  for (const { page, viewId } of pages) {
    if (viewId && orphanViews.has(viewId) && remaining > 1) {
      remaining -= 1;
      removals.push({ kind: 'remove-page', id: `model-remove-view:${viewId}`, label: 'Remove view', index: document.pages.indexOf(page), page });
      continue;
    }
    const placed = page.nodes.filter((node) => {
      const id = placedElementId(node);
      return id !== null && removed.has(id);
    });
    const without = placed.length > 0 ? applyDeletion(page, placed.map((node) => node.id)) : page;
    commands.push(setPage(page, pageWithModel(without, next), `model-remove:${elementId}`, 'Remove element from model'));
  }
  // Highest index first so earlier removals do not shift later ones.
  removals.sort((a, b) => (b.kind === 'remove-page' ? b.index : 0) - (a.kind === 'remove-page' ? a.index : 0));
  commands.push(...removals);
  return commands.length === 0 ? null : batch('model-remove', 'Remove element from model', commands);
}

/** Applies a delete-selection command to an in-memory page, without history. */
function applyDeletion(page: ScenePage, nodeIds: readonly string[]): ScenePage {
  const deletion = buildDeleteSelectionCommand(page, nodeIds, []);
  const nodes = new Set(deletion.commands.flatMap((command) => command.kind === 'remove-node' ? [command.node.id] : []));
  const connectors = new Set(deletion.commands.flatMap((command) => command.kind === 'remove-connector' ? [command.connector.id] : []));
  return {
    ...page,
    nodes: page.nodes.filter((node) => !nodes.has(node.id)),
    connectors: page.connectors.filter((connector) => !connectors.has(connector.id)),
  };
}

function stripSteps(steps: readonly FlowStep[], removed: ReadonlySet<string>): readonly FlowStep[] {
  return steps.flatMap((step) => {
    if (step.from && removed.has(step.from)) return [];
    if (step.to && removed.has(step.to)) return [];
    return [{
      ...step,
      ...(step.branches ? { branches: step.branches.map((branch) => ({ ...branch, steps: stripSteps(branch.steps, removed) })) } : {}),
    }];
  });
}

/** Remove placements from one view only; the element stays in the model. */
export function buildArchUnplaceCommand(page: ScenePage, nodeIds: readonly string[]): DocumentCommand | null {
  const placed = nodeIds.filter((nodeId) => {
    const node = page.nodes.find((candidate) => candidate.id === nodeId);
    return Boolean(node && isModelPlacement(node));
  });
  if (placed.length === 0) return null;
  return buildDeleteSelectionCommand(page, placed, []);
}

/* -------------------------------------------------------------- relations */

/**
 * Add or relabel a model relation on every view. Every page that places both
 * ends gets the connector (or its new label), except `exceptPageId`: the page
 * where the user is drawing it, whose connector the caller inserts itself.
 * Returns the flat page commands so a caller can merge them into one batch.
 */
export function buildArchRelationCommands(
  document: SceneDocumentV1,
  from: string,
  to: string,
  label: string | undefined,
  options: { readonly exceptPageId?: string; readonly relationId?: string; readonly create?: boolean } = {},
): { commands: DocumentCommand[]; relation: ArchRelation } | null {
  const pages = modelPages(document, from);
  const source = pages[0];
  if (!source) return null;
  const index = createArchIndex(source.model);
  if (!index.byId.has(from) || !index.byId.has(to) || from === to) return null;
  const existing = options.create ? undefined : source.model.relations.find((relation) => options.relationId ? relation.id === options.relationId : relation.from === from && relation.to === to);
  if (options.relationId && !existing) return null;
  const nextLabel = label === undefined ? existing?.label : optional(label);
  if (existing && nextLabel === existing.label) return null;
  const baseId = `rel:${from}->${to}`;
  let newId = baseId;
  for (let occurrence = 2; source.model.relations.some((relation) => relation.id === newId); occurrence += 1) newId = `${baseId}:${occurrence}`;
  const relation: ArchRelation = {
    id: existing?.id ?? newId,
    from, to, tags: existing?.tags ?? [],
    ...(nextLabel ? { label: nextLabel } : {}),
    ...(existing?.tech ? { tech: existing.tech } : {}),
    ...(existing?.attrs ? { attrs: existing.attrs } : {}),
    ...(existing?.line !== undefined ? { line: existing.line } : {}),
  };
  const next: ArchModel = {
    ...source.model,
    relations: existing
      ? source.model.relations.map((candidate) => candidate === existing ? relation : candidate)
      : [...source.model.relations, relation],
  };
  const withConnector = (page: ScenePage): ScenePage => {
    const template = relationConnector(relation, from, to, false);
    const drawn = page.connectors.some((connector) => isRecord(connector.metadata.model) && connector.metadata.model.relationId === relation.id);
    if (drawn) {
      return { ...page, connectors: page.connectors.map((connector) =>
        isRecord(connector.metadata.model) && connector.metadata.model.relationId === relation.id ? { ...connector, labels: template.labels } : connector) };
    }
    if (page.id === options.exceptPageId) return page;
    const placements = new Map(page.nodes.flatMap((node) => {
      const element = placedElementId(node);
      return element ? [[element, node.id] as const] : [];
    }));
    // A projected relationship never adds a second line where the pair is already drawn.
    const joined = (from: string, to: string) => page.connectors.some((connector) =>
      connector.source.nodeId === placements.get(from) && connector.target.nodeId === placements.get(to));
    const projected = projectRelations(createArchIndex(next), new Set(placements.keys())).filter((projection) =>
      projection.relation.id === relation.id && !(projection.implied && joined(projection.from, projection.to)));
    const connectors = projected.map((projection) => {
      const connector = relationConnector(relation, projection.from, projection.to, projection.implied);
      return {...connector, source: {...connector.source, nodeId: placements.get(projection.from)!}, target: {...connector.target, nodeId: placements.get(projection.to)!}};
    });
    return connectors.length ? {...page, connectors: [...page.connectors, ...connectors]} : page;
  };
  return {
    relation,
    commands: pages.map(({ page }) => setPage(page, withConnector(pageWithModel(page, next)), `model-relation:${relation.id}`, 'Add relation')),
  };
}

/** Adds an authored message sequence to every model copy in one undo step. */
export function buildArchFlowCreateCommand(document: SceneDocumentV1, flow: ArchFlow): DocumentCommand | null {
  const pages = modelPages(document, flow.steps[0]?.from ?? '');
  const source = pages[0];
  if (!source || !flow.name.trim() || !flow.id || !flow.steps.length || source.model.flows.some((existing) => existing.id === flow.id)) return null;
  const elements = new Set(source.model.elements.map((element) => element.id));
  if (flow.steps.some((step) => step.kind !== 'message' || !step.from || !step.to || step.from === step.to || !elements.has(step.from) || !elements.has(step.to) || !step.label?.trim())) return null;
  const model = {...source.model, flows: [...source.model.flows, flow]};
  return batch('create-model-flow', 'Create flow', pages.map(({page}) => setPage(page, pageWithModel(page, model), `create-flow:${flow.id}`, 'Create flow')));
}
