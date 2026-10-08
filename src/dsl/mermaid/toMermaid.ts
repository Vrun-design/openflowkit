import type { SceneConnector, SceneNode } from '../../opencanvas/domain/document/types';
import { dslConnectorMeta, dslFrameMeta, dslFrameRaw, dslNodeMeta, type DslFrameScene } from '../sceneMeta';
import { colorInfoFor, compareNodes, connectorDashed, markerName, nodeAttributes, nodeLabel } from '../text';
import { dslFamilyDirection, dslShapeWord, isHexColor } from '../vocabulary';

// DSL scene → Mermaid text, the inverse of services/dsl/mermaidToDsl. Mermaid has
// no coordinates, so positions are gone by design; everything else the target
// cannot say is counted into `losses`, never dropped silently. Pure: no DOM, no React.

export interface MermaidExport {
  /** Empty when the family has no Mermaid form. */
  readonly text: string;
  /** Short human strings, deduplicated with counts: "positions and sizes", "3 colors". */
  readonly losses: string[];
}

const DIRECTION_WORDS: Readonly<Record<string, string>> = { down: 'TD', right: 'LR', left: 'RL', up: 'BT' };

/** Words Mermaid reads as syntax when they are an id. */
const RESERVED_IDS = new Set(['end', 'graph', 'flowchart', 'subgraph', 'style', 'class', 'classdef', 'click', 'default', 'linkstyle', 'direction', 'participant', 'actor', 'note', 'loop', 'alt', 'opt', 'par', 'and', 'else', 'break', 'critical', 'activate', 'deactivate', 'autonumber', 'rect', 'box', 'title']);

/** Classic bracket forms; the keys are DSL shape words. */
const CLASSIC_SHAPES: Readonly<Record<string, readonly [string, string]>> = {
  rect: ['[', ']'], rounded: ['(', ')'], stadium: ['([', '])'], circle: ['((', '))'], diamond: ['{', '}'],
  hexagon: ['{{', '}}'], cylinder: ['[(', ')]'], parallelogram: ['[/', '/]'], component: ['[[', ']]'],
};
/** Mermaid 11 `@{ shape: … }` names for the DSL words that have one. */
const MODERN_SHAPES: Readonly<Record<string, string>> = { doc: 'doc', cloud: 'cloud', queue: 'h-cyl', triangle: 'tri', bolt: 'bolt' };

const SEQUENCE_ARROWS: Readonly<Record<string, string>> = { '->': '->>', '-->': '-->>', '->>': '-)', '-->>': '--)' };

/** Counts losses by kind so "3 colors" says it once. */
class Losses {
  private readonly counts = new Map<string, { one: string; many: string; n: number }>();

  add(one: string, many: string, n = 1): void {
    const entry = this.counts.get(one);
    if (entry) entry.n += n; else this.counts.set(one, { one, many, n });
  }

  list(): string[] {
    return [...this.counts.values()].map(({ one, many, n }) => (n === 1 ? `1 ${one}` : `${n} ${many}`));
  }
}

