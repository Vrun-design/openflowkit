import type { SceneConnector, SceneNode } from '../../../opencanvas/domain/document/types';
import type { Point2d } from '../../../opencanvas/domain/geometry/types';
import type { DslDirection, DslReference, DslStatement } from '../../ast';
import { diagnostic } from '../../diagnostics';
import {
  canonicalizeAttributes, nonVisualAttributes, typedFrom, type TypedAttributes,
} from '../../attributes';
import { AUTO_ICON_SHAPES } from '../../autoIcon';
import type { FamilyContext, FamilyScene } from '../types';
import { attrsToJson, type CanonicalAttribute } from '../../sceneMeta';
import { ACTOR_CONTENT_LAYOUT, measureGroupSize, measureNodeSize } from '../../sizing';
import { slugifyDslId } from '../../text';
import type { LayoutNodeInput } from '../../layout';
import {
  COLOR_WORDS, DIRECTIONS, SHAPE_WORDS, attributeSlot,
  canonicalShapeWord, dslShapeWord, isHexColor, nodeAppearance,
} from '../../vocabulary';

export interface GraphInput {
  readonly statements: readonly DslStatement[];
  readonly family: string;
  /** Authored direction; effective direction arrives on the context. */
  readonly authoredDirection?: DslDirection;
  readonly title?: string;
}

const FRAME_PADDING = { top: 28, right: 28, bottom: 28, left: 28 };
const FRAME_TITLE_PADDING = { top: 72, right: 28, bottom: 28, left: 28 };
const GROUP_PADDING = { top: 54, right: 22, bottom: 22, left: 22 };

const RESERVED_SHAPE: Readonly<Record<string, string>> = {
  person: 'person', store: 'cylinder', queue: 'queue', component: 'component',
  system: 'rect', container: 'rect', external: 'rect', node: 'rect', instance: 'rect',
};

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
  arrow: '->' | '-->' | '<->' | '<-->' | '--';
  label?: string;
  line: number;
  entries: CanonicalAttribute[];
  comments: string[];
}

