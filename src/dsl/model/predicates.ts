import type {
  ArchIndex,
} from './model';
import {
  elementAncestors, elementChildren, elementDescendantIds, nearestShown, relationPairKey, resolveElementRef,
} from './model';
import type { ArchElement, ArchModel, ArchView, ProjectedRelation, ViewRule } from './types';

/**
 * View predicates (grammar §9.4): the subset of Structurizr/LikeC4 include
 * expressions we honour, evaluated in order, later rules winning. Unsupported
 * forms are reported so the serializer can keep them verbatim (W160).
 */

export interface ViewSelection {
  readonly shown: ReadonlySet<string>;
  readonly unsupported: readonly ViewRule[];
}

const TAG = (value: string): string => value.replace(/^@/, '').toLowerCase();

/** Environment names compare case-insensitively (`deployment Prod` / `in prod`). */
const sameEnv = (a: string | undefined, b: string | undefined): boolean =>
  a !== undefined && b !== undefined && a.toLowerCase() === b.toLowerCase();

function matchesWhere(element: ArchElement, rule: ViewRule): boolean {
  const where = rule.where;
  if (!where) return true;
  if (where.kind && element.kind !== where.kind) return false;
  if (where.tag && !element.tags.some((tag) => TAG(tag) === TAG(where.tag!))) return false;
  if (where.tagNot && element.tags.some((tag) => TAG(tag) === TAG(where.tagNot!))) return false;
  return true;
}

/** The implicit `include *` scope for a view kind. */
export function defaultScope(index: ArchIndex, view: ArchView): string[] {
  const model = index.model;
  const ids = model.elements.map((element) => element.id);
  const byId = index.byId;
  const isDescendantOf = (id: string, ancestorId: string): boolean =>
    elementAncestors(index, id).includes(ancestorId);
  const topLevel = (element: ArchElement): string => {
    const ancestors = elementAncestors(index, element.id);
    return ancestors.at(-1) ?? element.id;
  };
  const relatedOtherSides = (subtreeRoot: string): string[] => {
    const inside = new Set([subtreeRoot, ...elementDescendantIds(index, subtreeRoot)]);
    const others = new Set<string>();
    for (const relation of index.relations) {
      const fromInside = inside.has(relation.from);
      const toInside = inside.has(relation.to);
      if (fromInside === toInside) continue;
      others.add(fromInside ? relation.to : relation.from);
    }
    return [...others];
  };

  switch (view.kind) {
    case 'landscape':
      return ids.filter((id) => !byId.get(id)?.env && byId.get(id)?.kind !== 'instance');
    case 'context': {
      if (!view.of || !byId.has(view.of)) return ids.filter((id) => !byId.get(id)?.env);
      const focus = view.of;
      const shown = new Set<string>([focus]);
      for (const other of relatedOtherSides(focus)) {
        if (isDescendantOf(other, focus)) continue;
        const element = byId.get(other);
        if (element) shown.add(topLevel(element));
      }
      return [...shown];
    }
    case 'container': {
      if (!view.of || !byId.has(view.of)) return [];
      const focus = view.of;
      const shown = new Set<string>([focus]);
      for (const child of elementChildren(index, focus)) shown.add(child.id);
      for (const other of relatedOtherSides(focus)) {
        if (other === focus || isDescendantOf(other, focus)) continue;
        const element = byId.get(other);
        if (element) shown.add(topLevel(element));
      }
      return [...shown];
    }
    case 'component': {
      if (!view.of || !byId.has(view.of)) return [];
      const focus = view.of;
      const shown = new Set<string>([focus]);
      for (const child of elementChildren(index, focus)) shown.add(child.id);
      for (const other of relatedOtherSides(focus)) {
        if (other === focus) continue;
        if (isDescendantOf(other, focus)) { shown.add(other); continue; }
        // Outside the component's own scope: project up to the nearest non-component box.
        let current = byId.get(other) ?? null;
        while (current && current.kind === 'component' && current.parent) current = byId.get(current.parent) ?? null;
        if (current) shown.add(current.id);
      }
      return [...shown];
    }
    case 'deployment':
      return ids.filter((id) => sameEnv(byId.get(id)?.env, view.env));
    default:
      return ids.filter((id) => !byId.get(id)?.env);
  }
}

