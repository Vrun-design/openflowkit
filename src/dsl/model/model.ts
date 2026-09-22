import type { SceneDocumentV1, SceneNode, ScenePage } from '../../opencanvas/domain/document/types';
import { slugifyDslId } from '../text';
import {
  ELEMENT_KINDS, ELEMENT_KINDS_WITH_CHILDREN, FLOW_STEP_KINDS, VIEW_KINDS,
  type ArchElement, type ArchFlow, type ArchModel, type ArchRelation, type ArchView,
  type ElementKind, type FlowStep, type FlowStepKind, type ViewKind,
} from './types';

/**
 * Queries over an `ArchModel`: paths, ancestry, name resolution and the
 * Structurizr implied-relationship strategy. Pure; the model itself never
 * mutates — builders produce a new one.
 */

export interface ArchIndex {
  readonly model: ArchModel;
  readonly byId: ReadonlyMap<string, ArchElement>;
  readonly childIds: ReadonlyMap<string, readonly string[]>;
  /** Explicit + implied, in that order. */
  readonly relations: readonly ArchRelation[];
  readonly explicitPairs: ReadonlySet<string>;
  readonly byNamePath: ReadonlyMap<string, ArchElement>;
}

/** Element id a placed node carries (`metadata.model.elementId`), or null. */
export function placedElementId(node: Pick<SceneNode, 'metadata'>): string | null {
  const model = node.metadata.model;
  if (!model || typeof model !== 'object' || Array.isArray(model)) return null;
  const elementId = (model as Record<string, unknown>).elementId;
  return typeof elementId === 'string' ? elementId : null;
}

export function relationPairKey(from: string, to: string): string {
  return `${from}->${to}`;
}

function namePathOf(index: { byId: ReadonlyMap<string, ArchElement> }, id: string): string {
  const names: string[] = [];
  let current: ArchElement | undefined = index.byId.get(id);
  while (current) {
    names.unshift(current.name);
    current = current.parent ? index.byId.get(current.parent) : undefined;
  }
  return names.join('.');
}

export function createArchIndex(model: ArchModel): ArchIndex {
  const byId = new Map(model.elements.map((element) => [element.id, element]));
  const childIds = new Map<string, string[]>();
  for (const element of model.elements) {
    if (!element.parent) continue;
    childIds.set(element.parent, [...(childIds.get(element.parent) ?? []), element.id]);
  }
  const explicitPairs = new Set(model.relations.map((relation) => relationPairKey(relation.from, relation.to)));
  const index: ArchIndex = {
    model, byId, childIds, explicitPairs,
    relations: [...model.relations],
    byNamePath: new Map(),
  };
  const byNamePath = new Map<string, ArchElement>();
  for (const element of model.elements) {
    byNamePath.set(namePathOf(index, element.id).toLowerCase(), element);
    byNamePath.set(namePathOf(index, element.id).toLowerCase().split('.').map(slugifyDslId).join('.'), element);
  }
  return { ...index, byNamePath, relations: [...model.relations, ...deriveImpliedRelations({ ...index, byNamePath, relations: model.relations })] };
}

/**
 * Structurizr's `CreateImpliedRelationshipsUnlessAnyRelationshipExistsStrategy`:
 * `a.x -> b.y` implies `a -> b` (every ancestor pair) unless an explicit
 * relation already exists there. Derived, never serialized.
 */
export function deriveImpliedRelations(index: ArchIndex): ArchRelation[] {
  const seen = new Set(index.explicitPairs);
  const implied: ArchRelation[] = [];
  for (const relation of index.model.relations) {
    const fromAncestors = elementAncestors(index, relation.from);
    const toAncestors = elementAncestors(index, relation.to);
    for (const from of fromAncestors) {
      for (const to of toAncestors) {
        if (from === to) continue;
        const key = relationPairKey(from, to);
        if (seen.has(key)) continue;
        seen.add(key);
        implied.push({
          id: `implied:${from}->${to}`,
          from, to,
          ...(relation.label ? { label: relation.label } : {}),
          ...(relation.tech ? { tech: relation.tech } : {}),
          tags: relation.tags,
          ...(relation.line !== undefined ? { line: relation.line } : {}),
          implied: true,
        });
      }
    }
  }
  return implied;
}

