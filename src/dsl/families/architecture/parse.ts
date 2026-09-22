import type { DslAttribute, DslDiagnostic, DslDirection, DslEdge } from '../../ast';
import { lineDiagnostic, tokenDiagnostic } from '../../diagnostics';
import { canonicalizeAttributes, readAttributes } from '../../attributes';
import type { CanonicalAttribute } from '../../sceneMeta';
import { joinTokens, type DslSegment } from '../../segments';
import { slugifyDslId } from '../../text';
import { DIRECTIONS } from '../../vocabulary';
import type { DslToken } from '../../tokenize';
import { createArchIndex, resolveElementRef } from '../../model/model';
import {
  ELEMENT_KINDS, FLOW_STEP_KINDS, VIEW_KINDS,
  type ArchElement, type ArchFlow, type ArchModel, type ArchRelation, type ArchView,
  type ElementKind, type FlowStep, type FlowStepKind, type ViewKind, type ViewRule,
} from '../../model/types';
import { parseEdge } from '../graph/parse';

/**
 * The C4 block parser (grammar §9): `model`, `deployment`, `views` and `flow`
 * blocks with real semantics. Plain graph lines are still handled by the graph
 * engine — `parseArchitectureWorkspace` returns null when no C4 block appears.
 *
 * Two passes: declarations land first (element paths, views, flows), then every
 * reference resolves against the finished tree, so relations may precede their
 * targets (and Structurizr's scoped `-> B` works).
 */

interface Block {
  readonly tokens: readonly DslToken[];
  readonly children: Block[];
  readonly segment: DslSegment;
}

/** Unknown blocks round-trip whole, braces and children included. */
function blockLines(block: Block, indent = ''): string[] {
  const head = joinTokens(block.tokens);
  if (block.children.length === 0) return [`${indent}${head}`];
  return [
    `${indent}${head} {`,
    ...block.children.flatMap((child) => blockLines(child, `${indent}  `)),
    `${indent}}`,
  ];
}

function blockTree(segments: readonly DslSegment[]): Block[] {
  const roots: Block[] = [];
  const stack: Block[][] = [roots];
  for (const segment of segments) {
    if (segment.tokens[0]?.kind === 'comment') continue;
    if (segment.closes) {
      if (stack.length > 1) stack.pop();
      continue;
    }
    if (segment.tokens.length === 0) continue;
    const block: Block = { tokens: segment.tokens, children: [], segment };
    stack.at(-1)!.push(block);
    if (segment.opens) stack.push(block.children);
  }
  return roots;
}

/** Tags read back from a `where` clause: `@ core` → `@core`, bare `core` → `@core`. */
function joinTagValue(tokens: readonly DslToken[]): string {
  const text = joinTokens(tokens).replace(/@\s+/g, '@');
  return text.startsWith('@') ? text : `@${text}`;
}

/** `@core` is two tokens (`@` + word); fold them into tags and hand back the rest. */
export function extractTags(tokens: readonly DslToken[]): { tokens: DslToken[]; tags: string[] } {
  const out: DslToken[] = [];
  const tags: string[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (token.value === '@' && tokens[index + 1]?.kind === 'word') {
      tags.push(tokens[index + 1]!.value);
      index += 1;
      continue;
    }
    out.push(token);
  }
  return { tokens: out, tags };
}

/**
 * Canonical attribute list with model semantics: a `tags:` value may carry a
 * comma-separated list, so bare entries after it are tags, not attributes.
 */
export function canonicalAttributesWithTags(
  attributes: readonly DslAttribute[],
  sugar: readonly string[] = [],
): { attributes: CanonicalAttribute[]; tags: string[] } {
  const tags = new Set(sugar.map((tag) => tag.toLowerCase()));
  const kept: DslAttribute[] = [];
  let inTags = false;
  const addTags = (value: string) => {
    for (const part of value.split(',').map((entry) => entry.trim()).filter(Boolean)) tags.add(part.toLowerCase());
  };
  for (const attribute of attributes) {
    if (attribute.key) {
      inTags = attribute.key.toLowerCase() === 'tags';
      if (inTags) addTags(attribute.value);
      else kept.push(attribute);
      continue;
    }
    if (inTags) addTags(attribute.value);
    else kept.push(attribute);
  }
  return { attributes: canonicalizeAttributes(kept, []), tags: [...tags] };
}

