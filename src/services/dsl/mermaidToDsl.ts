import type { DslDiagnostic } from '../../dsl/ast';
import { slugifyDslId } from '../../dsl/text';
import { detectMermaidDiagramType } from '../mermaid/detectDiagramType';
import { parseMermaidByType } from '../mermaid/parseMermaidByType';

// Mermaid → OFK DSL. The existing per-family parsers (DOM-free, corpus-tested)
// produce the graph model; this adapter turns that model back into text. Losses
// are reported as W180 diagnostics so the code panel lists them like any other.

export interface MermaidConversion {
  dsl: string;
  /** One line per construct the DSL cannot express. */
  losses: string[];
  diagnostics: DslDiagnostic[];
}

export interface MermaidConversionError {
  error: string;
}

/** Structural view of the mermaid services' graph model (no runtime dependency). */
interface FlowNodeStyle {
  width?: number;
  height?: number;
  backgroundColor?: string;
  borderColor?: string;
  strokeDasharray?: string;
  strokeWidth?: number;
}

interface FlowNodeData {
  label?: string;
  subLabel?: string;
  shape?: string;
  color?: string;
  seqParticipantKind?: string;
  seqParticipantAlias?: string;
  seqNoteTarget?: string;
  seqNoteTargets?: string[];
  seqNotePosition?: string;
  seqMessageOrder?: number;
  seqFragment?: { type?: string; condition?: string; branchKind?: string };
  erFields?: unknown;
  classStereotype?: string;
  classAttributes?: string[];
  classMethods?: string[];
  stateControlKind?: string;
  mindmapDepth?: number;
  mindmapParentId?: string;
  archTitle?: string;
  archProvider?: string;
  archResourceType?: string;
}

interface FlowNode {
  id: string;
  type?: string;
  parentId?: string;
  data?: FlowNodeData;
  style?: FlowNodeStyle;
}

interface FlowEdgeData {
  seqMessageKind?: string;
  seqMessageOrder?: number;
  seqFragment?: { type?: string; condition?: string; branchKind?: string };
  erRelation?: string;
  archSourceSide?: string;
  archTargetSide?: string;
  classRelation?: string;
  classRelationSourceCardinality?: string;
  classRelationTargetCardinality?: string;
}

interface FlowEdge {
  source: string;
  target: string;
  label?: string;
  markerStart?: unknown;
  markerEnd?: unknown;
  style?: { stroke?: string; strokeDasharray?: string; strokeWidth?: number };
  data?: FlowEdgeData;
}

const SHAPE_WORDS: Readonly<Record<string, string>> = {
  rectangle: 'rect', rounded: 'rounded', capsule: 'rounded', circle: 'circle', ellipse: 'ellipse',
  diamond: 'diamond', hexagon: 'hexagon', parallelogram: 'parallelogram', cylinder: 'cylinder',
  cloud: 'cloud', document: 'doc', queue: 'queue', database: 'cylinder', actor: 'person',
};

const DIRECTION_WORDS: Readonly<Record<string, string>> = { TB: 'down', TD: 'down', LR: 'right', RL: 'left', BT: 'up' };

function quote(value: string): string {
  return /(?:->|-->|<->|:|=|,|\[|\]|\{|\}|\/\/|;)/.test(value) || value.trim() !== value
    ? `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`
    : value;
}

/** DSL-canonical reference: slug ids, `id = Label` only when the slug differs. */
function nodeName(node: FlowNode): string {
  const id = slugifyDslId(node.id) || 'n';
  const label = node.data?.label ?? node.id;
  if (!label) return id;
  return slugifyDslId(label) === id ? quote(label) : `${id} = ${quote(label)}`;
}

function shapeAttribute(node: FlowNode): string | undefined {
  const shape = typeof node.data?.shape === 'string' ? SHAPE_WORDS[node.data.shape] : undefined;
  return shape && shape !== 'rect' ? shape : undefined;
}