/** The graph family engine: flowchart, architecture and state share every line of it. */
export async function compileGraph(input: GraphInput, context: FamilyContext): Promise<FamilyScene> {
  const { diagnostics, origin } = context;
  const used = new Set<string>();
  const uniqueId = (wanted: string) => {
    const base = wanted || 'n';
    let id = base;
    let suffix = 2;
    while (used.has(id)) id = `${base}-${suffix++}`;
    used.add(id);
    return id;
  };


  const groups: GroupDraft[] = [];
  const nodes: NodeDraft[] = [];
  const edges: EdgeDraft[] = [];
  const reserved: string[] = [];
  const alignLines: string[] = [];
  const notes: Array<{ line: number; target: string; text: string }> = [];
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
    // Resolve by explicit id, by that id written bare, then by label.
    const existing = (reference.id ? byExplicitId.get(reference.id) : undefined)
      ?? byExplicitId.get(reference.label)
      ?? byName.get(reference.label);
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
      const claimed = context.comments.claim(statement.line);
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
        if (statement.name === 'note') notes.push({ line: statement.line, target: '', text: statement.value });
        else if (statement.name === 'align') alignLines.push(statement.raw);
        else reserved.push(statement.raw);
      } else {
        reserved.push(statement.raw);
        if (statement.statements) walk(statement.statements, parentId);
      }
    }
  };
  walk(input.statements, null);

  const groupsById = new Map(groups.map((group) => [group.id, group]));

  const groupNodes: SceneNode[] = groups.map((group, index) => {
    const groupTyped = typedFrom(group.entries);
    const palette = groupTyped.color ? COLOR_WORDS[groupTyped.color]?.key : undefined;
    const custom = groupTyped.color && isHexColor(groupTyped.color) ? groupTyped.color : undefined;
    return {
      id: group.id, kind: 'frame', parentId: group.parentId, layerId: 'default', zIndex: index + 1,
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

  const noteDrafts: Array<{ id: string; targetId: string; text: string; line: number }> = [];
  const sceneNodes: SceneNode[] = nodes.map((node, index) => {
    const typed = typedFrom(node.entries);
    const canonicalWord = canonicalShapeWord(typed.shape ?? RESERVED_SHAPE[node.reservedKind ?? ''] ?? 'rect') ?? 'rect';
    const spec = SHAPE_WORDS[canonicalWord]!;
    const label = typed.label ?? node.name;
    const desc = typed.entries.find((entry) => entry.key === 'desc')?.value;
    // `icon: none` opts a node out; otherwise a box-like node may take the icon its label names.
    const authoredIcon = typed.icon === 'none' ? undefined : typed.icon;
    const autoIcon = !typed.icon && AUTO_ICON_SHAPES.has(canonicalWord) && context.inferIcon
      ? context.inferIcon(label, typed.entries.find((entry) => entry.key === 'tech')?.value) ?? undefined
      : undefined;
    const icon = authoredIcon ?? autoIcon;
    const resolvedIcon = icon && context.resolveIcon ? context.resolveIcon(icon) : null;
    if (authoredIcon && context.resolveIcon && !resolvedIcon) {
      diagnostics.push(diagnostic({ line: node.line, col: 1, endCol: 1 }, 'W132', 'warning', `Unknown icon ${authoredIcon}; plain node used`));
    }
    const isIconCard = Boolean(icon && (!context.resolveIcon || resolvedIcon));
    const kind = isIconCard ? 'architecture' : spec.kind;
    const size = context.measureLabel
      ? context.measureLabel(label, kind)
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
      id: node.id, kind, parentId: node.parentId, layerId: 'default', zIndex: groups.length + index + 1,
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
        : { ...nodeAppearance(typed.color, typed.fill, typed.flags.has('shadow'), context.swatch), ...(spec.shape === 'actor' ? { textVerticalAlign: 'bottom', textPadding: 10 } : {}) },
      ports: [],
      metadata: {
        dsl: {
          id: node.id, line: node.line,
          ...(label !== node.name ? { name: node.name } : {}),
          // An icon card has no shape of its own; remember the authored one.
          ...(lossyShape || (isIconCard && canonicalWord !== 'rect') ? { shape: canonicalWord } : {}),
          ...(typed.color ? { color: typed.color } : {}),
          ...(typed.fill !== 'pastel' ? { fill: typed.fill } : {}),
          ...(typed.icon ? { icon: typed.icon } : {}),
          ...(autoIcon ? { autoIcon } : {}),
          ...(node.reservedKind ? { kind: node.reservedKind } : {}),
          ...(nonVisualAttributes(typed, 'node').length ? { attrs: attrsToJson(nonVisualAttributes(typed, 'node')) } : {}),
          ...(node.comments.length ? { comments: node.comments } : {}),
        },
      },
      extensions: {},
    };
  });

  for (const note of notes) {
    const separator = note.text.indexOf(':');
    if (separator < 0) continue;
    const targetName = note.text.slice(0, separator).trim();
    const noteText = note.text.slice(separator + 1).trim();
    const target = sceneNodes.find((node) => node.id === slugifyDslId(targetName) || node.content.label === targetName || (node.metadata.dsl as { name?: string }).name === targetName);
    if (!target) {
      diagnostics.push(diagnostic({ line: note.line, col: 1, endCol: 1 }, 'W101', 'warning', `note target ${targetName} was not found; note dropped`));
      continue;
    }
    const id = uniqueId(`${target.id}-note`);
    noteDrafts.push({ id, targetId: target.id, text: noteText, line: note.line });
    sceneNodes.push({
      id, kind: 'sticky', parentId: target.parentId, layerId: 'default', zIndex: 0,
      transform: { translation: { x: 0, y: 0 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
      size: measureNodeSize({ kind: 'sticky', label: noteText, hasIcon: false, spec: SHAPE_WORDS.note! }),
      content: { label: noteText, subLabel: '', color: 'yellow' }, appearance: {}, ports: [],
      metadata: { dsl: { id, line: note.line, noteFor: target.id } }, extensions: {},
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
    // `--` means a bare line, unless the author named a marker on it:
    // `A -- B [head: diamond]` is a line with a diamond at the target.
    const anchored = (key: 'head' | 'tail', value: string): string =>
      edge.arrow === '--' && !edge.entries.some((entry) => entry.key === key) ? 'none' : value;
    const head = anchored('head', typed.head);
    const tail = anchored('tail', typed.tail);
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
        id: group.id, parentId: group.parentId, size: group.size,
        minSize: measureGroupSize(draft.label, false),
        ...(hint ? { direction: DIRECTIONS[hint.value]! } : {}),
      } satisfies LayoutNodeInput;
    }),
    ...sceneNodes.map((node) => ({ id: node.id, parentId: node.parentId, size: node.size } satisfies LayoutNodeInput)),
  ];
  const laid = await context.layout({
    nodes: layoutNodes,
    edges: connectors.map((connector) => ({ id: connector.id, sourceId: connector.source.nodeId!, targetId: connector.target.nodeId! })),
    direction: context.direction,
    rootPadding: input.title ? FRAME_TITLE_PADDING : FRAME_PADDING,
    groupPadding: GROUP_PADDING,
  }, context.signal);

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
  applyAlignDirectives(alignLines, positionOf, sceneNodes);
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

  return {
    // Containers first keeps the deterministic order the editor hashes.
    nodes: [...positionedGroups, ...positionedNodes],
    connectors,
    size: laid.root.width > 0 && laid.root.height > 0 ? laid.root : { width: 640, height: 420 },
    meta: {
      ...(alignLines.length ? { align: alignLines } : {}),
      ...(reserved.length ? { reserved } : {}),
    },
  };
}

/** `align row A, B` / `align column A, B`: one coordinate shared after layout. */
function applyAlignDirectives(
  alignLines: readonly string[],
  positions: Map<string, Point2d>,
  nodes: readonly SceneNode[],
): void {
  for (const line of alignLines) {
    const match = /^align\s+(row|column)\s+(.+)$/i.exec(line);
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

function endpoint(nodeId: string, side: TypedAttributes['from']): SceneConnector['source'] {
  const anchor = side ? { kind: 'side' as const, side, ratio: 0.5 } : null;
  return { nodeId, portId: null, anchor, point: null };
}

function marker(value: string): string {
  if (value === 'circle') return 'circle';
  if (value === 'cross') return 'cross';
  if (value === 'diamond') return 'diamond-open';
  return 'arrow';
}

function iconProvider(icon: string): string {
  const [provider] = icon.split(/[/:-]/);
  return provider || 'custom';
}

function iconResource(icon: string): string {
  const [, ...rest] = icon.split(/[/:-]/);
  return rest.join('-') || icon;
}
