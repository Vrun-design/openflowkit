import { createArchIndex, elementPathRef, type ArchIndex } from '../../model/model';
import type { ArchElement, ArchFlow, ArchModel, ArchRelation, ArchView, FlowStep } from '../../model/types';
import { dslFrameRaw, type CanonicalAttribute, type DslFrameScene } from '../../sceneMeta';
import { attributeText, quote, slugifyDslId } from '../../text';
import { canonicalColorWord, sortAttributes } from '../../vocabulary';
import { graphText } from '../graph/text';
import { archModelFromJson } from '../../model/model';

/**
 * Canonical C4 text (grammar §6.4/§9): the model tree, deployment blocks,
 * views and flows, re-emitted from `metadata.dsl.arch.model`. Plain graph
 * content in the architecture family falls back to the graph serializer.
 */

export function architectureText(scene: DslFrameScene): string[] {
  const raw = dslFrameRaw(scene.frame);
  const arch = raw.arch;
  if (!arch || typeof arch !== 'object' || Array.isArray(arch)) return graphText(scene);
  const model = archModelFromJson((arch as { model?: unknown }).model);
  if (!model) return graphText(scene);
  const reserved = Array.isArray(raw.reserved)
    ? raw.reserved.filter((item): item is string => typeof item === 'string')
    : [];
  return [...workspaceBody(model), ...reserved];
}

/** The workspace body: model, deployment, views and flows. */
export function workspaceBody(model: ArchModel): string[] {
  return [
    ...modelText(model),
    ...deploymentText(model),
    ...viewsText(model),
    ...flowsText(model),
  ];
}

/**
 * The full workspace text for a model. The source text is the hub: adding a
 * view, drilling down or exporting a flow all go back through the compiler.
 */
export function architectureWorkspaceText(model: ArchModel): string {
  const lines = ['%% ofk 1', 'architecture'];
  if (model.name) lines.push(`title: ${quote(model.name)}`);
  lines.push('', ...workspaceBody(model));
  return `${lines.join('\n')}\n`;
}

function modelText(model: ArchModel): string[] {
  const index = createArchIndex(model);
  const roots = model.elements.filter((element) => element.parent === null && !element.env);
  if (roots.length === 0 && model.relations.length === 0) return [];
  const lines: string[] = ['model {'];
  for (const element of roots) emitElement(index, element, '  ', lines);
  for (const relation of model.relations) {
    if (!sharedScope(index, relation)) lines.push(`  ${relationLine(index, relation, null)}`);
  }
  lines.push('}');
  return lines;
}

function deploymentText(model: ArchModel): string[] {
  const envs = [...new Set(model.elements.filter((element) => element.env).map((element) => element.env!))];
  const index = createArchIndex(model);
  const lines: string[] = [];
  for (const env of envs) {
    const roots = model.elements.filter((element) => element.env === env && element.parent === null);
    lines.push(`deployment ${quote(env)} {`);
    for (const element of roots) emitElement(index, element, '  ', lines);
    for (const relation of model.relations) {
      const from = index.byId.get(relation.from);
      const to = index.byId.get(relation.to);
      if (from?.env !== env || to?.env !== env) continue;
      const scope = sharedScope(index, relation);
      if (!scope) lines.push(`  ${relationLine(index, relation, null)}`);
    }
    lines.push('}');
  }
  return lines;
}

function emitElement(index: ArchIndex, element: ArchElement, indent: string, lines: string[]): void {
  const children = index.model.elements.filter((child) => child.parent === element.id);
  const attributes = elementAttributes(element);
  const head = `${declarationHead(index, element)}${attributeText(attributes)}`;
  if (children.length === 0) {
    lines.push(`${indent}${head}`);
    return;
  }
  lines.push(`${indent}${head} {`);
  for (const child of children) emitElement(index, child, `${indent}  `, lines);
  for (const relation of index.model.relations) {
    if (sharedScope(index, relation) !== element.id) continue;
    lines.push(`${indent}  ${relationLine(index, relation, element.id)}`);
  }
  lines.push(`${indent}}`);
}

/** `kind Name`, `id = kind Name` when the local id is not the name's slug, or `instance Ref`. */
function declarationHead(index: ArchIndex, element: ArchElement): string {
  if (element.kind === 'instance') {
    return `instance ${element.instanceOf ? elementPathRef(index, element.instanceOf) : quote(element.name)}`;
  }
  const localId = element.parent ? element.id.slice(element.parent.length + 1) : element.id;
  const head = `${element.kind} ${quote(element.name)}`;
  return slugifyDslId(element.name) === localId ? head : `${localId} = ${head}`;
}

function elementAttributes(element: ArchElement): CanonicalAttribute[] {
  const entries: CanonicalAttribute[] = [...(element.attrs ?? [])];
  if (element.color) {
    const word = canonicalColorWord(element.color);
    entries.push(word ? { value: word } : { value: element.color });
  }
  if (element.icon) entries.push({ key: 'icon', value: element.icon });
  if (element.tech) entries.push({ key: 'tech', value: element.tech });
  if (element.desc) entries.push({ key: 'desc', value: element.desc });
  if (element.tags.length) entries.push({ key: 'tags', value: element.tags.join(', ') });
  for (const link of element.links) entries.push({ key: 'link', value: link });
  return sortAttributes(entries);
}