function styleColor(node: FlowNode): string | undefined {
  const background = node.style?.backgroundColor;
  return typeof background === 'string' && background.startsWith('#') ? background.toLowerCase() : undefined;
}

function nodeAttributes(node: FlowNode): string[] {
  const attrs: string[] = [];
  const shape = shapeAttribute(node);
  if (shape) attrs.push(shape);
  const color = styleColor(node);
  if (color) attrs.push(color);
  const subLabel = typeof node.data?.subLabel === 'string' && node.data.subLabel ? node.data.subLabel : undefined;
  if (subLabel) attrs.push(`desc: ${quote(subLabel)}`);
  return attrs;
}

function attrText(attributes: readonly string[]): string {
  return attributes.length ? ` [${attributes.join(', ')}]` : '';
}

function edgeArrow(edge: FlowEdge): string {
  const dashed = typeof edge.style?.strokeDasharray === 'string' && edge.style.strokeDasharray.length > 0;
  const both = Boolean(edge.markerStart);
  if (!edge.markerEnd && !both) return '--';
  if (both) return dashed ? '<-->' : '<->';
  return dashed ? '-->' : '->';
}

const SIDE_WORDS: Readonly<Record<string, string>> = { L: 'left', R: 'right', T: 'top', B: 'bottom' };

function edgeAttributes(edge: FlowEdge): string[] {
  const attrs: string[] = [];
  if (typeof edge.style?.strokeWidth === 'number' && edge.style.strokeWidth > 2) attrs.push('thick');
  if (typeof edge.style?.stroke === 'string' && edge.style.stroke === 'transparent') attrs.push('invisible');
  // Mermaid architecture pins each end to a side (`a:L -- R:b`); the DSL says `from:`/`to:`.
  const from = SIDE_WORDS[String(edge.data?.archSourceSide ?? '').toUpperCase()];
  const to = SIDE_WORDS[String(edge.data?.archTargetSide ?? '').toUpperCase()];
  if (from) attrs.push(`from: ${from}`);
  if (to) attrs.push(`to: ${to}`);
  return attrs;
}

/** Reference form: the id when one was declared, else the label. */
function nodeRef(node: FlowNode): string {
  const id = slugifyDslId(node.id) || 'n';
  const label = node.data?.label ?? node.id;
  return !label || slugifyDslId(label) === id ? quote(label || id) : id;
}

function edgeLine(edge: FlowEdge, nodes: ReadonlyMap<string, FlowNode>, losses: string[]): string | undefined {
  const source = nodes.get(edge.source);
  const target = nodes.get(edge.target);
  if (!source || !target) return undefined;
  const label = typeof edge.label === 'string' && edge.label ? ` : ${quote(edge.label)}` : '';
  if (edge.markerStart && edge.markerEnd) losses.push(`Arrow "${edge.label ?? ''}" has heads on both ends; kept as <->`);
  return `${nodeRef(source)} ${edgeArrow(edge)} ${nodeRef(target)}${label}${attrText(edgeAttributes(edge))}`;
}