/** Attributes with a typed home on `ArchElement`; the rest stay in `attrs`. */
const TYPED_ELEMENT_KEYS = new Set(['tech', 'desc', 'link', 'icon', 'color']);
const TYPED_RELATION_KEYS = new Set(['label', 'tech', 'link']);

function splitAttributes(
  attributes: readonly CanonicalAttribute[],
  typed: ReadonlySet<string>,
): { values: Map<string, string>; attrs: CanonicalAttribute[] } {
  const values = new Map<string, string>();
  const attrs: CanonicalAttribute[] = [];
  for (const attribute of attributes) {
    const key = attribute.key?.toLowerCase();
    if (key && typed.has(key)) {
      if (!values.has(key)) values.set(key, attribute.value);
      continue;
    }
    attrs.push(attribute);
  }
  return { values, attrs };
}

interface RelationDraft {
  readonly scope: string | null;
  readonly line: number;
  readonly from: string;
  readonly to: string;
  readonly label?: string;
  readonly tech?: string;
  readonly tags: readonly string[];
  readonly attrs?: readonly CanonicalAttribute[];
}

interface Declaration {
  readonly localId: string;
  readonly name: string;
  readonly kind: ElementKind;
  readonly tags: string[];
  readonly attrs: readonly CanonicalAttribute[];
  readonly line: number;
  readonly first: DslToken;
}

/** `<kind> Name [attrs]` or `id = <kind> Name [attrs]`; null when the line is not a declaration. */
function readDeclaration(tokens: readonly DslToken[], diagnostics: DslDiagnostic[]): Declaration | null {
  const { tokens: cleaned, tags: sugar } = extractTags(tokens);
  if (cleaned.length === 0) return null;
  const open = cleaned.findIndex((token) => token.value === '[');
  const head = open >= 0 ? cleaned.slice(0, open) : cleaned;
  let explicitId: string | undefined;
  let rest = head;
  if (head[1]?.value === '=') {
    explicitId = head[0]!.value;
    rest = head.slice(2);
  }
  const kind = rest[0]?.value;
  if (!kind || !(ELEMENT_KINDS as readonly string[]).includes(kind)) return null;
  const name = joinTokens(rest.slice(1));
  if (!name) return null;
  const parsed = readAttributes(cleaned, diagnostics);
  const { attributes, tags } = canonicalAttributesWithTags(parsed.attributes, sugar);
  const wanted = explicitId ?? slugifyDslId(name);
  const localId = /^[A-Za-z_][A-Za-z0-9_-]*$/.test(wanted) ? wanted : slugifyDslId(wanted);
  if (explicitId && localId !== explicitId) {
    diagnostics.push(tokenDiagnostic('W120', 'warning', cleaned[0], `Invalid explicit id ${explicitId}; slugified as ${localId}`));
  }
  return { localId, name, kind: kind as ElementKind, tags, attrs: attributes, line: cleaned[0]!.line, first: cleaned[0]! };
}

/** IcePanel's step vocabulary in DSL spelling; `alt`/`par` are the short forms. */
const FLOW_KEYWORDS: Readonly<Record<string, FlowStepKind | 'step'>> = {
  step: 'step', alt: 'alternate', par: 'parallel', note: 'info',
};

export interface ArchitectureWorkspace {
  readonly model: ArchModel;
  /** Lines the parser could not honour, kept for the serializer's `reserved` tail. */
  readonly reserved: readonly string[];
}

/** True when the text uses at least one C4 construct. */
export function isArchitectureWorkspace(segments: readonly DslSegment[]): boolean {
  return blockTree(segments).some((root) => {
    const first = root.tokens[0]?.value;
    if (first === 'model' || first === 'views' || first === 'deployment' || first === 'workspace') return true;
    return first === 'flow' && root.tokens.length > 1;
  });
}