function escapeText(text: string, newline: string): string {
  return text.replace(/#/g, '#35;').replace(/"/g, '#quot;').replace(/`/g, '#96;').replace(/</g, '#lt;').replace(/>/g, '#gt;')
    .replace(/\r\n?|\n/g, newline);
}

/** Free text after a colon or `as`: only `;`, `#` and line breaks are special there. */
function escapePlain(text: string): string {
  return text.replace(/[#;`]/g, (char) => (char === '#' ? '#35;' : char === ';' ? '#59;' : '#96;')).replace(/\r\n?|\n/g, '<br/>');
}

const quoted = (text: string) => `"${escapeText(text, '<br>')}"`;

function idMapper(losses: Losses): (id: string) => string {
  const used = new Set<string>();
  const ids = new Map<string, string>();
  return (id) => {
    const known = ids.get(id);
    if (known) return known;
    let base = id.replace(/[^A-Za-z0-9_]/g, '_') || 'n';
    // Only the lowercase `end` closes a block; `End` reads back as the same slug.
    if (base.toLowerCase() === 'end') base = 'End';
    else if (RESERVED_IDS.has(base.toLowerCase())) { base = `n_${base}`; losses.add('id renamed (Mermaid keyword)', 'ids renamed (Mermaid keywords)'); }
    let unique = base;
    for (let suffix = 2; used.has(unique); suffix += 1) unique = `${base}_${suffix}`;
    used.add(unique);
    ids.set(id, unique);
    return unique;
  };
}

function frontMatter(scene: DslFrameScene): string[] {
  const title = typeof scene.frame.content.label === 'string' && scene.frame.content.label
    ? scene.frame.content.label : dslFrameMeta(scene.frame).title;
  return title ? ['---', `title: ${JSON.stringify(title)}`, '---'] : [];
}

/** What a node carries beyond shape, hex fill and label, as losses. */
function noteNodeLosses(node: SceneNode, losses: Losses, shapeWord: string | undefined): void {
  const color = colorInfoFor(node);
  if (color.word && !isHexColor(color.word)) losses.add('color', 'colors');
  if (color.fill) losses.add('fill style', 'fill styles');
  for (const entry of nodeAttributes(node)) {
    if (entry.key === 'label' || entry.value === shapeWord || entry.value === color.word || entry.value === color.fill) continue;
    if (entry.key === 'icon' || (!entry.key && entry.value.includes('/'))) losses.add('icon', 'icons');
    else if (entry.value === 'shadow' && !entry.key) losses.add('shadow', 'shadows');
    else if (entry.key === 'width' || entry.key === 'height') losses.add('custom size', 'custom sizes');
    else if (entry.key === 'desc' || entry.key === 'tech') losses.add('description', 'descriptions');
    else if (entry.key === 'link') losses.add('link', 'links');
    else losses.add('attribute', 'attributes');
  }
  if ((dslNodeMeta(node).notes ?? []).length > 0) losses.add('note', 'notes', dslNodeMeta(node).notes!.length);
}

function nodeText(node: SceneNode, id: string, losses: Losses): string {
  const meta = dslNodeMeta(node);
  const word = dslShapeWord(node.kind, node.content.shape, meta.shape) ?? 'rect';
  noteNodeLosses(node, losses, word);
  const label = quoted(nodeLabel(node));
  const classic = CLASSIC_SHAPES[word === 'capsule' ? 'stadium' : word];
  if (classic) return `${id}${classic[0]}${label}${classic[1]}`;
  const modern = MODERN_SHAPES[word];
  if (modern) return `${id}@{ shape: ${modern}, label: ${label} }`;
  losses.add('shape drawn as a box', 'shapes drawn as boxes');
  return `${id}[${label}]`;
}

function edgeText(connector: SceneConnector, from: string, to: string, losses: Losses): string {
  let head = markerName(connector.appearance.markerEnd) ?? 'none';
  let tail = markerName(connector.appearance.markerStart) ?? 'none';
  if (head === 'diamond' || tail === 'diamond') {
    losses.add('diamond arrowhead drawn as an arrow', 'diamond arrowheads drawn as arrows');
    if (head === 'diamond') head = 'arrow';
    if (tail === 'diamond') tail = 'arrow';
  }
  if (head !== tail && head !== 'none' && tail !== 'none') {
    losses.add('mixed arrow end dropped', 'mixed arrow ends dropped');
    tail = 'none';
  }
  let [source, target] = [from, to];
  // Mermaid has no `<--`: a line with only a tail marker is the same line read backwards.
  if (head === 'none' && tail !== 'none') { [source, target] = [target, source]; head = tail; tail = 'none'; }
  const thick = typeof connector.appearance.strokeWidth === 'number' && connector.appearance.strokeWidth >= 2.25;
  const dashed = connectorDashed(connector);
  const lineWord = head === 'circle' || head === 'cross';
  if (dashed && thick) losses.add('thick dashed line drawn dashed', 'thick dashed lines drawn dashed');
  if ((dashed || thick) && lineWord) losses.add('dash or thickness lost on a circle or cross end', 'dashes or thicknesses lost on circle or cross ends');
  const style = lineWord ? 'solid' : dashed ? 'dashed' : thick ? 'thick' : 'solid';
  const end = head === 'arrow' ? '>' : head === 'circle' ? 'o' : head === 'cross' ? 'x' : '';
  const start = tail === 'arrow' ? '<' : tail === 'circle' ? 'o' : tail === 'cross' ? 'x' : '';
  const line = connector.appearance.opacity === 0 && head === 'none' ? '~~~'
    : style === 'dashed' ? `${start}-.${end ? '->' : '-'}`
      : style === 'thick' ? `${start}==${end ? '>' : '='}`
        : `${start}--${end || '-'}`;
  const text = connector.labels[0]?.text;
  const arrow = text ? `${line}|${quoted(text)}|` : line;
  const attrs = (dslConnectorMeta(connector).attrs ?? []);
  for (const entry of attrs) {
    if (entry.value === 'flow') losses.add('animated edge', 'animated edges');
    else losses.add('connector attribute', 'connector attributes');
  }
  if (connector.source.anchor || connector.target.anchor) losses.add('connector side', 'connector sides');
  return `${source} ${arrow} ${target}`;
}

function flowchart(scene: DslFrameScene): MermaidExport {
  const losses = new Losses();
  const meta = dslFrameMeta(scene.frame);
  const direction = DIRECTION_WORDS[meta.direction ?? dslFamilyDirection('flowchart')] ?? 'TD';
  const groups = [...(scene.groups ?? [])];
  const nodes = scene.nodes.filter((node) => !dslNodeMeta(node).noteFor);
  const stickies = scene.nodes.length - nodes.length;
  if (stickies > 0) losses.add('sticky note', 'sticky notes', stickies);
  const mermaidId = idMapper(losses);
  const known = new Set([...nodes, ...groups].map((node) => node.id));
  const lines: string[] = [...frontMatter(scene), `flowchart ${direction}`];
  const styles: string[] = [];
  const fill = (node: SceneNode) => {
    const word = colorInfoFor(node).word;
    if (word && isHexColor(word)) styles.push(`  style ${mermaidId(node.id)} fill:${word}`);
  };

  const emitGroup = (group: SceneNode, indent: string) => {
    const id = mermaidId(group.id);
    noteNodeLosses(group, losses, undefined);
    fill(group);
    lines.push(`${indent}subgraph ${id}[${quoted(nodeLabel(group))}]`);
    emitChildren(group.id, `${indent}  `);
    lines.push(`${indent}end`);
  };
  function emitChildren(parentId: string, indent: string): void {
    for (const node of nodes.filter((candidate) => candidate.parentId === parentId).sort(compareNodes)) {
      lines.push(`${indent}${nodeText(node, mermaidId(node.id), losses)}`);
      fill(node);
    }
    for (const group of groups.filter((candidate) => candidate.parentId === parentId).sort(compareNodes)) emitGroup(group, indent);
  }
  emitChildren(scene.frame.id, '  ');
  // Orphans whose parent is not the frame or a known group still draw, at the top level.
  const placed = new Set<string>();
  const place = (parentId: string) => {
    for (const child of [...nodes, ...groups].filter((candidate) => candidate.parentId === parentId)) { placed.add(child.id); place(child.id); }
  };
  place(scene.frame.id);
  for (const node of nodes.filter((candidate) => !placed.has(candidate.id))) lines.push(`  ${nodeText(node, mermaidId(node.id), losses)}`);

  let dropped = 0;
  for (const connector of scene.connectors) {
    const source = connector.source.nodeId;
    const target = connector.target.nodeId;
    if (!source || !target || !known.has(source) || !known.has(target)) { dropped += 1; continue; }
    lines.push(`  ${edgeText(connector, mermaidId(source), mermaidId(target), losses)}`);
  }
  if (dropped > 0) losses.add('connector without two ends dropped', 'connectors without two ends dropped', dropped);
  lines.push(...styles);
  const reserved = dslFrameRaw(scene.frame).reserved;
  if (Array.isArray(reserved) && reserved.length > 0) losses.add('extra statement', 'extra statements', reserved.length);
  if (Array.isArray(dslFrameRaw(scene.frame).align)) losses.add('alignment rule', 'alignment rules');
  return finish(lines, nodes.length + groups.length > 0, losses);
}

interface Branch {
  readonly node: SceneNode;
  readonly id: string;
  readonly type: string;
  readonly index: number;
  readonly parent: string | null;
  readonly start: number;
  readonly end: number;
  readonly line: number;
}

function sequence(scene: DslFrameScene): MermaidExport {
  const losses = new Losses();
  const raw = dslFrameRaw(scene.frame);
  const participants = scene.nodes.filter((node) => node.kind === 'sequence_participant');
  const notes = scene.nodes.filter((node) => node.kind === 'sequence_note');
  const mermaidId = idMapper(losses);
  const known = new Set(participants.map((participant) => participant.id));
  const branches: Branch[] = scene.nodes
    .filter((node) => node.kind === 'annotation' && (node.metadata.dsl as { seqBranch?: boolean } | undefined)?.seqBranch)
    .map((node) => {
      const meta = node.metadata.dsl as Record<string, unknown>;
      return {
        node, id: node.id,
        type: typeof meta.seqFragmentType === 'string' ? meta.seqFragmentType : 'alt',
        index: typeof meta.seqFragmentBranch === 'number' ? meta.seqFragmentBranch : 0,
        parent: typeof meta.seqFragmentParent === 'string' ? meta.seqFragmentParent : null,
        start: typeof meta.seqFragmentStart === 'number' ? meta.seqFragmentStart : 0,
        end: typeof meta.seqFragmentEnd === 'number' ? meta.seqFragmentEnd : -1,
        line: Number(meta.line ?? 0),
      };
    })
    .sort((a, b) => a.line - b.line);
  const heads = branches.filter((branch) => branch.index === 0);
  const orderOf = (connector: SceneConnector) => typeof connector.semantics.seqMessageOrder === 'number' ? connector.semantics.seqMessageOrder : 0;
  /**
   * Innermost branch holding a message order. A note or activation numbered at a fragment's first
   * message may sit just before the fragment or just inside it; `line` (when known) says which.
   */
  const ownerOf = (order: number, line?: number): string | null => {
    let best: Branch | null = null;
    for (const branch of branches) {
      if (order < branch.start || order > branch.end) continue;
      if (line !== undefined && branch.index === 0 && order === branch.start && line < branch.line) continue;
      if (!best || branch.start >= best.start) best = branch;
    }
    return best?.id ?? null;
  };
  /** The else/and branches that continue `head`'s block, scoped by line. */
  const continuationsOf = (head: Branch): Branch[] => {
    const nextHead = heads
      .filter((candidate) => candidate.parent === head.parent && candidate.type === head.type && candidate.line > head.line)
      .reduce((least, candidate) => Math.min(least, candidate.line), Number.POSITIVE_INFINITY);
    return branches
      .filter((candidate) => candidate.parent === head.parent && candidate.type === head.type
        && candidate.index > head.index && candidate.line > head.line && candidate.line < nextHead)
      .sort((a, b) => a.index - b.index);
  };

  const lines: string[] = [...frontMatter(scene), 'sequenceDiagram'];
  if (raw.seqAutonumber === true) lines.push('  autonumber');
  for (const participant of participants) {
    const kind = participant.content.seqParticipantKind === 'actor' ? 'actor' : 'participant';
    lines.push(`  ${kind} ${mermaidId(participant.id)} as ${escapePlain(nodeLabel(participant))}`);
    const meta = participant.metadata.dsl as { seqStereotype?: string; attrs?: unknown[] } | undefined;
    if (meta?.seqStereotype) losses.add('participant icon', 'participant icons');
    if (typeof participant.content.color === 'string') losses.add('color', 'colors');
    if (Array.isArray(meta?.attrs) && meta.attrs.length > 0) losses.add('participant attribute', 'participant attributes');
  }

  type Item = { order: number; rank: number; line: number; lines: string[] };
  function emitChildren(parent: string | null, indent: string): string[] {
    const items: Item[] = [];
    for (const participant of participants) {
      const activations = Array.isArray(participant.content.seqActivations) ? participant.content.seqActivations as Array<{ order: number; activate: boolean }> : [];
      for (const activation of activations) {
        if (ownerOf(activation.order, -1) !== parent) continue;
        items.push({ order: activation.order, rank: -1, line: Number.MAX_SAFE_INTEGER, lines: [`${indent}${activation.activate ? 'activate' : 'deactivate'} ${mermaidId(participant.id)}`] });
      }
    }
    for (const message of scene.connectors) {
      if (ownerOf(orderOf(message)) !== parent) continue;
      const from = message.source.nodeId;
      const to = message.target.nodeId;
      if (!from || !to || !known.has(from) || !known.has(to)) { losses.add('message without two ends dropped', 'messages without two ends dropped'); continue; }
      const dsl = message.metadata.dsl as { seqArrow?: string } | undefined;
      const kind = message.semantics.seqMessageKind;
      const dsArrow = dsl?.seqArrow ?? (kind === 'return' ? '-->' : kind === 'async' ? '->>' : '->');
      const cross = message.appearance.markerEnd === 'cross';
      const arrow = cross ? (dsArrow.startsWith('--') ? '--x' : '-x') : SEQUENCE_ARROWS[dsArrow] ?? '->>';
      const text = message.labels[0]?.text;
      const attrs = dslConnectorMeta(message).attrs ?? [];
      if (attrs.length > 0) losses.add('message attribute', 'message attributes', attrs.length);
      items.push({ order: orderOf(message), rank: 2, line: dslConnectorMeta(message).line, lines: [`${indent}${mermaidId(from)}${arrow}${mermaidId(to)}:${text ? ` ${escapePlain(text)}` : ''}`] });
    }
    for (const note of notes) {
      const order = typeof note.content.seqMessageOrder === 'number' ? note.content.seqMessageOrder : 0;
      if (ownerOf(order, dslNodeMeta(note).line) !== parent) continue;
      const targets = (Array.isArray(note.content.seqNoteTargets) ? note.content.seqNoteTargets as string[] : []).filter((id) => known.has(id));
      if (targets.length === 0) { losses.add('note without a participant dropped', 'notes without a participant dropped'); continue; }
      const position = note.content.seqNotePosition === 'left' || note.content.seqNotePosition === 'right' ? `${note.content.seqNotePosition} of` : 'over';
      items.push({ order, rank: 0, line: dslNodeMeta(note).line, lines: [`${indent}Note ${position} ${targets.map(mermaidId).join(',')}: ${escapePlain(String(note.content.label ?? ''))}`] });
    }
    for (const head of heads) {
      if (head.parent !== parent) continue;
      const block: string[] = [];
      [head, ...continuationsOf(head)].forEach((branch, index) => {
        const condition = typeof branch.node.content.subLabel === 'string' ? branch.node.content.subLabel : '';
        const opener = index === 0 ? branch.type : branch.type === 'par' ? 'and' : 'else';
        block.push(`${indent}${opener}${condition ? ` ${escapePlain(condition)}` : ''}`, ...emitChildren(branch.id, `${indent}  `));
      });
      block.push(`${indent}end`);
      items.push({ order: head.start, rank: 0, line: head.line, lines: block });
    }
    return items.sort((a, b) => a.order - b.order || a.rank - b.rank || a.line - b.line).flatMap((item) => item.lines);
  }
  lines.push(...emitChildren(null, '  '));

  const reserved = Array.isArray(raw.reserved) ? raw.reserved : [];
  if (reserved.length > 0) losses.add('box, rect or legend block', 'box, rect or legend blocks', reserved.length);
  return finish(lines, participants.length > 0, losses);
}

function finish(lines: string[], hasContent: boolean, losses: Losses): MermaidExport {
  const list = losses.list();
  // Positions are always gone, so say it first; an empty diagram has none to lose.
  return { text: `${lines.join('\n')}\n`, losses: hasContent ? ['positions and sizes', ...list] : list };
}

/** A diagram frame's scene (compile result or `frameScene`) → Mermaid, with every loss named. */
export function diagramToMermaid(scene: DslFrameScene): MermaidExport {
  const family = dslFrameMeta(scene.frame).family;
  if (family === 'flowchart') return flowchart(scene);
  if (family === 'sequence') return sequence(scene);
  return { text: '', losses: [`Mermaid export supports flowchart and sequence diagrams, not ${family}`] };
}

/** "Not kept: positions and sizes, 3 colors" for a toast; empty when nothing was lost. */
export function mermaidLossSummary(losses: readonly string[]): string {
  return losses.length > 0 ? `Not kept: ${losses.join(', ')}` : '';
}