function flowchartDsl(nodes: readonly FlowNode[], edges: readonly FlowEdge[], direction: string | undefined): MermaidConversion {
  const losses: string[] = [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const sections = nodes.filter((node) => node.type === 'section');
  const sectionIds = new Set(sections.map((section) => section.id));
  const lines: string[] = ['flowchart' + (direction && DIRECTION_WORDS[direction] ? ` ${DIRECTION_WORDS[direction]}` : '')];
  const emitted = new Set<string>();
  const emitNode = (node: FlowNode, indent: string) => {
    if (emitted.has(node.id)) return;
    emitted.add(node.id);
    const isSection = node.type === 'section';
    const name = isSection ? quote(node.data?.label ?? node.id) : nodeName(node);
    lines.push(`${indent}${isSection ? 'group ' : ''}${name}${attrText(nodeAttributes(node))}${isSection ? ' {' : ''}`);
    if (isSection) {
      for (const child of nodes.filter((candidate) => candidate.parentId === node.id)) emitNode(child, `${indent}  `);
      lines.push(`${indent}}`);
    }
  };
  for (const node of nodes) if (!node.parentId && !sectionIds.has(node.id)) emitNode(node, '');
  for (const section of sections) if (!section.parentId) emitNode(section, '');
  for (const edge of edges) {
    const line = edgeLine(edge, byId, losses);
    if (line) lines.push(line);
  }
  const diagnostics: DslDiagnostic[] = losses.map((message, index) => lossDiagnostic(index + 1, message));
  return { dsl: `${lines.join('\n')}\n`, losses, diagnostics };
}

/**
 * Mermaid `architecture-beta`: groups nest, services keep their icon (`pack:name`
 * → `pack/name`), junctions become small circles. Edge sides ride on `from:`/`to:`.
 */
function architectureDsl(nodes: readonly FlowNode[], edges: readonly FlowEdge[]): MermaidConversion {
  const losses: string[] = [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const kindOf = (node: FlowNode) => node.data?.archResourceType ?? 'service';
  const lines: string[] = ['architecture'];
  const title = nodes.map((node) => node.data?.archTitle).find((value) => typeof value === 'string' && value);
  if (title) lines.push(`title: ${quote(title)}`);
  const childrenOf = (id: string | undefined) => nodes.filter((node) => (node.parentId ?? undefined) === id);
  const attributesFor = (node: FlowNode): string[] => {
    const attrs: string[] = [];
    if (kindOf(node) === 'junction') attrs.push('circle');
    const provider = node.data?.archProvider;
    if (typeof provider === 'string' && provider && provider !== 'custom' && provider !== 'group') {
      attrs.push(`icon: ${provider.replace(':', '/')}`);
    }
    return attrs;
  };
  // `group a in b` / `group b in a` is legal text; emitted once, it cannot loop.
  const emitted = new Set<string>();
  const emit = (node: FlowNode, indent: string) => {
    if (emitted.has(node.id)) return;
    emitted.add(node.id);
    const group = kindOf(node) === 'group';
    lines.push(`${indent}${group ? 'group ' : ''}${nodeName(node)}${attrText(attributesFor(node))}${group ? ' {' : ''}`);
    if (!group) return;
    for (const child of childrenOf(node.id)) emit(child, `${indent}  `);
    lines.push(`${indent}}`);
  };
  for (const node of childrenOf(undefined)) emit(node, '');
  for (const node of nodes) emit(node, '');
  for (const edge of edges) {
    const line = edgeLine(edge, byId, losses);
    if (line) lines.push(line);
  }
  return { dsl: `${lines.join('\n')}\n`, losses, diagnostics: losses.map((message, index) => lossDiagnostic(index + 1, message)) };
}

function sequenceDsl(source: string, nodes: readonly FlowNode[], edges: readonly FlowEdge[]): MermaidConversion {
  const losses: string[] = [];
  const participants = nodes.filter((node) => node.type === 'sequence_participant');
  const notes = nodes.filter((node) => node.type === 'sequence_note');
  const byId = new Map(participants.map((node) => [node.id, node]));
  /** Declaration form: `id = Label` when the label slug is not the id. */
  const participantDecl = (participant: FlowNode): string => {
    const id = slugifyDslId(participant.id) || 'n';
    const label = participant.data?.label ?? participant.id;
    return slugifyDslId(label) === id ? quote(label) : `${id} = ${quote(label)}`;
  };
  /** Reference form: the id when it was declared with one, else the label. */
  const participantRef = (id: string): string => {
    const participant = byId.get(id);
    if (!participant) return id;
    const label = participant.data?.label ?? id;
    const slug = slugifyDslId(label);
    return slug === (slugifyDslId(id) || 'n') ? quote(label) : (slugifyDslId(id) || 'n');
  };
  const lines: string[] = ['sequence'];
  if (/^\s*autonumber\b/m.test(source)) lines.push('autonumber');
  for (const participant of participants) {
    const attrs: string[] = [];
    if (participant.data?.seqParticipantKind === 'actor') attrs.push('actor');
    const alias = participant.data?.seqParticipantAlias;
    if (typeof alias === 'string' && alias && alias !== participant.data?.label) losses.push(`Participant alias "${alias}" folded into the label`);
    lines.push(`participant ${participantDecl(participant)}${attrText(attrs)}`);
  }
  const arrowOf = (kind: string | undefined, self: boolean): string => {
    if (self) return '->';
    if (kind === 'return') return '-->';
    if (kind === 'async') return '->>';
    if (kind === 'destroy') return '<->';
    return '->';
  };
  // Messages, notes and activations interleave by source order. The parser
  // stamps notes and activations with the index of the message that follows
  // them, so at equal order they come first.
  type Event =
    | { order: number; rank: 0; text: string; fragment: FlowEdgeData['seqFragment'] | null }
    | { order: number; rank: 1; text: string; fragment: FlowEdgeData['seqFragment'] | null };
  const events: Event[] = [];
  for (const participant of participants) {
    const activations = (participant.data as { seqActivations?: Array<{ order: number; activate: boolean }> } | undefined)?.seqActivations ?? [];
    for (const activation of activations) {
      events.push({ order: activation.order, rank: 0, text: `${activation.activate ? 'activate' : 'deactivate'} ${participantRef(participant.id)}`, fragment: null });
    }
  }
  for (const note of notes) {
    const targets = Array.isArray(note.data?.seqNoteTargets) && note.data.seqNoteTargets.length > 0
      ? note.data.seqNoteTargets
      : note.data?.seqNoteTarget ? [note.data.seqNoteTarget] : [];
    const position = note.data?.seqNotePosition === 'left' || note.data?.seqNotePosition === 'right' ? `${note.data.seqNotePosition} of` : 'over';
    events.push({
      order: numberData(note.data?.seqMessageOrder), rank: 0,
      text: `note ${position} ${targets.map((id: string) => participantRef(id)).join(', ')} : ${quote(String(note.data?.label ?? ''))}`,
      fragment: note.data?.seqFragment ?? null,
    });
  }
  for (const message of edges) {
    const label = typeof message.label === 'string' && message.label ? ` : ${quote(message.label)}` : ' : ';
    const self = message.source === message.target;
    events.push({
      order: numberData(message.data?.seqMessageOrder), rank: 1,
      text: `${participantRef(message.source)} ${arrowOf(message.data?.seqMessageKind, self)} ${participantRef(message.target)}${label}`,
      fragment: message.data?.seqFragment ?? null,
    });
  }
  events.sort((a, b) => a.order - b.order || a.rank - b.rank);
  // The parser tags each event with its innermost fragment branch only, so
  // one block is open at a time: a `start` branch opens a new block, any other
  // branch kind continues the open one with `else`/`and`.
  let open: { type: string; branch: string; condition: string } | null = null;
  for (const event of events) {
    const fragment = event.fragment?.type ? event.fragment : null;
    if (fragment) {
      const branch = fragment.branchKind ?? 'start';
      const condition = fragment.condition ?? '';
      const same = open && open.type === fragment.type && open.branch === branch && open.condition === condition;
      if (!same) {
        if (open && branch !== 'start' && open.type === fragment.type) {
          lines.push(`} ${fragment.type === 'par' ? 'and' : 'else'}${condition ? ` ${condition}` : ''} {`);
        } else {
          if (open) lines.push('}');
          lines.push(`${fragment.type}${condition ? ` ${condition}` : ''} {`);
        }
        open = { type: fragment.type, branch, condition };
      }
    } else if (open) {
      lines.push('}');
      open = null;
    }
    lines.push(`${open ? '  ' : ''}${event.text}`);
  }
  if (open) lines.push('}');
  if (fragmentDepth(source) > 1) losses.push('Nested sequence fragments are flattened to their innermost block');
  return { dsl: `${lines.join('\n')}\n`, losses, diagnostics: losses.map((message, index) => lossDiagnostic(index + 1, message)) };
}

/** Deepest `loop/alt/opt/par/break/critical … end` nesting in the source. */
function fragmentDepth(source: string): number {
  let depth = 0;
  let deepest = 0;
  for (const line of source.split('\n')) {
    if (/^\s*(?:loop|alt|opt|par|break|critical|rect)\b/i.test(line)) deepest = Math.max(deepest, ++depth);
    else if (/^\s*end\s*$/i.test(line)) depth = Math.max(0, depth - 1);
  }
  return deepest;
}

function stateDsl(source: string, nodes: readonly FlowNode[], edges: readonly FlowEdge[], direction: string | undefined): MermaidConversion {
  const losses: string[] = [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const pseudo = (id: string) => id.startsWith('state_start') || id.startsWith('state_end');
  const refOf = (id: string): string => {
    if (pseudo(id)) return '[*]';
    const node = byId.get(id);
    return node ? nodeRef(node) : id;
  };
  const lines: string[] = ['state' + (direction && DIRECTION_WORDS[direction] ? ` ${DIRECTION_WORDS[direction]}` : '')];
  // The parser links composite members through `parentId`, but splits a
  // composite into a `section` node (`Moving_1`) and the plain state of the
  // same label that transitions reference. Fold the section into the state so
  // our DSL writes one `state X { … }` block.
  const canonical = (id: string): string => {
    const node = byId.get(id);
    if (node?.type !== 'section') return id;
    const twin = nodes.find((candidate) => candidate.type !== 'section' && candidate.data?.label === node.data?.label);
    return twin?.id ?? id;
  };
  const insideOf = (id: string): string | undefined => {
    const parent = byId.get(id)?.parentId;
    return parent ? canonical(parent) : undefined;
  };
  const childrenOf = (id: string) => nodes.filter((candidate) => candidate.parentId && canonical(candidate.parentId) === id);
  const composites = new Set(nodes.flatMap((node) => (node.parentId ? [canonical(node.parentId)] : [])));
  const controlWord = (node: FlowNode): string | undefined => {
    const kind = node.data?.stateControlKind;
    return kind === 'fork' || kind === 'join' || kind === 'choice' ? kind : undefined;
  };
  const emitted = new Set<string>();
  const emitNode = (node: FlowNode, indent: string) => {
    if (emitted.has(node.id) || pseudo(node.id)) return;
    emitted.add(node.id);
    const control = controlWord(node);
    const attrs = control ? [control] : nodeAttributes(node);
    if (!composites.has(node.id)) {
      lines.push(`${indent}${nodeName(node)}${attrText(attrs)}`);
      return;
    }
    lines.push(`${indent}state ${nodeName(node)}${attrText(attrs)} {`);
    for (const child of childrenOf(node.id)) emitNode(child, `${indent}  `);
    for (const edge of edges) {
      if (insideOf(edge.source) === node.id && insideOf(edge.target) === node.id) lines.push(`${indent}  ${edgeText(edge)}`);
    }
    lines.push(`${indent}}`);
  };
  const edgeText = (edge: FlowEdge): string => {
    const label = typeof edge.label === 'string' && edge.label ? ` : ${quote(edge.label)}` : '';
    return `${refOf(edge.source)} ${edgeArrow(edge)} ${refOf(edge.target)}${label}`;
  };
  for (const node of nodes) {
    if (node.parentId || pseudo(node.id) || canonical(node.id) !== node.id) continue;
    emitNode(node, '');
  }
  for (const edge of edges) {
    if (!byId.has(edge.source) || !byId.has(edge.target)) continue;
    const inside = insideOf(edge.source);
    if (inside && inside === insideOf(edge.target)) continue;
    lines.push(edgeText(edge));
  }
  // The parser drops notes; one-line `note right of X : text` maps straight
  // onto our `note X : text`, block notes (`end note`) do not.
  for (const line of source.split('\n')) {
    const note = /^\s*note\s+(?:left|right)\s+of\s+(\S+)\s*:\s*(.+)$/i.exec(line);
    if (note && byId.has(note[1]!)) lines.push(`note ${refOf(note[1]!)} : ${quote(note[2]!.trim())}`);
    else if (/^\s*note\s+(?:left|right)\s+of\s+\S+\s*$/i.test(line)) losses.push('Multi-line state notes are dropped');
  }
  return { dsl: `${lines.join('\n')}\n`, losses, diagnostics: losses.map((message, index) => lossDiagnostic(index + 1, message)) };
}

function erDsl(nodes: readonly FlowNode[], edges: readonly FlowEdge[]): MermaidConversion {
  const lines: string[] = ['erd'];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  for (const node of nodes) {
    lines.push(`${nodeName(node)} {`);
    const fields = (Array.isArray(node.data?.erFields) ? node.data.erFields : []) as ReadonlyArray<Record<string, unknown> | string>;
    for (const rawField of fields) {
      const field: Record<string, unknown> = typeof rawField === 'string' ? parseFieldShorthand(rawField) : rawField;
      const flags = [
        field.isPrimaryKey === true ? 'pk' : '',
        field.isForeignKey === true ? 'fk' : '',
        field.isUnique === true ? 'unique' : '',
        field.isNotNull === true ? 'not-null' : '',
      ].filter(Boolean);
      const name = String(field.name ?? 'field');
      lines.push(`  ${/[\s,]/.test(name) ? `"${name}"` : name} ${String(field.dataType ?? 'text')}${flags.map((flag) => ` ${flag}`).join('')}`);
    }
    lines.push('}');
  }
  for (const edge of edges) {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source || !target) continue;
    const token = typeof edge.data?.erRelation === 'string' ? edge.data.erRelation : '||--||';
    const label = typeof edge.label === 'string' && edge.label ? ` : ${quote(edge.label)}` : '';
    lines.push(`${nodeName(source)} ${token} ${nodeName(target)}${label}`);
  }
  return { dsl: `${lines.join('\n')}\n`, losses: [], diagnostics: [] };
}

function classDsl(nodes: readonly FlowNode[], edges: readonly FlowEdge[]): MermaidConversion {
  const losses: string[] = [];
  const lines: string[] = ['class'];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  for (const node of nodes) {
    const stereotype = typeof node.data?.classStereotype === 'string' && node.data.classStereotype ? [node.data.classStereotype] : [];
    lines.push(`${nodeName(node)}${attrText(stereotype)} {`);
    const attributes = Array.isArray(node.data?.classAttributes) ? node.data.classAttributes as string[] : [];
    const methods = Array.isArray(node.data?.classMethods) ? node.data.classMethods as string[] : [];
    for (const member of attributes) lines.push(`  ${member}`);
    if (attributes.length && methods.length) lines.push('  ---');
    for (const member of methods) lines.push(`  ${member}`);
    lines.push('}');
  }
  for (const edge of edges) {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source || !target) continue;
    const token = typeof edge.data?.classRelation === 'string' ? edge.data.classRelation : '-->';
    const sourceCardinality = typeof edge.data?.classRelationSourceCardinality === 'string' ? edge.data.classRelationSourceCardinality : undefined;
    const targetCardinality = typeof edge.data?.classRelationTargetCardinality === 'string' ? edge.data.classRelationTargetCardinality : undefined;
    const label = typeof edge.label === 'string' && edge.label ? ` : ${quote(edge.label)}` : '';
    lines.push(
      `${nodeName(source)} ${sourceCardinality ? `"${sourceCardinality}" ` : ''}${token} ${targetCardinality ? `"${targetCardinality}" ` : ''}${nodeName(target)}${label}`,
    );
  }
  if (losses.length === 0) losses.push('Namespaces and `note for` are dropped');
  return { dsl: `${lines.join('\n')}\n`, losses, diagnostics: losses.map((message, index) => lossDiagnostic(index + 1, message)) };
}

function mindmapDsl(nodes: readonly FlowNode[]): MermaidConversion {
  const lines: string[] = ['mindmap'];
  const root = nodes.find((node) => numberData(node.data?.mindmapDepth) === 0) ?? nodes[0];
  if (!root) return { dsl: 'mindmap\n', losses: [], diagnostics: [] };
  lines.push(`central: ${quote(String(root.data?.label ?? 'Root'))}`);
  const depthOf = (node: FlowNode) => numberData(node.data?.mindmapDepth);
  const parentOf = (node: FlowNode) => typeof node.data?.mindmapParentId === 'string' ? node.data.mindmapParentId : null;
  const childrenOf = (id: string) => nodes.filter((node) => parentOf(node) === id);
  const walk = (node: FlowNode) => {
    for (const child of childrenOf(node.id)) {
      const depth = depthOf(child);
      lines.push(`${' '.repeat(Math.max(0, (depth - 1) * 2))}- ${quote(String(child.data?.label ?? ''))}`);
      walk(child);
    }
  };
  walk(root);
  return { dsl: `${lines.join('\n')}\n`, losses: ['Mindmap icons and classes are dropped'], diagnostics: [lossDiagnostic(1, 'Mindmap icons and classes are dropped')] };
}

/** Mermaid gitGraph has no app-side parser; the five statements map one-to-one. */
function gitgraphDsl(source: string): MermaidConversion {
  const lines: string[] = ['gitgraph'];
  const losses: string[] = [];
  for (const rawLine of source.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('%%') || /^gitGraph/i.test(line)) continue;
    const commit = /^commit(?:\s+id:\s*("[^"]*"|\S+))?(.*)$/i.exec(line);
    if (commit) {
      const attrs: string[] = [];
      const tag = /tag:\s*("[^"]*"|\S+)/i.exec(line);
      if (tag) attrs.push(`tag: ${tag[1]!.replace(/^"|"$/g, '')}`);
      const type = /type:\s*(NORMAL|REVERSE|HIGHLIGHT)/i.exec(line)?.[1]?.toLowerCase();
      if (type === 'reverse') attrs.push('revert');
      if (type === 'highlight') attrs.push('highlight');
      const message = commit[1] ? commit[1].replace(/^"|"$/g, '') : '';
      lines.push(`commit${message ? ` ${quote(message)}` : ''}${attrText(attrs)}`);
      continue;
    }
    const branch = /^branch\s+(\S+)/i.exec(line);
    if (branch) {
      lines.push(`branch ${branch[1]}`);
      continue;
    }
    const checkout = /^(?:checkout|switch)\s+(\S+)/i.exec(line);
    if (checkout) {
      lines.push(`checkout ${checkout[1]}`);
      continue;
    }
    const merge = /^merge\s+(\S+)(.*)$/i.exec(line);
    if (merge) {
      const attrs: string[] = [];
      const tag = /tag:\s*("[^"]*"|\S+)/i.exec(line);
      if (tag) attrs.push(`tag: ${tag[1]!.replace(/^"|"$/g, '')}`);
      const id = /id:\s*("[^"]*"|\S+)/i.exec(line);
      if (id) attrs.push(`label: ${id[1]!.replace(/^"|"$/g, '')}`);
      lines.push(`merge ${merge[1]}${attrText(attrs)}`);
      continue;
    }
    const cherry = /^cherry-pick\s+id:\s*("[^"]*"|\S+)/i.exec(line);
    if (cherry) {
      lines.push(`cherry-pick ${cherry[1]!.replace(/^"|"$/g, '')}`);
      continue;
    }
    losses.push(`Unsupported gitGraph line: ${line}`);
  }
  return { dsl: `${lines.join('\n')}\n`, losses, diagnostics: losses.map((message, index) => lossDiagnostic(index + 1, message)) };
}

/** Legacy ER fields arrive as `"name: type FLAGS"` strings. */
function parseFieldShorthand(value: string): Record<string, unknown> {
  const [name = 'field', ...rest] = value.split(':').map((part) => part.trim());
  const [dataType = 'text', ...flags] = rest.join(':').split(/\s+/).filter(Boolean);
  const lower = flags.map((flag) => flag.toLowerCase());
  return {
    name, dataType,
    isPrimaryKey: lower.includes('pk') || lower.includes('primary'),
    isForeignKey: lower.includes('fk') || lower.includes('foreign'),
    isUnique: lower.includes('unique') || lower.includes('uk'),
    isNotNull: lower.includes('notnull') || lower.includes('nn'),
  };
}

function numberData(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function lossDiagnostic(line: number, message: string): DslDiagnostic {
  return { code: 'W180', severity: 'warning', line, col: 1, endCol: 1, message, source: 'parse' };
}

const MERMAID_ONLY = /-->|-\.->|==>|~~~|subgraph|@\{|\|\w+\||-\[\||\[\[\(|\}\]/;

/** True when the text starts a Mermaid diagram (used for the panel banner). */
export function looksLikeMermaid(text: string): boolean {
  // Our own pragma is decisive: a DSL document is never Mermaid.
  if (/^\s*%%\s*ofk\b/m.test(text)) return false;
  const first = text.split('\n').map((line) => line.trim()).find((line) => line && !line.startsWith('%%'));
  if (!first) return false;
  if (/^(flowchart|graph)\b/i.test(first)) {
    if (MERMAID_ONLY.test(text)) return true;
    // `A[Label]` is Mermaid shorthand; our DSL writes `A [shape]` with a space.
    if (/\w\[/.test(text) || /\|\w+\|/.test(text)) return true;
    return false;
  }
  return /^(sequenceDiagram|stateDiagram(-v2)?|classDiagram|erDiagram|gitGraph|mindmap|journey|architecture(-beta)?|gantt|pie|timeline|sankey-beta|C4Context|quadrantChart|requirementDiagram|xychart-beta|block-beta|packet-beta|kanban|radar-beta|treemap)\b/i.test(first);
}

/** Mermaid text → OFK DSL, or an error explaining why it cannot be converted. */
export function mermaidToDsl(text: string): MermaidConversion | MermaidConversionError {
  if (!looksLikeMermaid(text)) return { error: 'No Mermaid diagram header found' };
  if (/^\s*gitGraph/mi.test(text)) return gitgraphDsl(text);
  const detected = detectMermaidDiagramType(text);
  if (!detected) return { error: 'Unsupported Mermaid diagram type' };
  const parsed = parseMermaidByType(text);
  if (parsed.error) return { error: parsed.error };
  // The parser's model is structurally wider; the adapter reads these fields only.
  const nodes = parsed.nodes as unknown as FlowNode[];
  const edges = parsed.edges as unknown as FlowEdge[];
  const direction = parsed.direction;
  const conversion = (() => {
    switch (parsed.diagramType) {
      case 'flowchart': return flowchartDsl(nodes, edges, direction);
      case 'sequence': return sequenceDsl(text, nodes, edges);
      case 'stateDiagram': return stateDsl(text, nodes, edges, direction);
      case 'erDiagram': return erDsl(nodes, edges);
      case 'classDiagram': return classDsl(nodes, edges);
      case 'mindmap': return mindmapDsl(nodes);
      case 'architecture': return architectureDsl(nodes, edges);
      default: return null;
    }
  })();
  if (!conversion) return { error: `${parsed.diagramType} is not convertible yet` };
  const parserLosses = (parsed.structuredDiagnostics ?? []).map((item) => item.message).filter(Boolean);
  const losses = [...conversion.losses, ...parserLosses];
  return {
    dsl: conversion.dsl,
    losses,
    diagnostics: losses.map((message, index) => lossDiagnostic(index + 1, message)),
  };
}
