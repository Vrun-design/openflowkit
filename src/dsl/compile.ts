import type { SceneConnector, SceneNode } from '../opencanvas/domain/document/types';
import type { Point2d, Size2d } from '../opencanvas/domain/geometry/types';
import type { DslAttribute, DslDiagnostic, DslDirection, DslEdge, DslReference, DslStatement } from './ast';
import type { Side } from './vocabulary';
import { deterministicLayout, type LayoutNodeInput, type LayoutPort } from './layout';
import { ACTOR_CONTENT_LAYOUT, measureGroupSize, measureNodeSize } from './sizing';
import { parse } from './parse';
import { attrsToJson, type CanonicalAttribute } from './sceneMeta';
import {
  ATTRIBUTE_KEYS, COLOR_WORDS, DIRECTIONS, DSL_FAMILY_DIRECTION, EDGE_FLAG_WORDS,
  FILL_WORDS, SHAPE_WORDS, SIDE_WORDS, attributeSlot, canonicalColorWord, canonicalShapeWord,
  dslShapeWord, isHexColor, isIconWord, nodeAppearance, sortAttributes,
} from './vocabulary';

export interface CompileOptions {
  origin?: Point2d;
  layout?: LayoutPort;
  signal?: AbortSignal;
  measureLabel?: (label: string, kind: string) => Size2d;
  resolveIcon?: (id: string) => { packId: string; shapeId: string } | null;
}

export interface CompileMeta {
  family: string;
  direction?: string;
  version: number;
  source: string;
  hash: string;
  title?: string;
}

export interface CompileResult {
  frame: SceneNode;
  nodes: SceneNode[];
  connectors: SceneConnector[];
  groups: SceneNode[];
  diagnostics: DslDiagnostic[];
  meta: CompileMeta;
}

const FRAME_PADDING = { top: 28, right: 28, bottom: 28, left: 28 };
const FRAME_TITLE_PADDING = { top: 72, right: 28, bottom: 28, left: 28 };
const GROUP_PADDING = { top: 54, right: 22, bottom: 22, left: 22 };

/** Attributes kept in `metadata.dsl.attrs` because no scene property holds them. */
const NON_VISUAL_KEYS = new Set(['tech', 'desc', 'kind', 'tags', 'link', 'pin', 'rank', 'width', 'height', 'order']);

const RESERVED_SHAPE: Readonly<Record<string, string>> = {
  person: 'person', store: 'cylinder', queue: 'queue', component: 'component',
  system: 'rect', container: 'rect', external: 'rect', node: 'rect', instance: 'rect',
};

export function slugifyDslId(label: string): string {
  return label.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'n';
}