export function elementChildren(index: ArchIndex, id: string): readonly ArchElement[] {
  return (index.childIds.get(id) ?? []).flatMap((childId) => {
    const child = index.byId.get(childId);
    return child ? [child] : [];
  });
}

export function elementDescendantIds(index: ArchIndex, id: string): readonly string[] {
  const out: string[] = [];
  const stack = [...(index.childIds.get(id) ?? [])];
  while (stack.length > 0) {
    const next = stack.pop()!;
    out.push(next);
    stack.push(...(index.childIds.get(next) ?? []));
  }
  return out;
}

/** Parent first, root last. */
export function elementAncestors(index: ArchIndex, id: string): readonly string[] {
  const out: string[] = [];
  let current = index.byId.get(id)?.parent ?? null;
  while (current) {
    out.push(current);
    current = index.byId.get(current)?.parent ?? null;
  }
  return out;
}

export function hasChildren(index: ArchIndex, element: ArchElement): boolean {
  return ELEMENT_KINDS_WITH_CHILDREN.includes(element.kind) && (index.childIds.get(element.id)?.length ?? 0) > 0;
}

/**
 * Resolves a reference the way the DSL writes them (§9.2): exact id, then
 * relative to the enclosing scope walking up, then a slug path, then a
 * display-name path. Case-insensitive on slugs; never throws.
 */
export function resolveElementRef(index: ArchIndex, reference: string, scopeId: string | null = null): ArchElement | null {
  const wanted = reference.trim();
  if (!wanted) return null;
  const lower = wanted.toLowerCase();
  const direct = index.byId.get(lower);
  if (direct) return direct;
  if (scopeId) {
    for (let scope: string | null = scopeId; scope; scope = index.byId.get(scope)?.parent ?? null) {
      const relative = index.byId.get(`${scope}.${lower}`);
      if (relative) return relative;
      const byName = index.byNamePath.get(`${namePathOf(index, scope).toLowerCase()}.${lower}`);
      if (byName) return byName;
    }
  }
  const slugPath = wanted.split('.').map((segment) => slugifyDslId(segment)).join('.');
  const byPath = index.byId.get(slugPath) ?? index.byNamePath.get(lower) ?? index.byNamePath.get(slugPath);
  if (byPath) return byPath;
  // Last resort: a bare display name that is unique in the model. Ambiguous
  // names stay unresolved rather than guessing.
  const byName = index.model.elements.filter((element) => element.name.toLowerCase() === lower);
  return byName.length === 1 ? byName[0]! : null;
}

/** Display reference for text output: `Shop.API` when ids are the slug chain, else the id. */
export function elementPathRef(index: ArchIndex, id: string): string {
  const names = namePathOf(index, id);
  const slugs = names.split('.').map((segment) => slugifyDslId(segment)).join('.');
  return slugs === id ? names : id;
}

/**
 * The nearest shown ancestor of an element, or the element itself. Used to
 * project a relation onto a view that hides some of its endpoints.
 */
export function nearestShown(index: ArchIndex, id: string, shown: ReadonlySet<string>): string | null {
  if (shown.has(id)) return id;
  for (const ancestor of elementAncestors(index, id)) if (shown.has(ancestor)) return ancestor;
  return null;
}

/** Every view that depicts an element directly (`view.container of Shop`). */
export function viewsOf(index: ArchIndex, elementId: string): readonly ArchView[] {
  return index.model.views.filter((view) => view.of === elementId);
}

/** The canonical child view of an element: a container view of a system, component view of a container. */
export function childViewOf(index: ArchIndex, elementId: string): ArchView | undefined {
  const element = index.byId.get(elementId);
  if (!element) return undefined;
  const desired: ViewKind | null = element.kind === 'system' ? 'container'
    : element.kind === 'container' ? 'component'
      : null;
  const candidates = viewsOf(index, elementId);
  if (desired) {
    const exact = candidates.find((view) => view.kind === desired);
    if (exact) return exact;
  }
  return candidates.find((view) => view.kind === 'custom') ?? candidates.find((view) => view.kind !== 'landscape');
}

