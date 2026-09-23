import type { CompileWorkspaceResult } from '../../../dsl/compile';
import { relationConnector } from '../../../dsl/families/architecture/scene';
import {
  archFrameOf, archModelOfPage, archViewIdOfPage, createArchIndex, elementDescendantIds, placedElementId,
} from '../../../dsl/model/model';
import type { ArchElement, ArchModel, ArchRelation, FlowStep } from '../../../dsl/model/types';
import { createDefaultSceneLayer } from '../../domain/document/defaults';
import type { BatchDocumentCommand, DocumentCommand } from '../../domain/commands/types';
import type { JsonObject } from '../../domain/document/json';
import type { SceneDocumentV1, SceneNode, ScenePage } from '../../domain/document/types';
import { buildDeleteSelectionCommand } from '../../domain/commands/sceneEdits';
import { buildDslPageCommand } from './dslPageCommand';
import { hasAutoIcon, hasIcon, refreshAutoIcon, withoutElementIcon, type IconResolver } from './iconCommands';

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

/** Every page that carries a model view, with the model copy off its frame. */
export function modelPages(document: SceneDocumentV1): readonly ModelPage[] {
  return document.pages.flatMap((page) => {
    const model = archModelOfPage(page);
    return model ? [{ page, model, viewId: archViewIdOfPage(page) }] : [];
  });
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
    const stripped = iconGone ? withoutElementIcon(withModelCopy, element) : withModelCopy;
    // A rename or a new `tech:` moves an inferred icon with it (needs the host's resolver).
    const drawn = resolveIcon
      ? refreshAutoIcon(stripped, element.name, element.tech, resolveIcon, (plain) => withoutElementIcon(plain, element))
      : stripped;
    const content: Record<string, unknown> = { ...drawn.content, label: element.name };
    if (element.tech) content.subLabel = element.tech;
    else delete content.subLabel;
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
  readonly mintId: (prefix: string) => string;
}

/**
 * Generate a C4 workspace: one page per view, matched by stable view id so a
 * regenerate updates the same pages rather than duplicating them.
 */
export function buildWorkspacePagesCommand(
  document: SceneDocumentV1,
  workspace: CompileWorkspaceResult,
  options: WorkspacePagesOptions,
): DocumentCommand | null {
  if (workspace.views.length === 0) return null;
  const commands: DocumentCommand[] = [];
  let nextIndex = document.pages.length;
  let replacedBound = false;
  for (const view of workspace.views) {
    const existing = document.pages.find((page) => archViewIdOfPage(page) === view.viewId);
    if (existing) {
      const regenerated = buildDslPageCommand(existing, view.result, archFrameOf(existing)?.id);
      if (regenerated) commands.push(regenerated);
      continue;
    }
    if (!replacedBound && options.replaceFrameId) {
      const boundPage = document.pages.find((candidate) => candidate.nodes.some((node) => node.id === options.replaceFrameId));
      if (boundPage && !archFrameOf(boundPage)) {
        const replaced = buildDslPageCommand(boundPage, view.result, options.replaceFrameId);
        if (replaced) {
          commands.push(replaced.kind === 'set-page'
            ? { ...replaced, after: { ...replaced.after, name: view.name } }
            : replaced);
        }
        replacedBound = true;
        continue;
      }
    }
    commands.push(insertViewPageCommand(nextIndex, view.viewId, view.name, view.result, options.mintId));
    nextIndex += 1;
  }
  if (commands.length === 0) return null;
  if (commands.length === 1) return commands[0]!;
  return batch('architecture-workspace-generate', `Generate ${workspace.views.length} views`, commands);
}

function insertViewPageCommand(
  index: number,
  viewId: string,
  name: string,
  result: CompileWorkspaceResult['views'][number]['result'],
  mintId: (prefix: string) => string,
): DocumentCommand {
  const pageId = mintId('page');
  const page: ScenePage = {
    id: pageId,
    name,
    diagramKind: result.meta.family,
    layers: [createDefaultSceneLayer()],
    nodes: [result.frame, ...result.groups, ...result.nodes],
    connectors: result.connectors,
    metadata: { view: { id: viewId } },
    extensions: {},
  };
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
  const pages = modelPages(document);
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

/** `icon: none` on several elements at once; every view that places them follows. */
export function buildArchRemoveIconsCommand(document: SceneDocumentV1, elementIds: readonly string[]): DocumentCommand | null {
  const pages = modelPages(document);
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

/**
 * `icons: off` for a whole workspace: the model records it (so regenerated
 * text keeps it) and every inferred icon on every view comes off in place.
 */
export function buildArchIconsOffCommand(document: SceneDocumentV1): DocumentCommand | null {
  const pages = modelPages(document);
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
  const pages = modelPages(document);
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
  options: { readonly exceptPageId?: string } = {},
): { commands: DocumentCommand[]; relation: ArchRelation } | null {
  const pages = modelPages(document);
  const source = pages[0];
  if (!source) return null;
  const index = createArchIndex(source.model);
  if (!index.byId.has(from) || !index.byId.has(to) || from === to) return null;
  const existing = source.model.relations.find((relation) => relation.from === from && relation.to === to);
  const nextLabel = optional(label) ?? existing?.label;
  if (existing && nextLabel === existing.label) return null;
  const relation: ArchRelation = {
    id: `rel:${from}->${to}`,
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
    const placed = new Set(page.nodes.flatMap((node) => placedElementId(node) ?? []));
    return placed.has(from) && placed.has(to) ? { ...page, connectors: [...page.connectors, template] } : page;
  };
  return {
    relation,
    commands: pages.map(({ page }) => setPage(page, withConnector(pageWithModel(page, next)), `model-relation:${relation.id}`, 'Add relation')),
  };
}