function relationAttributes(relation: ArchRelation): CanonicalAttribute[] {
  const entries: CanonicalAttribute[] = [...(relation.attrs ?? [])];
  if (relation.tech) entries.push({ key: 'tech', value: relation.tech });
  if (relation.tags.length) entries.push({ key: 'tags', value: relation.tags.join(', ') });
  return sortAttributes(entries);
}

function relationLine(index: ArchIndex, relation: ArchRelation, scope: string | null): string {
  const from = refText(index, relation.from, scope);
  const to = refText(index, relation.to, scope);
  const attributes = relationAttributes(relation);
  return `${from} -> ${to}${relation.label ? ` : ${quote(relation.label)}` : ''}${attributeText(attributes)}`;
}

/** The block a relation belongs in: both endpoints share a parent element. */
function quoted(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
}

function sharedScope(index: ArchIndex, relation: ArchRelation): string | null {
  const from = index.byId.get(relation.from);
  const to = index.byId.get(relation.to);
  if (!from || !to) return null;
  return from.parent !== null && from.parent === to.parent ? from.parent : null;
}

/** Shortest unambiguous reference: local name inside the scope, else a unique name, else the path. */
function refText(index: ArchIndex, id: string, scope: string | null): string {
  const element = index.byId.get(id);
  if (!element) return id;
  if (scope !== null && element.parent === scope) return quote(element.name);
  const sameName = index.model.elements.filter((candidate) => candidate.name.toLowerCase() === element.name.toLowerCase());
  if (sameName.length === 1) return quote(element.name);
  const path = elementPathRef(index, id);
  return /^[A-Za-z_][A-Za-z0-9_.-]*$/.test(path) ? path : quote(path);
}

function viewsText(model: ArchModel): string[] {
  if (model.views.length === 0) return [];
  const lines: string[] = ['views {'];
  for (const view of model.views) {
    const head = viewHead(indexOf(model), view);
    if (view.rules.length === 0) {
      lines.push(`  ${head}`);
      continue;
    }
    lines.push(`  ${head} {`);
    for (const rule of view.rules) lines.push(`    ${ruleText(rule)}`);
    lines.push('  }');
  }
  lines.push('}');
  return lines;
}

function indexOf(model: ArchModel): ArchIndex {
  return createArchIndex(model);
}

function viewHead(index: ArchIndex, view: ArchView): string {
  const ref = view.of ? elementPathRef(index, view.of) : undefined;
  switch (view.kind) {
    case 'landscape':
      return 'view landscape';
    case 'custom':
      return `view custom ${quoted(view.name)}${view.direction ? ` [${view.direction}]` : ''}`;
    case 'deployment':
      return `view deployment of ${ref ?? '?'} in ${quote(view.env ?? '')}`;
    default:
      return `view ${view.kind} of ${ref ?? '?'}`;
  }
}

function ruleText(rule: ArchView['rules'][number]): string {
  if (rule.raw) return rule.raw;
  const subject = rule.arrow
    ? `${rule.arrow.from ?? ''} -> ${rule.arrow.to ?? ''}`.trim()
    : rule.subject;
  const tag = (value: string) => value.startsWith('@') ? value : `@${value}`;
  const where = rule.where?.kind
    ? ` where kind is ${rule.where.kind}`
    : rule.where?.tag
      ? ` where tag is ${tag(rule.where.tag)}`
      : rule.where?.tagNot
        ? ` where tag is not ${tag(rule.where.tagNot)}`
        : '';
  return `${rule.op} ${subject}${where}`.trim();
}

function flowsText(model: ArchModel): string[] {
  const index = indexOf(model);
  return model.flows.flatMap((flow) => flowText(index, flow));
}

function flowText(index: ArchIndex, flow: ArchFlow): string[] {
  const head = `flow ${quoted(flow.name)}`;
  if (flow.steps.length === 0) return [head];
  const lines: string[] = [`${head} {`];
  for (const step of flow.steps) emitStep(index, step, '  ', lines);
  lines.push('}');
  return lines;
}

function emitStep(index: ArchIndex, step: FlowStep, indent: string, lines: string[]): void {
  switch (step.kind) {
    case 'message': {
      const from = step.from ? refText(index, step.from, null) : '?';
      const to = step.to ? refText(index, step.to, null) : '?';
      lines.push(`${indent}step ${from} -> ${to}${step.label ? ` : ${quote(step.label)}` : ''}`);
      return;
    }
    case 'goto':
      lines.push(`${indent}goto ${quote(step.goto ?? step.label ?? '')}`);
      return;
    case 'alternate': {
      lines.push(`${indent}alt${step.label ? ` ${quote(step.label)}` : ''} {`);
      (step.branches ?? []).forEach((branch, position) => {
        if (position > 0) lines.push(`${indent}} else${branch.label ? ` ${quote(branch.label)}` : ''} {`);
        for (const nested of branch.steps) emitStep(index, nested, `${indent}  `, lines);
      });
      lines.push(`${indent}}`);
      return;
    }
    case 'parallel': {
      lines.push(`${indent}par {`);
      (step.branches ?? []).forEach((lane, position) => {
        if (position > 0) lines.push(`${indent}} and {`);
        for (const nested of lane.steps) emitStep(index, nested, `${indent}  `, lines);
      });
      lines.push(`${indent}}`);
      return;
    }
    case 'info':
      lines.push(`${indent}note ${quote(step.label ?? '')}`);
      return;
    default:
      lines.push(`${indent}${step.kind}${step.label ? ` ${quote(step.label)}` : ''}`);
  }
}