export function emptyArchModel(): ArchModel {
  return { elements: [], relations: [], views: [], flows: [] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function canonicalAttrs(value: unknown): { key?: string; value: string }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.value !== 'string') return [];
    return [{ ...(typeof entry.key === 'string' ? { key: entry.key } : {}), value: entry.value }];
  });
}

function elementFromJson(value: unknown): ArchElement | null {
  if (!isRecord(value)) return null;
  const { id, kind, name } = value;
  if (typeof id !== 'string' || typeof kind !== 'string' || typeof name !== 'string') return null;
  if (!ELEMENT_KINDS.includes(kind as ElementKind)) return null;
  return {
    id, kind: kind as ElementKind, name,
    parent: typeof value.parent === 'string' ? value.parent : null,
    tags: strings(value.tags), links: strings(value.links),
    ...(canonicalAttrs(value.attrs).length ? { attrs: canonicalAttrs(value.attrs) } : {}),
    ...(typeof value.tech === 'string' ? { tech: value.tech } : {}),
    ...(typeof value.desc === 'string' ? { desc: value.desc } : {}),
    ...(typeof value.icon === 'string' ? { icon: value.icon } : {}),
    ...(typeof value.color === 'string' ? { color: value.color } : {}),
    ...(typeof value.env === 'string' ? { env: value.env } : {}),
    ...(typeof value.instanceOf === 'string' ? { instanceOf: value.instanceOf } : {}),
    ...(typeof value.line === 'number' ? { line: value.line } : {}),
  };
}

function relationFromJson(value: unknown): ArchRelation | null {
  if (!isRecord(value)) return null;
  const { id, from, to } = value;
  if (typeof id !== 'string' || typeof from !== 'string' || typeof to !== 'string') return null;
  return {
    id, from, to, tags: strings(value.tags),
    ...(canonicalAttrs(value.attrs).length ? { attrs: canonicalAttrs(value.attrs) } : {}),
    ...(typeof value.label === 'string' ? { label: value.label } : {}),
    ...(typeof value.tech === 'string' ? { tech: value.tech } : {}),
    ...(typeof value.line === 'number' ? { line: value.line } : {}),
    ...(value.implied === true ? { implied: true } : {}),
  };
}

function stepFromJson(value: unknown): FlowStep | null {
  if (!isRecord(value)) return null;
  const { id, kind } = value;
  if (typeof id !== 'string' || typeof kind !== 'string' || !FLOW_STEP_KINDS.includes(kind as FlowStepKind)) return null;
  const branches = Array.isArray(value.branches)
    ? value.branches.flatMap((branch) => {
      if (!isRecord(branch)) return [];
      return [{
        ...(typeof branch.label === 'string' ? { label: branch.label } : {}),
        steps: Array.isArray(branch.steps) ? branch.steps.flatMap((step) => stepFromJson(step) ?? []) : [],
      }];
    })
    : undefined;
  return {
    id, kind: kind as FlowStepKind, tags: strings(value.tags),
    ...(typeof value.from === 'string' ? { from: value.from } : {}),
    ...(typeof value.to === 'string' ? { to: value.to } : {}),
    ...(typeof value.label === 'string' ? { label: value.label } : {}),
    ...(typeof value.tech === 'string' ? { tech: value.tech } : {}),
    ...(typeof value.goto === 'string' ? { goto: value.goto } : {}),
    ...(branches ? { branches } : {}),
    ...(typeof value.line === 'number' ? { line: value.line } : {}),
  };
}