export function hashDslScene(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

interface TypedAttributes {
  entries: CanonicalAttribute[];
  shape?: string;
  color?: string;
  fill: 'pastel' | 'bold' | 'outline';
  icon?: string;
  flags: Set<string>;
  head: string;
  tail: string;
  from?: Side;
  to?: Side;
  label?: string;
  pin?: Point2d;
  width?: number;
  height?: number;
}

function diagnostic(at: { line: number; col: number; endCol: number }, code: DslDiagnostic['code'], severity: DslDiagnostic['severity'], message: string, hint?: string): DslDiagnostic {
  return { code, severity, line: at.line, col: at.col, endCol: at.endCol, message, hint, source: 'parse' };
}

function finite(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Canonicalises an attribute list: alias folding, default removal, slot dedupe (last wins). */
function canonicalizeAttributes(attributes: readonly DslAttribute[], diagnostics: DslDiagnostic[]): CanonicalAttribute[] {
  const slots = new Map<string, CanonicalAttribute>();
  for (const attribute of attributes) {
    const key = attribute.key?.trim().toLowerCase();
    const value = attribute.value.trim();
    if (!key && !value) continue;
    const where = { line: attribute.line, col: attribute.col, endCol: attribute.endCol };
    if (key) {
      if (!ATTRIBUTE_KEYS.has(key)) diagnostics.push(diagnostic(where, 'W131', 'warning', `Unknown attribute key ${key}; kept verbatim`));
      slots.set(`key:${key}`, { key, value });
      continue;
    }
    const lower = value.toLowerCase();
    const shape = canonicalShapeWord(value);
    const color = canonicalColorWord(value);
    let entry: CanonicalAttribute;
    if (shape) entry = { value: shape };
    else if (color) entry = { value: color };
    else if (isHexColor(value)) entry = { value: lower };
    else if (FILL_WORDS.has(lower) || lower === 'shadow' || lower === 'dashed' || lower === 'thick' || lower === 'invisible' || lower === 'flow' || DIRECTIONS[lower]) entry = { value: lower };
    else if (isIconWord(value)) entry = { value };
    else {
      diagnostics.push(diagnostic(where, 'W131', 'warning', `Unknown attribute ${value}; kept verbatim`));
      entry = { value };
    }
    const slot = attributeSlot(entry);
    if (slots.has(slot)) diagnostics.push(diagnostic(where, 'W130', 'warning', `Two ${slot.replace(/^(?:key|flag|word):/, '')} attributes; last wins`));
    slots.set(slot, entry);
  }
  return sortAttributes([...slots.values()]);
}

/** Resolves the typed view of a canonical attribute list; recomputed after any merge. */
function typedFrom(entries: readonly CanonicalAttribute[]): TypedAttributes {
  const slot = (name: string): string | undefined => entries.find((entry) => (name.startsWith('key:') ? entry.key === name.slice(4) : attributeSlot(entry) === name))?.value;
  const pinParts = slot('key:pin')?.split(/\s*,\s*/).map(Number);
  const head = slot('key:head')?.toLowerCase();
  const tail = slot('key:tail')?.toLowerCase();
  const from = slot('key:from')?.toLowerCase();
  const to = slot('key:to')?.toLowerCase();
  const shape = slot('shape');
  const color = slot('color');
  const fill = slot('fill')?.toLowerCase();
  return {
    entries: [...entries],
    ...(shape ? { shape } : {}),
    ...(color ? { color: color.toLowerCase() } : {}),
    fill: FILL_WORDS.has(fill ?? '') ? fill as TypedAttributes['fill'] : 'pastel',
    ...(slot('icon') ? { icon: slot('icon')! } : {}),
    flags: new Set(entries.filter((entry) => !entry.key && (EDGE_FLAG_WORDS.has(entry.value) || entry.value === 'shadow')).map((entry) => entry.value)),
    head: head && ['arrow', 'circle', 'cross', 'none'].includes(head) ? head : 'arrow',
    tail: tail && ['arrow', 'circle', 'cross', 'none'].includes(tail) ? tail : 'none',
    ...(from && SIDE_WORDS[from] ? { from: SIDE_WORDS[from]! } : {}),
    ...(to && SIDE_WORDS[to] ? { to: SIDE_WORDS[to]! } : {}),
    ...(slot('key:label') ? { label: slot('key:label')! } : {}),
    ...(pinParts && pinParts.length === 2 && pinParts.every(Number.isFinite) ? { pin: { x: pinParts[0]!, y: pinParts[1]! } } : {}),
    ...(finite(slot('key:width')) !== undefined ? { width: finite(slot('key:width'))! } : {}),
    ...(finite(slot('key:height')) !== undefined ? { height: finite(slot('key:height'))! } : {}),
  };
}

/** Attributes the serializer re-emits from metadata because no scene property holds them. */
function nonVisualAttributes(typed: TypedAttributes, context: 'node' | 'edge'): CanonicalAttribute[] {
  return typed.entries.filter((entry) => {
    if (entry.key) return NON_VISUAL_KEYS.has(entry.key) || !ATTRIBUTE_KEYS.has(entry.key);
    if (canonicalShapeWord(entry.value) || canonicalColorWord(entry.value) || isHexColor(entry.value)) return false;
    if (FILL_WORDS.has(entry.value) || entry.value === 'shadow' || entry.value === 'dashed' || entry.value === 'thick' || entry.value === 'invisible') return false;
    if (context === 'edge' && entry.value === 'flow') return true;
    if (DIRECTIONS[entry.value] && !isIconWord(entry.value)) return false;
    if (isIconWord(entry.value)) return false;
    return true;
  });
}

interface GroupDraft {
  id: string;
  label: string;
  parentId: string | null;
  line: number;
  entries: CanonicalAttribute[];
  reservedKind?: string;
  comments: string[];
}

interface NodeDraft {
  id: string;
  name: string;
  parentId: string | null;
  line: number;
  entries: CanonicalAttribute[];
  reservedKind?: string;
  comments: string[];
}

interface EdgeDraft {
  sourceId: string;
  targetId: string;
  arrow: DslEdge['arrow'];
  label?: string;
  line: number;
  entries: CanonicalAttribute[];
  comments: string[];
}

/** Compiles DSL into frame-scoped canonical scene records. */
export async function compile(text: string, options: CompileOptions = {}): Promise<CompileResult> {
  const diagram = parse(text);
  const diagnostics = [...diagram.diagnostics];
  const origin = options.origin ?? { x: 0, y: 0 };
  const frameId = `dsl-${hashDslScene(text)}`;
  const layerId = 'default';
  const used = new Set<string>();
  const uniqueId = (wanted: string) => {
    const base = wanted || 'n';
    let id = base;
    let suffix = 2;
    while (used.has(id)) id = `${base}-${suffix++}`;
    used.add(id);
    return id;
  };

  const pendingComments = [...diagram.comments].sort((a, b) => a.line - b.line);
  const claimComments = (before: number): string[] => {
    const claimed: string[] = [];
    while (pendingComments.length > 0 && pendingComments[0]!.line < before) claimed.push(pendingComments.shift()!.text);
    return claimed;
  };

  const groups: GroupDraft[] = [];
  const nodes: NodeDraft[] = [];
  const edges: EdgeDraft[] = [];
  const reserved: string[] = [];
  const alignLines: string[] = [];
  const directives: Array<{ line: number; name: string; value: string; raw: string }> = [];
  const byExplicitId = new Map<string, NodeDraft>();
  const byName = new Map<string, NodeDraft>();

  const mergeAttributes = (target: CanonicalAttribute[], extra: CanonicalAttribute[]) => {
    for (const entry of extra) {
      if (!target.some((candidate) => attributeSlot(candidate) === attributeSlot(entry))) target.push(entry);
    }
  };

  const declare = (
    reference: DslReference, parentId: string | null, line: number,
    reservedKind: string | undefined, at: { line: number; col: number; endCol: number }, warnOnMove = false,
  ): NodeDraft => {
    const existing = reference.id ? byExplicitId.get(reference.id) : byName.get(reference.label);
    if (existing) {
      mergeAttributes(existing.entries, canonicalizeAttributes(reference.attributes, diagnostics));
      if (warnOnMove && parentId !== null && existing.parentId !== null && existing.parentId !== parentId) {
        diagnostics.push(diagnostic(at, 'W121', 'warning', `${existing.name} is already inside another group; membership unchanged`));
      }
      return existing;
    }
    const id = uniqueId(reference.id ?? slugifyDslId(reference.label));
    const entries = canonicalizeAttributes(reference.attributes, diagnostics);
    const draft: NodeDraft = {
      id, name: reference.label, parentId, line, entries,
      ...(reservedKind ? { reservedKind } : {}), comments: [],
    };
    nodes.push(draft);
    byExplicitId.set(id, draft);
    byName.set(reference.label, draft);
    return draft;
  };

  const walk = (statements: readonly DslStatement[], parentId: string | null) => {
    for (const statement of statements) {
      const claimed = claimComments(statement.line);
      if (statement.kind === 'group') {
        const id = uniqueId(statement.group.id ?? slugifyDslId(statement.group.label));
        groups.push({
          id, label: statement.group.label, parentId, line: statement.line,
          entries: canonicalizeAttributes(statement.group.attributes, diagnostics),
          ...(statement.reservedKind ? { reservedKind: statement.reservedKind } : {}), comments: claimed,
        });
        walk(statement.statements, id);
      } else if (statement.kind === 'node') {
        const draft = declare(statement.node, parentId, statement.line, statement.reservedKind, statement, true);
        if (draft.line === statement.line) draft.comments.push(...claimed);
      } else if (statement.kind === 'edge') {
        const entries = canonicalizeAttributes(statement.attributes, diagnostics);
        const from = declare(statement.from, parentId, statement.line, undefined, statement);
        const to = declare(statement.to, parentId, statement.line, undefined, statement);
        const label = typedFrom(entries).label ?? statement.label;
        edges.push({
          sourceId: from.id, targetId: to.id, arrow: statement.arrow,
          ...(label ? { label } : {}), line: statement.line, entries, comments: claimed,
        });
      } else if (statement.kind === 'directive') {
        directives.push({ line: statement.line, name: statement.name, value: statement.value, raw: statement.raw });
      } else {
        reserved.push(statement.raw);
        if (statement.statements) walk(statement.statements, parentId);
      }
    }
  };
  walk(diagram.statements, null);

  const title = directives.find((item) => item.name === 'title')?.value;
  const directionDirective = directives.find((item) => item.name === 'direction')?.value.toLowerCase();
  const authoredDirection = diagram.direction ?? (directionDirective ? DIRECTIONS[directionDirective] : undefined);
  for (const directive of directives) {
    if (directive.name === 'title' || directive.name === 'direction' || directive.name === 'note') continue;
    if (directive.name === 'align') alignLines.push(directive.raw);
    else reserved.push(directive.raw);
  }
  const direction: DslDirection = authoredDirection ?? DSL_FAMILY_DIRECTION[diagram.family] ?? 'down';

  const frameParent = (parentId: string | null) => parentId ?? frameId;
  const groupsById = new Map(groups.map((group) => [group.id, group]));

  const groupNodes: SceneNode[] = groups.map((group, index) => {
    const groupTyped = typedFrom(group.entries);
    const palette = groupTyped.color ? COLOR_WORDS[groupTyped.color]?.key : undefined;
    const custom = groupTyped.color && isHexColor(groupTyped.color) ? groupTyped.color : undefined;
    return {
      id: group.id, kind: 'frame', parentId: frameParent(group.parentId), layerId, zIndex: index + 1,
      transform: { translation: { ...origin }, rotationRadians: 0, scale: { x: 1, y: 1 } },
      size: { width: 240, height: 160 },
      content: {
        label: group.label,
        ...(custom ? { color: 'custom', customColor: custom } : palette ? { color: palette } : {}),
        ...(groupTyped.fill === 'bold' ? { colorMode: 'filled' } : {}),
      },
      appearance: {}, ports: [],
      metadata: {
        dsl: {
          id: group.id, line: group.line,
          ...(group.reservedKind ? { kind: group.reservedKind } : {}),
          ...(nonVisualAttributes(groupTyped, 'node').length ? { attrs: attrsToJson(nonVisualAttributes(groupTyped, 'node')) } : {}),
          ...(group.comments.length ? { comments: group.comments } : {}),
        },
      },
      extensions: {},
    };
  });

  const measure = options.measureLabel;
  const noteDrafts: Array<{ id: string; targetId: string; text: string; line: number }> = [];
  const sceneNodes: SceneNode[] = nodes.map((node, index) => {
    const typed = typedFrom(node.entries);
    const canonicalWord = canonicalShapeWord(typed.shape ?? RESERVED_SHAPE[node.reservedKind ?? ''] ?? 'rect') ?? 'rect';
    const spec = SHAPE_WORDS[canonicalWord]!;
    const icon = typed.icon;
    const resolvedIcon = icon && options.resolveIcon ? options.resolveIcon(icon) : null;
    if (icon && options.resolveIcon && !resolvedIcon) {
      diagnostics.push({ code: 'W132', severity: 'warning', line: node.line, col: 1, endCol: 1, message: `Unknown icon ${icon}; plain node used`, source: 'parse' });
    }
    const isIconCard = Boolean(icon && (!options.resolveIcon || resolvedIcon));
    const kind = isIconCard ? 'architecture' : spec.kind;
    const label = typed.label ?? node.name;
    const desc = typed.entries.find((entry) => entry.key === 'desc')?.value;
    const size = measure
      ? measure(label, kind)
      : measureNodeSize({
        kind, label, ...(desc ? { subLabel: desc } : {}), hasIcon: isIconCard, spec,
        ...(typed.width !== undefined ? { width: typed.width } : {}),
        ...(typed.height !== undefined ? { height: typed.height } : {}),
      });
    const palette = typed.color && !isHexColor(typed.color) ? COLOR_WORDS[typed.color]?.key : undefined;
    const custom = typed.color && isHexColor(typed.color) ? typed.color : undefined;
    const lossyShape = isLossyShape(canonicalWord, kind);
    const sticky = kind === 'sticky';
    return {
      id: node.id, kind, parentId: frameParent(node.parentId), layerId, zIndex: groups.length + index + 1,
      transform: { translation: { ...origin }, rotationRadians: 0, scale: { x: 1, y: 1 } },
      size,
      content: {
        label,
        ...(!isIconCard && !sticky && spec.shape ? { shape: spec.shape } : {}),
        ...(spec.shape === 'actor' ? { contentLayout: ACTOR_CONTENT_LAYOUT } : {}),
        ...(desc ? { subLabel: desc } : {}),
        ...(sticky ? { color: palette ?? 'yellow' } : {}),
        // Architecture cards and containers resolve their palette from content keys.
        ...(isIconCard ? {
          ...(custom ? { color: 'custom', customColor: custom } : palette ? { color: palette } : {}),
          ...(typed.fill === 'bold' ? { colorMode: 'filled' } : {}),
        } : {}),
        ...(isIconCard && icon ? {
          icon, archProvider: iconProvider(icon), archResourceType: iconResource(icon),
          ...(resolvedIcon ? { archIconPackId: resolvedIcon.packId, archIconShapeId: resolvedIcon.shapeId } : {}),
          assetPresentation: 'icon',
        } : {}),
        ...(node.reservedKind ? { modelKind: node.reservedKind } : {}),
      },
      appearance: isIconCard || sticky
        ? {}
        : { ...nodeAppearance(typed.color, typed.fill, typed.flags.has('shadow')), ...(spec.shape === 'actor' ? { textVerticalAlign: 'bottom', textPadding: 10 } : {}) },
      ports: [],
      metadata: {
        dsl: {
          id: node.id, line: node.line,
          ...(label !== node.name ? { name: node.name } : {}),
          ...(lossyShape ? { shape: canonicalWord } : {}),
          ...(typed.color ? { color: typed.color } : {}),
          ...(typed.fill !== 'pastel' ? { fill: typed.fill } : {}),
          ...(icon ? { icon } : {}),
          ...(node.reservedKind ? { kind: node.reservedKind } : {}),
          ...(nonVisualAttributes(typed, 'node').length ? { attrs: attrsToJson(nonVisualAttributes(typed, 'node')) } : {}),
          ...(node.comments.length ? { comments: node.comments } : {}),
        },
      },
      extensions: {},
    };
  });

  for (const directive of directives.filter((item) => item.name === 'note')) {
    const separator = directive.value.indexOf(':');
    if (separator < 0) continue;
    const targetName = directive.value.slice(0, separator).trim();
    const noteText = directive.value.slice(separator + 1).trim();
    const target = sceneNodes.find((node) => node.id === slugifyDslId(targetName) || node.content.label === targetName || (node.metadata.dsl as { name?: string }).name === targetName);
    if (!target) {
      diagnostics.push({ code: 'W101', severity: 'warning', line: directive.line, col: 1, endCol: 1, message: `note target ${targetName} was not found; note dropped`, source: 'parse' });
      continue;
    }
    const id = uniqueId(`${target.id}-note`);
    noteDrafts.push({ id, targetId: target.id, text: noteText, line: directive.line });
    sceneNodes.push({
      id, kind: 'sticky', parentId: target.parentId, layerId, zIndex: 0,
      transform: { translation: { x: 0, y: 0 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
      size: measureNodeSize({ kind: 'sticky', label: noteText, hasIcon: false, spec: SHAPE_WORDS.note! }),
      content: { label: noteText, subLabel: '', color: 'yellow' }, appearance: {}, ports: [],
      metadata: { dsl: { id, line: directive.line, noteFor: target.id } }, extensions: {},
    });
  }

  const duplicates = new Map<string, number>();
  const pairTotals = new Map<string, number>();
  for (const edge of edges) {
    const pair = `${edge.sourceId}->${edge.targetId}`;
    pairTotals.set(pair, (pairTotals.get(pair) ?? 0) + 1);
  }
  const connectors: SceneConnector[] = edges.map((edge) => {
    const pair = `${edge.sourceId}->${edge.targetId}`;
    const occurrence = (duplicates.get(pair) ?? 0) + 1;
    duplicates.set(pair, occurrence);
    const total = pairTotals.get(pair) ?? 1;
    const typed = typedFrom(edge.entries);
    const head = edge.arrow === '--' ? 'none' : typed.head;
    const tail = edge.arrow === '--' ? 'none' : typed.tail;
    const dashed = edge.arrow === '-->' || edge.arrow === '<-->' || typed.flags.has('dashed');
    const tailArrow = edge.arrow === '<->' || edge.arrow === '<-->' || tail === 'arrow';
    return {
      id: `edge:${pair}:${occurrence}`,
      source: endpoint(edge.sourceId, typed.from),
      target: endpoint(edge.targetId, typed.to),
      route: { kind: 'orthogonal', ownership: 'automatic' }, waypoints: [],
      labels: edge.label ? [{ id: `${pair}:${occurrence}:label`, text: edge.label, pathRatio: occurrence / (total + 1), offset: { x: 0, y: 0 }, metadata: {} }] : [],
      appearance: {
        ...(dashed ? { dashPattern: 'dashed' } : {}),
        ...(tailArrow ? { markerStart: marker(tail) } : {}),
        ...(head !== 'none' ? { markerEnd: marker(head) } : {}),
        ...(typed.flags.has('thick') ? { strokeWidth: 2.5 } : {}),
        ...(typed.flags.has('invisible') ? { opacity: 0 } : {}),
      },
      semantics: {},
      metadata: {
        dsl: {
          line: edge.line,
          ...(nonVisualAttributes(typed, 'edge').length ? { attrs: attrsToJson(nonVisualAttributes(typed, 'edge')) } : {}),
          ...(edge.comments.length ? { comments: edge.comments } : {}),
        },
      },
      extensions: {},
    };
  });

  // ponytail: `rank:` and `group [direction]` round-trip but do not constrain ELK yet — wire them to layer options when a family needs them.
  const layoutNodes: LayoutNodeInput[] = [
    ...groupNodes.map((group) => {
      const draft = groupsById.get(group.id)!;
      const hint = draft.entries.find((entry) => !entry.key && DIRECTIONS[entry.value]);
      return {
        id: group.id, parentId: group.parentId === frameId ? null : group.parentId,
        size: group.size, minSize: measureGroupSize(draft.label, false),
        ...(hint ? { direction: DIRECTIONS[hint.value]! } : {}),
      } satisfies LayoutNodeInput;
    }),
    ...sceneNodes.map((node) => ({
      id: node.id, parentId: node.parentId === frameId ? null : node.parentId, size: node.size,
    } satisfies LayoutNodeInput)),
  ];
  const laid = await (options.layout ?? deterministicLayout).run({
    rootId: frameId,
    rootPadding: title ? FRAME_TITLE_PADDING : FRAME_PADDING,
    groupPadding: GROUP_PADDING,
    nodes: layoutNodes,
    edges: connectors.map((connector) => ({ id: connector.id, sourceId: connector.source.nodeId!, targetId: connector.target.nodeId! })),
    direction,
  }, options.signal);

  const positionedGroups = groupNodes.map((group) => ({
    ...group,
    ...(laid.sizes[group.id] ? { size: laid.sizes[group.id]! } : {}),
    transform: { ...group.transform, translation: laid.positions[group.id] ?? { x: 0, y: 0 } },
  }));
  const positionOf = new Map<string, Point2d>(Object.entries(laid.positions));
  for (const node of sceneNodes) {
    const pin = typedFrom(nodes.find((candidate) => candidate.id === node.id)?.entries ?? []).pin;
    // ponytail: pins are applied after layout, so ELK reserves the unpinned slot — fine for a hint the canvas never writes.
    if (pin) positionOf.set(node.id, pin);
  }
  const noteTextByTarget = new Map<string, string[]>();
  for (const note of noteDrafts) {
    const target = sceneNodes.find((node) => node.id === note.targetId);
    if (!target) continue;
    const noteNode = sceneNodes.find((node) => node.id === note.id);
    const targetPosition = positionOf.get(target.id) ?? { x: 0, y: 0 };
    if (noteNode) positionOf.set(note.id, { x: targetPosition.x + target.size.width + 36, y: targetPosition.y });
    noteTextByTarget.set(note.targetId, [...(noteTextByTarget.get(note.targetId) ?? []), note.text]);
  }
  applyAlignDirectives(directives, positionOf, sceneNodes);
  const positionedNodes = sceneNodes.map((node) => ({
    ...node,
    ...(noteTextByTarget.has(node.id) ? {
      metadata: {
        ...node.metadata,
        dsl: { ...(node.metadata.dsl as Record<string, unknown>), notes: noteTextByTarget.get(node.id) },
      },
    } : {}),
    transform: { ...node.transform, translation: positionOf.get(node.id) ?? { x: 0, y: 0 } },
  }));

  const frameSize = laid.sizes[frameId] ?? { width: 640, height: 420 };
  const meta: CompileMeta = {
    family: diagram.family, version: 1, source: text,
    ...(authoredDirection ? { direction: authoredDirection } : {}),
    ...(title ? { title } : {}),
    hash: hashDslScene(JSON.stringify({ nodes: positionedNodes, groups: positionedGroups, connectors })),
  };
  const frame: SceneNode = {
    id: frameId, kind: 'frame', parentId: null, layerId, zIndex: 0,
    transform: { translation: { ...origin }, rotationRadians: 0, scale: { x: 1, y: 1 } },
    size: frameSize,
    content: { label: title ?? '' },
    appearance: {}, ports: [],
    metadata: {
      dsl: {
        ...meta,
        ...(pendingComments.length ? { comments: pendingComments.map((comment) => comment.text) } : {}),
        ...(alignLines.length ? { align: alignLines } : {}),
        ...(reserved.length ? { reserved } : {}),
      },
    },
    extensions: {},
  };
  return { frame, nodes: positionedNodes, connectors, groups: positionedGroups, diagnostics, meta };
}

/** `align row A, B` / `align column A, B`: one coordinate shared after layout. */
function applyAlignDirectives(
  directives: readonly { name: string; value: string }[],
  positions: Map<string, Point2d>,
  nodes: readonly SceneNode[],
): void {
  for (const directive of directives.filter((item) => item.name === 'align')) {
    const match = /^(row|column)\s+(.+)$/i.exec(directive.value);
    if (!match) continue;
    const names = match[2]!.split(',').map((name) => name.trim().toLowerCase()).filter(Boolean);
    const members = nodes.filter((node) => names.includes(node.id) || names.includes(slugifyDslId(String(node.content.label))));
    if (members.length < 2) continue;
    const row = match[1]!.toLowerCase() === 'row';
    const anchor = positions.get(members[0]!.id) ?? { x: 0, y: 0 };
    for (const node of members) {
      const current = positions.get(node.id) ?? { x: 0, y: 0 };
      positions.set(node.id, row ? { x: current.x, y: anchor.y } : { x: anchor.x, y: current.y });
    }
  }
}

/** Shapes whose DSL word the renderer cannot infer back from the scene shape alone. */
function isLossyShape(word: string, kind: string): boolean {
  const spec = SHAPE_WORDS[word];
  return Boolean(spec) && spec!.kind === kind && dslShapeWord(spec!.kind, spec!.shape) !== word;
}

function endpoint(nodeId: string, side: Side | undefined): SceneConnector['source'] {
  const anchor = side ? { kind: 'side' as const, side, ratio: 0.5 } : null;
  return { nodeId, portId: null, anchor, point: null };
}

function marker(value: string): string {
  return value === 'circle' ? 'circle' : value === 'cross' ? 'cross' : 'arrow';
}

function iconProvider(icon: string): string {
  const [provider] = icon.split(/[/:-]/);
  return provider || 'custom';
}

function iconResource(icon: string): string {
  const [, ...rest] = icon.split(/[/:-]/);
  return rest.join('-') || icon;
}