function resolveRule(index: ArchIndex, view: ArchView, rule: ViewRule): string[] | null {
  const ids = new Set<string>();
  const add = (candidates: readonly string[]) => {
    for (const id of candidates) {
      const element = index.byId.get(id);
      if (element && matchesWhere(element, rule)) ids.add(id);
    }
  };
  const subject = rule.subject.trim();
  if (rule.arrow) {
    const from = rule.arrow.from ? resolveElementRef(index, rule.arrow.from, view.of ?? null)?.id ?? null : null;
    const to = rule.arrow.to ? resolveElementRef(index, rule.arrow.to, view.of ?? null)?.id ?? null : null;
    if (!from && !to) return null;
    if (from) add([from]);
    if (to) add([to]);
    for (const relation of index.model.relations) {
      if (from && relation.from !== from) continue;
      if (to && relation.to !== to) continue;
      if (from && to && (relation.from !== from || relation.to !== to)) continue;
      add(from ? [relation.to] : [relation.from]);
    }
    return [...ids];
  }
  if (subject === '*') {
    add(defaultScope(index, view));
    return [...ids];
  }
  const descendants = subject.endsWith('.**');
  const children = !descendants && subject.endsWith('.*');
  const baseRef = descendants ? subject.slice(0, -3) : children ? subject.slice(0, -2) : subject;
  const base = resolveElementRef(index, baseRef, view.of ?? null);
  if (!base) return [];
  if (descendants) add([base.id, ...elementDescendantIds(index, base.id)]);
  else if (children) add(elementChildren(index, base.id).map((child) => child.id));
  else add([base.id]);
  return [...ids];
}

export function selectViewElements(index: ArchIndex, view: ArchView): ViewSelection {
  const shown = new Set<string>();
  const unsupported: ViewRule[] = [];
  // Structurizr semantics: a typed view starts from its default scope and
  // include/exclude lines refine it. A custom view shows exactly what its
  // rules say, so `view custom` can be a real subset.
  if (view.kind !== 'custom') {
    for (const id of defaultScope(index, view)) shown.add(id);
  }
  const excluded = new Set<string>();
  for (const rule of view.rules) {
    const ids = resolveRule(index, view, rule);
    if (ids === null) {
      unsupported.push(rule);
      continue;
    }
    for (const id of ids) {
      if (rule.op === 'include') {
        shown.add(id);
        excluded.delete(id);
      } else {
        shown.delete(id);
        excluded.add(id);
      }
    }
  }
  // A deployment view only ever draws its environment.
  if (view.kind === 'deployment') {
    for (const id of [...shown]) {
      if (!sameEnv(index.byId.get(id)?.env, view.env)) shown.delete(id);
    }
  }
  // Excluding a boundary takes its children with it. A child whose parent was
  // simply never included (a custom view listing leaves) stays and draws at
  // the top level.
  for (const id of [...shown]) {
    if (isAncestorShown(index, id, shown)) continue;
    if (elementAncestors(index, id).some((ancestor) => excluded.has(ancestor))) shown.delete(id);
  }
  return { shown, unsupported };
}

function isAncestorShown(index: ArchIndex, id: string, shown: ReadonlySet<string>): boolean {
  return elementAncestors(index, id).some((ancestor) => shown.has(ancestor));
}

/** Shown elements that draw as boundary boxes because a shown child lives inside them. */
export function boundaryIds(index: ArchIndex, shown: ReadonlySet<string>): ReadonlySet<string> {
  const boundaries = new Set<string>();
  for (const id of shown) {
    const element = index.byId.get(id);
    if (!element) continue;
    if (element.kind === 'instance') continue;
    if (elementChildren(index, id).some((child) => shown.has(child.id))) boundaries.add(id);
  }
  return boundaries;
}

function candidateScore(candidate: ProjectedRelation): number {
  return (candidate.implied ? 0 : 2) + (candidate.relation.label ? 1 : 0);
}

/**
 * Projects relations onto a view: an endpoint the view hides resolves to its
 * nearest shown ancestor, so `Customer -> Shop.Web` appears as
 * `Customer -> Shop` on the context view. Explicit relations only — projecting
 * them already produces the ancestor pair Structurizr spells out as an implied
 * relationship, without the redundant boundary-to-boundary duplicates.
 */
export function projectRelations(index: ArchIndex, shown: ReadonlySet<string>): readonly ProjectedRelation[] {
  const best = new Map<string, ProjectedRelation>();
  const order: string[] = [];
  for (const relation of index.model.relations) {
    const from = nearestShown(index, relation.from, shown);
    const to = nearestShown(index, relation.to, shown);
    if (!from || !to || from === to) continue;
    const key = relationPairKey(from, to);
    const candidate: ProjectedRelation = {
      relation, from, to,
      implied: relation.implied === true || relation.from !== from || relation.to !== to,
    };
    const existing = best.get(key);
    if (!existing) {
      best.set(key, candidate);
      order.push(key);
    } else if (candidateScore(candidate) > candidateScore(existing)) {
      best.set(key, candidate);
    }
  }
  return order.map((key) => best.get(key)!);
}

/** Every element a view depicts, in model order. */
export function viewOrder(index: ArchIndex, shown: ReadonlySet<string>): readonly ArchElement[] {
  return index.model.elements.filter((element) => shown.has(element.id));
}

/** Tag words used anywhere in the model, for the perspective filter. */
export function modelTags(model: ArchModel): readonly string[] {
  const tags = new Set<string>();
  for (const element of model.elements) for (const tag of element.tags) tags.add(TAG(tag));
  for (const relation of model.relations) for (const tag of relation.tags) tags.add(TAG(tag));
  return [...tags].sort();
}