export function parseArchitectureWorkspace(
  segments: readonly DslSegment[],
  diagnostics: DslDiagnostic[],
): ArchitectureWorkspace | null {
  const roots = blockTree(segments);
  if (!isArchitectureWorkspace(segments)) return null;

  const elements: ArchElement[] = [];
  const views: ArchView[] = [];
  const flowDrafts: Array<{ flow: ArchFlow; refs: Map<FlowStep, { from: string; to: string }> }> = [];
  const reserved: string[] = [];
  const usedIds = new Set<string>();
  const pendingRelations: RelationDraft[] = [];
  const pendingInstances: Array<{ element: ArchElement; ref: string; line: number }> = [];
  let stepCounter = 0;
  let modelName: string | undefined;

  const uniquePath = (parent: string | null, localId: string): string => {
    const base = parent ? `${parent}.${localId}` : localId;
    let candidate = base;
    let suffix = 2;
    while (usedIds.has(candidate)) candidate = `${base}-${suffix++}`;
    usedIds.add(candidate);
    return candidate;
  };

  const declare = (declaration: Declaration, parent: string | null, extra: Partial<ArchElement> = {}): ArchElement => {
    const typed = splitAttributes(declaration.attrs, TYPED_ELEMENT_KEYS);
    // `store` implies `cylinder` (§14.17 says it is emitted) so v1 renderers agree.
    const attrs = declaration.kind === 'store' && !typed.attrs.some((entry) => entry.value === 'cylinder')
      ? [{ value: 'cylinder' } as const, ...typed.attrs]
      : typed.attrs;
    const element: ArchElement = {
      id: uniquePath(parent, declaration.localId),
      kind: declaration.kind,
      name: declaration.name,
      parent,
      tags: declaration.tags,
      ...(typed.values.has('tech') ? { tech: typed.values.get('tech')! } : {}),
      ...(typed.values.has('desc') ? { desc: typed.values.get('desc')! } : {}),
      links: declaration.attrs.filter((entry) => entry.key === 'link').map((entry) => entry.value),
      ...(typed.values.has('icon') ? { icon: typed.values.get('icon')! } : {}),
      ...(typed.values.has('color') ? { color: typed.values.get('color')! } : {}),
      ...(attrs.length ? { attrs } : {}),
      line: declaration.line,
      ...extra,
    };
    elements.push(element);
    return element;
  };

  const declareRelation = (scope: string | null, edge: DslEdge): void => {
    const { attributes, tags } = canonicalAttributesWithTags(edge.attributes, []);
    const typed = splitAttributes(attributes, TYPED_RELATION_KEYS);
    const draft: RelationDraft = {
      scope, line: edge.line, tags,
      from: edge.from.id ?? edge.from.label,
      to: edge.to.id ?? edge.to.label,
      ...(edge.label ?? typed.values.get('label') ? { label: edge.label ?? typed.values.get('label')! } : {}),
      ...(typed.values.has('tech') ? { tech: typed.values.get('tech')! } : {}),
      ...(typed.attrs.length ? { attrs: typed.attrs } : {}),
    };
    pendingRelations.push(draft);
  };

  // ---- model --------------------------------------------------------------

  const walkModel = (blocks: readonly Block[], scope: string | null, env?: string): void => {
    for (const block of blocks) {
      const declaration = readDeclaration(block.tokens, diagnostics);
      if (declaration) {
        const element = declare(declaration, scope, env ? { env } : {});
        if (declaration.kind === 'instance') {
          const reference = joinTokens(extractTags(block.tokens).tokens.slice(1));
          if (reference) pendingInstances.push({ element, ref: reference, line: declaration.line });
        }
        walkModel(block.children, element.id, env);
        continue;
      }
      const edges = parseEdge(block.tokens, diagnostics);
      if (edges) {
        for (const edge of edges) declareRelation(scope, edge);
        continue;
      }
      const line = blockLines(block).join('\n');
      if (line) {
        diagnostics.push(tokenDiagnostic('W101', 'warning', block.tokens[0], 'Line could not be read as an element or relation; kept verbatim', 'Try `container Name [tech: …]` or `A -> B : label`'));
        reserved.push(line);
      }
    }
  };

  // ---- deployment ---------------------------------------------------------

  const walkDeployment = (block: Block, env: string, parentId: string | null): void => {
    const declaration = readDeclaration(block.tokens, diagnostics);
    if (!declaration) {
      diagnostics.push(tokenDiagnostic('W101', 'warning', block.tokens[0], 'Deployment node needs a name; kept verbatim'));
      const line = blockLines(block).join('\n');
      if (line) reserved.push(line);
      return;
    }
    const element = declare(declaration, parentId, { env });
    walkModel(block.children, element.id, env);
  };

  // ---- views --------------------------------------------------------------

  const attributeDirection = (token: DslToken): DslDirection | undefined =>
    token.kind === 'word' ? DIRECTIONS[token.value.toLowerCase()] : undefined;

  const parseRule = (block: Block): ViewRule | null => {
    const tokens = block.tokens;
    const op = tokens[0]?.value;
    if (op !== 'include' && op !== 'exclude') {
      diagnostics.push(tokenDiagnostic('W160', 'warning', tokens[0], 'Unsupported view statement; kept verbatim'));
      return { op: 'include', subject: '', raw: joinTokens(tokens), line: tokens[0]?.line ?? 1 };
    }
    const raw = joinTokens(tokens);
    const arrowAt = tokens.findIndex((token, index) => index > 0 && token.kind === 'arrow');
    const whereAt = tokens.findIndex((token, index) => index > 0 && token.value.toLowerCase() === 'where');
    const end = whereAt < 0 ? tokens.length : whereAt;
    const subject = joinTokens(tokens.slice(1, arrowAt < 0 ? end : arrowAt));
    let arrow: ViewRule['arrow'];
    if (arrowAt >= 0) {
      const left = joinTokens(tokens.slice(1, arrowAt));
      const right = joinTokens(tokens.slice(arrowAt + 1, end));
      arrow = { ...(left ? { from: left } : {}), ...(right ? { to: right } : {}) };
      if (!left && !right) return null;
    }
    let where: ViewRule['where'];
    if (whereAt >= 0) {
      const clause = tokens.slice(whereAt + 1);
      if (clause.some((token) => ['and', 'or'].includes(token.value.toLowerCase()))) {
        diagnostics.push(tokenDiagnostic('W160', 'warning', tokens[whereAt], 'Compound `where` is unsupported; kept verbatim'));
        return { op, subject, raw, line: tokens[0]?.line ?? 1 };
      }
      const isAt = clause.findIndex((token) => token.value.toLowerCase() === 'is');
      const key = clause[0]?.value.toLowerCase();
      const negated = clause[isAt + 1]?.value.toLowerCase() === 'not';
      const value = joinTokens(clause.slice(isAt + (negated ? 2 : 1)));
      const tagValue = joinTagValue(clause.slice(isAt + (negated ? 2 : 1)));
      if (isAt >= 0 && key === 'kind') where = { kind: value };
      else if (isAt >= 0 && key === 'tag') where = negated ? { tagNot: tagValue } : { tag: tagValue };
      else {
        diagnostics.push(tokenDiagnostic('W160', 'warning', clause[0], `Unsupported \`where\` clause; kept verbatim`));
        return { op, subject, raw, line: tokens[0]?.line ?? 1 };
      }
    }
    if (!subject && !arrow) return null;
    return { op, subject: arrow ? subject : subject || '*', ...(arrow ? { arrow } : {}), ...(where ? { where } : {}), line: tokens[0]?.line ?? 1 };
  };

  const parseView = (block: Block): ArchView | undefined => {
    const tokens = block.tokens;
    const kind = tokens[1]?.value as ViewKind | undefined;
    if (!kind || !(VIEW_KINDS as readonly string[]).includes(kind)) {
      diagnostics.push(tokenDiagnostic('W160', 'warning', tokens[1] ?? tokens[0], 'Unknown view kind; kept verbatim'));
      reserved.push(blockLines(block).join('\n'));
      return undefined;
    }
    let of: string | undefined;
    let env: string | undefined;
    let direction: DslDirection | undefined;
    // A bracketed `[right]` is a direction hint; bare trailing words work too.
    const bracketed = new Set<number>();
    for (let index = 0; index < tokens.length; index += 1) {
      if (tokens[index]?.value !== '[') continue;
      const close = tokens.findIndex((token, at) => at > index && token.value === ']');
      if (close < 0) continue;
      const candidate = tokens.slice(index + 1, close).map(attributeDirection).find(Boolean);
      if (candidate) {
        direction = candidate;
        for (let at = index; at <= close; at += 1) bracketed.add(at);
      }
    }
    const rest = tokens.slice(2).filter((token, index) => {
      if (bracketed.has(index + 2)) return false;
      const candidate = attributeDirection(token);
      if (candidate && tokens[index + 3]?.value !== ']') {
        direction = candidate;
        return false;
      }
      return true;
    });
    // Quoted names are string tokens but still name the scope (`of "Docs Site"`).
    const words = rest;
    const strings = rest.filter((token) => token.kind === 'string');
    const ofAt = words.findIndex((token) => token.value.toLowerCase() === 'of');
    const inAt = words.findIndex((token) => token.value.toLowerCase() === 'in');
    // `of Shop.Web` is one token; `of API Gateway` is a display name, so a
    // multi-word reference joins with spaces and resolves by name.
    if (ofAt >= 0) of = words.slice(ofAt + 1, inAt > ofAt ? inAt : words.length).map((token) => token.value).join(' ');
    if (inAt >= 0) env = words.slice(inAt + 1).map((token) => token.value).join(' ');
    const name = kind === 'custom'
      ? strings[0]?.value ?? of ?? 'Custom view'
      : of ? `${kind} of ${of}` : kind === 'deployment' && env ? `deployment in ${env}` : kind === 'landscape' ? 'System landscape' : kind;
    const rules = block.children.map(parseRule).filter((rule): rule is ViewRule => rule !== null);
    const id = kind === 'custom'
      ? `view:custom:${slugifyDslId(name)}`
      : kind === 'deployment'
        ? `view:deployment:${slugifyDslId(of ?? '')}:${slugifyDslId(env ?? '')}`
        : kind === 'landscape'
          ? 'view:landscape'
          : `view:${kind}:${slugifyDslId(of ?? '')}`;
    return {
      id, kind, name, rules,
      ...(of ? { of } : {}),
      ...(env ? { env } : {}),
      ...(direction ? { direction } : {}),
      line: tokens[0]!.line,
    };
  };

  // ---- flows --------------------------------------------------------------

  const walkFlow = (block: Block): void => {
    const flowName = joinTokens(block.tokens.slice(1)) || `Flow ${flowDrafts.length + 1}`;
    const flowId = `flow:${slugifyDslId(flowName)}`;
    const refs = new Map<FlowStep, { from: string; to: string }>();
    const steps = parseFlowBlocks(block.children, flowId, null, refs);
    flowDrafts.push({ flow: { id: flowId, name: flowName, steps, line: block.tokens[0]!.line }, refs });
  };

  const parseFlowBlocks = (
    blocks: readonly Block[], flowId: string, scope: string | null, refs: Map<FlowStep, { from: string; to: string }>,
  ): FlowStep[] => {
    const steps: FlowStep[] = [];
    for (let index = 0; index < blocks.length; index += 1) {
      const block = blocks[index]!;
      const first = block.tokens[0]?.value.toLowerCase() ?? '';
      if (first === 'else' || first === 'and') continue;
      const { tokens: cleaned, tags } = extractTags(block.tokens);
      const keyword = FLOW_KEYWORDS[first] ?? first;
      const kinds = FLOW_STEP_KINDS as readonly string[];
      stepCounter += 1;
      const id = `${flowId}.s${stepCounter}`;
      if ((keyword === 'alternate' || keyword === 'parallel') && block.segment.opens) {
        const label = joinTokens(cleaned.slice(1));
        const branches: Array<{ label?: string; steps: FlowStep[] }> = [];
        const firstBranch = keyword === 'alternate' ? (label ? { label } : {}) : {};
        branches.push({ ...firstBranch, steps: parseFlowBlocks(block.children, flowId, scope, refs) });
        // `else { … }` / `and { … }` are siblings of the opener.
        while (blocks[index + 1] && ['else', 'and'].includes(blocks[index + 1]!.tokens[0]?.value.toLowerCase() ?? '')) {
          index += 1;
          const sibling = blocks[index]!;
          const siblingLabel = joinTokens(sibling.tokens.slice(1));
          branches.push({ ...(siblingLabel ? { label: siblingLabel } : {}), steps: parseFlowBlocks(sibling.children, flowId, scope, refs) });
        }
        steps.push({ id, kind: keyword as FlowStepKind, tags, ...(label ? { label } : {}), branches, line: block.tokens[0]!.line });
        continue;
      }
      if (keyword === 'goto') {
        const target = joinTokens(cleaned.slice(1));
        if (target) steps.push({ id, kind: 'goto', tags, goto: target, line: block.tokens[0]!.line });
        continue;
      }
      if (keyword === 'message' || keyword === 'step') {
        const edges = parseEdge(cleaned.slice(1), diagnostics);
        if (edges && edges.length > 0) {
          const edge = edges[0]!;
          const step: FlowStep = {
            id, kind: 'message', tags,
            from: edge.from.id ?? edge.from.label, to: edge.to.id ?? edge.to.label,
            ...(edge.label ? { label: edge.label } : {}),
            line: edge.line,
          };
          refs.set(step, { from: step.from!, to: step.to! });
          steps.push(step);
          continue;
        }
        diagnostics.push(tokenDiagnostic('W101', 'warning', block.tokens[0], 'Flow step needs `A -> B` or a label; kept verbatim'));
        continue;
      }
      if (kinds.includes(keyword)) {
        const text = joinTokens(cleaned.slice(1));
        steps.push({
          id, kind: keyword as FlowStepKind, tags,
          ...(text ? { label: text } : {}),
          line: block.tokens[0]!.line,
        });
        continue;
      }
      diagnostics.push(tokenDiagnostic('W160', 'warning', block.tokens[0], 'Unsupported flow statement; kept verbatim'));
      reserved.push(joinTokens(block.tokens));
    }
    return steps;
  };

  // ---- assemble -----------------------------------------------------------

  const walkRoot = (block: Block): void => {
    const first = block.tokens[0]?.value;
    if (first === 'workspace') {
      const label = block.tokens.find((token) => token.kind === 'string');
      if (label && !modelName) modelName = label.value;
      for (const child of block.children) walkRoot(child);
      return;
    }
    if (first === 'model') {
      const label = block.tokens.find((token) => token.kind === 'string');
      if (label && !modelName) modelName = label.value;
      walkModel(block.children, null);
      return;
    }
    if (first === 'deployment') {
      const envName = joinTokens(block.tokens.slice(1)) || 'Production';
      for (const child of block.children) walkDeployment(child, envName, null);
      return;
    }
    if (first === 'views') {
      for (const child of block.children) {
        if (child.tokens[0]?.value === 'view') {
          const view = parseView(child);
          if (view) views.push(view);
        } else {
          diagnostics.push(tokenDiagnostic('W160', 'warning', child.tokens[0], 'Only `view …` lines belong in `views`; kept verbatim'));
          reserved.push(blockLines(child).join('\n'));
        }
      }
      return;
    }
    if (first === 'view') {
      const view = parseView(block);
      if (view) views.push(view);
      return;
    }
    if (first === 'flow') {
      walkFlow(block);
      return;
    }
    if (first?.startsWith('!')) return;
    const declaration = readDeclaration(block.tokens, diagnostics);
    if (declaration) {
      walkModel([block], null);
      return;
    }
    const edges = parseEdge(block.tokens, diagnostics);
    if (edges) {
      for (const edge of edges) declareRelation(null, edge);
      return;
    }
    const line = blockLines(block).join('\n');
    if (line) reserved.push(line);
  };
  for (const root of roots) walkRoot(root);

  // ---- resolve references -------------------------------------------------

  const provisional: ArchModel = { elements, relations: [], views, flows: flowDrafts.map(({ flow }) => flow) };
  const index = createArchIndex(provisional);
  const instanceTargets = new Map<ArchElement, string>();

  for (const entry of pendingInstances) {
    const target = resolveElementRef(index, entry.ref, entry.element.parent);
    if (!target) {
      diagnostics.push(lineDiagnostic(entry.line, 'W122', 'warning', `Unknown instance target ${entry.ref}; instance kept as a plain node`));
      continue;
    }
    instanceTargets.set(entry.element, target.id);
  }
  const resolvedRelations: ArchRelation[] = [];
  for (const entry of pendingRelations) {
    const from = resolveElementRef(index, entry.from, entry.scope);
    const to = resolveElementRef(index, entry.to, entry.scope);
    if (!from || !to) {
      diagnostics.push(lineDiagnostic(entry.line, 'W122', 'warning', `Unknown element reference ${!from ? entry.from : entry.to}; relation dropped`));
      continue;
    }
    resolvedRelations.push({
      id: `rel:${from.id}->${to.id}`, from: from.id, to: to.id, tags: entry.tags,
      ...(entry.label ? { label: entry.label } : {}),
      ...(entry.tech ? { tech: entry.tech } : {}),
      ...(entry.attrs ? { attrs: entry.attrs } : {}),
      line: entry.line,
    });
  }
  const resolvedFlows: ArchFlow[] = flowDrafts.map(({ flow, refs }) => ({
    ...flow,
    steps: resolveSteps(flow.steps, refs, index, diagnostics),
  }));
  const resolvedViews = views.map((view) => {
    if (!view.of) return view;
    const target = resolveElementRef(index, view.of, null);
    return target ? { ...view, of: target.id } : view;
  });
  const resolvedElements = elements.map((element) => {
    const target = instanceTargets.get(element);
    if (!target) return element;
    const targetElement = elements.find((candidate) => candidate.id === target);
    return { ...element, instanceOf: target, ...(targetElement ? { name: targetElement.name } : {}) };
  });

  return {
    reserved,
    model: {
      ...(modelName ? { name: modelName } : {}),
      elements: resolvedElements,
      relations: resolvedRelations,
      views: resolvedViews,
      flows: resolvedFlows,
    },
  };
}

function resolveSteps(
  steps: readonly FlowStep[],
  refs: ReadonlyMap<FlowStep, { from: string; to: string }>,
  index: ReturnType<typeof createArchIndex>,
  diagnostics: DslDiagnostic[],
): FlowStep[] {
  return steps.map((step) => {
    const raw = refs.get(step);
    let from: string | undefined;
    let to: string | undefined;
    if (raw) {
      const fromElement = resolveElementRef(index, raw.from, null);
      const toElement = resolveElementRef(index, raw.to, null);
      if (!fromElement || !toElement) {
        diagnostics.push(lineDiagnostic(step.line ?? 1, 'W122', 'warning', `Unknown flow reference ${!fromElement ? raw.from : raw.to}; step kept without a relation`));
      } else {
        from = fromElement.id;
        to = toElement.id;
      }
    }
    const { from: _rawFrom, to: _rawTo, ...rest } = step;
    return {
      ...rest,
      ...(from && to ? { from, to } : {}),
      ...(step.branches ? { branches: step.branches.map((branch) => ({ ...branch, steps: resolveSteps(branch.steps, refs, index, diagnostics) })) } : {}),
    };
  });
}