function viewFromJson(value: unknown): ArchView | null {
  if (!isRecord(value)) return null;
  const { id, kind, name } = value;
  if (typeof id !== 'string' || typeof kind !== 'string' || typeof name !== 'string') return null;
  if (!VIEW_KINDS.includes(kind as ViewKind)) return null;
  const rules = Array.isArray(value.rules)
    ? value.rules.flatMap((rule) => {
      if (!isRecord(rule) || (rule.op !== 'include' && rule.op !== 'exclude') || typeof rule.subject !== 'string') return [];
      const arrow = isRecord(rule.arrow)
        ? { ...(typeof rule.arrow.from === 'string' ? { from: rule.arrow.from } : {}), ...(typeof rule.arrow.to === 'string' ? { to: rule.arrow.to } : {}) }
        : undefined;
      const where = isRecord(rule.where)
        ? { ...(typeof rule.where.kind === 'string' ? { kind: rule.where.kind } : {}), ...(typeof rule.where.tag === 'string' ? { tag: rule.where.tag } : {}), ...(typeof rule.where.tagNot === 'string' ? { tagNot: rule.where.tagNot } : {}) }
        : undefined;
      return [{
        op: rule.op === 'exclude' ? 'exclude' as const : 'include' as const,
        subject: rule.subject,
        ...(arrow && (arrow.from || arrow.to) ? { arrow } : {}),
        ...(where && (where.kind || where.tag || where.tagNot) ? { where } : {}),
        ...(typeof rule.raw === 'string' ? { raw: rule.raw } : {}),
        ...(typeof rule.line === 'number' ? { line: rule.line } : {}),
      }];
    })
    : [];
  return {
    id, kind: kind as ViewKind, name, rules,
    ...(typeof value.of === 'string' ? { of: value.of } : {}),
    ...(typeof value.env === 'string' ? { env: value.env } : {}),
    ...(typeof value.direction === 'string' ? { direction: value.direction as ArchView['direction'] } : {}),
    ...(typeof value.line === 'number' ? { line: value.line } : {}),
  };
}

/** Reads a model out of JSON metadata; anything malformed is dropped, never thrown. */
export function archModelFromJson(value: unknown): ArchModel | null {
  if (!isRecord(value)) return null;
  if (!Array.isArray(value.elements) || !Array.isArray(value.relations) || !Array.isArray(value.views)) return null;
  return {
    ...(typeof value.name === 'string' ? { name: value.name } : {}),
    elements: value.elements.flatMap((element) => elementFromJson(element) ?? []),
    relations: value.relations.flatMap((relation) => relationFromJson(relation) ?? []),
    views: value.views.flatMap((view) => viewFromJson(view) ?? []),
    flows: Array.isArray(value.flows)
      ? value.flows.flatMap((flow) => {
        if (!isRecord(flow) || typeof flow.id !== 'string' || typeof flow.name !== 'string') return [];
        return [{
          id: flow.id, name: flow.name,
          steps: Array.isArray(flow.steps) ? flow.steps.flatMap((step) => stepFromJson(step) ?? []) : [],
          ...(typeof flow.line === 'number' ? { line: flow.line } : {}),
        }];
      })
      : [],
  };
}

/** The frame that carries the workspace model, if the page is a model view. */
export function archFrameOf(page: ScenePage): SceneNode | null {
  return page.nodes.find((node) => {
    const dsl = node.metadata.dsl;
    return isRecord(dsl) && isRecord(dsl.arch);
  }) ?? null;
}

export function archModelOfPage(page: ScenePage): ArchModel | null {
  const arch = archFrameOf(page)?.metadata.dsl;
  return isRecord(arch) && isRecord(arch.arch) ? archModelFromJson(arch.arch.model) : null;
}

export function archViewIdOfPage(page: ScenePage): string | null {
  const arch = archFrameOf(page)?.metadata.dsl;
  if (!isRecord(arch) || !isRecord(arch.arch)) return null;
  return typeof arch.arch.view === 'string' ? arch.arch.view : null;
}

/** First page of the document that belongs to a model. */
export function archModelOfDocument(document: SceneDocumentV1 | null | undefined): ArchModel | null {
  if (!document) return null;
  for (const page of document.pages) {
    const model = archModelOfPage(page);
    if (model) return model;
  }
  return null;
}

export function archPageOfView(document: SceneDocumentV1, viewId: string): ScenePage | undefined {
  return document.pages.find((page) => archViewIdOfPage(page) === viewId);
}

/** Flattened, playback-ordered steps with their structural depth and branch label. */
export interface FlatFlowStep {
  readonly step: FlowStep;
  readonly depth: number;
  readonly branch?: string;
}

export function flattenFlowSteps(flow: ArchFlow): readonly FlatFlowStep[] {
  const out: FlatFlowStep[] = [];
  const walk = (steps: readonly FlowStep[], depth: number, branch?: string) => {
    for (const step of steps) {
      out.push({ step, depth, ...(branch ? { branch } : {}) });
      for (const lane of step.branches ?? []) walk(lane.steps, depth + 1, lane.label);
    }
  };
  walk(flow.steps, 0);
  return out;
}
