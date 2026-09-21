import type { SceneConnector, SceneNode } from '../../opencanvas/domain/document/types';
import type { PaletteKey } from '../../opencanvas/domain/nodes/nodePalette';
import { measurePortableText } from '../../opencanvas/domain/text/measurement';
import type { DslDiagnostic } from '../ast';
import { nonVisualAttributes, readAttributes, typedFrom } from '../attributes';
import { tokenDiagnostic } from '../diagnostics';
import { attrsToJson, dslConnectorMeta, dslFrameRaw, dslNodeMeta, type CanonicalAttribute, type DslFrameScene } from '../sceneMeta';
import { joinTokens, type DslSegment } from '../segments';
import { attributeText, commentLines, nodeName, quote, slugifyDslId } from '../text';
import { COLOR_WORDS, isHexColor, sortAttributes } from '../vocabulary';
import type { Family, FamilyContext, FamilyScene } from './types';

// The sequence family: participants, messages, activations, notes and
// control-flow fragments on a pure timeline layout. Strict line order is the
// canonical form (grammar §8.3), so serialization walks the block tree.

const LANE_WIDTH = 168;
const LANE_GAP = 84;
const HEADER = 48;
const ACTOR_EXTRA = 40;
const MESSAGE_OFFSET = 20;
const MESSAGE_SPACING = 52;
const LIFELINE_TAIL = 44;
const PADDING = { top: 96, right: 56, bottom: 56, left: 56 };
const FRAGMENT_INSET = 40;

const FRAGMENT_COLORS: Readonly<Record<string, PaletteKey>> = {
  loop: 'blue', opt: 'amber', critical: 'red', break: 'red', par: 'emerald', alt: 'violet',
};
const FRAGMENT_KINDS = new Set(['loop', 'alt', 'opt', 'par', 'break', 'critical']);
const BRANCH_OF: Readonly<Record<string, 'alt' | 'par'>> = { else: 'alt', and: 'par' };
const MESSAGE_ARROWS = new Set(['->', '-->', '->>', '-->>']);

const PARTICIPANT_STEREOTYPES = new Set(['db', 'queue', 'icon']);

interface ParticipantDraft {
  id: string;
  label: string;
  kind: 'participant' | 'actor';
  line: number;
  /** Declared by its own statement (or an `id = Label` line), not only by a message. */
  declared: boolean;
  /** Line of the first message that mentions it, if any. */
  firstUseLine: number | null;
  /** `db | queue | icon` stereotype, kept verbatim for round-trip. */
  stereotype?: string;
  attrs: CanonicalAttribute[];
  activations: Array<{ order: number; activate: boolean }>;
  comments: string[];
}

interface MessageDraft {
  id: string;
  from: string;
  to: string;
  arrow: '->' | '-->' | '->>' | '-->>';
  label?: string;
  order: number;
  line: number;
  attrs: CanonicalAttribute[];
  comments: string[];
  parent: string | null;
}

interface NoteDraft {
  id: string;
  text: string;
  position: 'over' | 'left' | 'right';
  targets: string[];
  order: number;
  line: number;
  comments: string[];
  parent: string | null;
}

interface BranchDraft {
  id: string;
  type: string;
  condition: string;
  /** 0 for the opening branch, 1+ for `else`/`and`. */
  branchIndex: number;
  /** Enclosing branch id (null at top level); siblings share it. */
  parent: string | null;
  startOrder: number;
  endOrder: number;
  line: number;
  comments: string[];
}

interface SeqModel {
  participants: ParticipantDraft[];
  messages: MessageDraft[];
  notes: NoteDraft[];
  branches: BranchDraft[];
  autonumber: boolean;
  reserved: string[];
}

function parseSequence(segments: readonly DslSegment[], context: FamilyContext): SeqModel {
  const participants: ParticipantDraft[] = [];
  const byId = new Map<string, ParticipantDraft>();
  const byLabel = new Map<string, ParticipantDraft>();
  const messages: MessageDraft[] = [];
  const notes: NoteDraft[] = [];
  const branches: BranchDraft[] = [];
  const reserved: string[] = [];
  const open: BranchDraft[] = [];
  let pendingClose: BranchDraft | null = null;
  const used = new Set<string>();
  let autonumber = false;

  const uniqueId = (wanted: string): string => {
    const base = wanted || 'n';
    let id = base;
    let suffix = 2;
    while (used.has(id)) id = `${base}-${suffix++}`;
    used.add(id);
    return id;
  };
  const fail = (segment: DslSegment, code: DslDiagnostic['code'], message: string, hint?: string): void => {
    context.diagnostics.push(tokenDiagnostic(code, 'warning', segment.tokens[0], message, hint));
  };
  const declare = (name: string, line: number, explicit: boolean, explicitId?: string): ParticipantDraft => {
    const existing = (explicitId ? byId.get(explicitId) : undefined) ?? byLabel.get(name)
      ?? byId.get(name) ?? byId.get(slugifyDslId(name));
    if (existing) {
      if (explicit) existing.declared = true;
      return existing;
    }
    const id = uniqueId(explicitId ?? slugifyDslId(name));
    const participant: ParticipantDraft = { id, label: name, kind: 'participant', line, declared: explicit, firstUseLine: null, attrs: [], activations: [], comments: [] };
    participants.push(participant);
    byId.set(id, participant);
    byLabel.set(name, participant);
    return participant;
  };
  const resolve = (name: string): ParticipantDraft | undefined => byId.get(slugifyDslId(name)) ?? byLabel.get(name) ?? byId.get(name);

  for (const segment of segments) {
    const claimed = context.comments.claim(segment.line);
    if (segment.closes) {
      const closing = open.pop();
      if (closing) {
        closing.endOrder = messages.length - 1;
        pendingClose = closing;
      } else {
        context.diagnostics.push(tokenDiagnostic('W101', 'warning', segment.tokens[0], 'Unexpected block close; line dropped'));
      }
      continue;
    }
    // `} else x {` arrives as a close then an open; only the next statement
    // may continue the block that just closed.
    const justClosed = pendingClose;
    pendingClose = null;
    if (segment.tokens[0]?.kind === 'comment' || segment.tokens.length === 0) continue;
    const keyword = segment.tokens[0]!.value;

    if (keyword === 'participant' || keyword === 'actor') {
      const parsed = readAttributes(segment.tokens.slice(1), context.diagnostics);
      const equals = parsed.body.findIndex((token) => token.value === '=');
      const name = joinTokens(equals >= 0 ? parsed.body.slice(equals + 1) : parsed.body);
      const explicitId = equals >= 0 ? joinTokens(parsed.body.slice(0, equals)) : undefined;
      if (!name) {
        fail(segment, 'W101', `${keyword} needs a name`, `${keyword} Alice`);
        continue;
      }
      const actor = keyword === 'actor' || parsed.attributes.some((attribute) => !attribute.key && (attribute.value === 'actor' || attribute.value === 'person'));
      const stereotype = parsed.attributes.find((attribute) => !attribute.key && PARTICIPANT_STEREOTYPES.has(attribute.value))?.value;
      const participant = declare(name, segment.line, true, explicitId);
      participant.kind = actor ? 'actor' : participant.kind;
      if (stereotype) participant.stereotype = stereotype;
      participant.attrs = parsed.attributes.filter((attribute) => (
        attribute.key || (!(attribute.value === 'actor' || attribute.value === 'person') && !PARTICIPANT_STEREOTYPES.has(attribute.value))
      ));
      participant.comments = claimed;
      continue;
    }
    if (keyword === 'activate' || keyword === 'deactivate') {
      const participant = resolve(joinTokens(segment.tokens.slice(1)));
      if (!participant) {
        fail(segment, 'W150', `${keyword} target has no participant`, 'declare it with participant or a message');
        continue;
      }
      participant.activations.push({ order: messages.length, activate: keyword === 'activate' });
      continue;
    }
    if (keyword === 'note') {
      const rest = segment.tokens.slice(1);
      const colon = rest.findIndex((token) => token.value === ':');
      const head = rest.slice(0, colon);
      const position = head[0]?.value === 'over' ? 'over'
        : head[0]?.value === 'left' && head[1]?.value === 'of' ? 'left'
          : head[0]?.value === 'right' && head[1]?.value === 'of' ? 'right' : undefined;
      if (colon < 0 || !position) {
        fail(segment, 'W101', 'note needs over / left of / right of and `: text`', 'note over A, B : text');
        continue;
      }
      const targets = joinTokens(head.slice(position === 'over' ? 1 : 2)).split(',')
        .map((name) => resolve(name.trim()))
        .filter((participant): participant is ParticipantDraft => Boolean(participant));
      if (targets.length === 0) {
        fail(segment, 'W150', 'note target is not a participant', 'declare it with participant or a message');
        continue;
      }
      notes.push({
        id: `note-${notes.length + 1}`, text: joinTokens(rest.slice(colon + 1)), position,
        targets: targets.map((participant) => participant.id), order: messages.length,
        line: segment.line, comments: claimed, parent: open.at(-1)?.id ?? null,
      });
      continue;
    }
    if (FRAGMENT_KINDS.has(keyword)) {
      const parsed = readAttributes(segment.tokens.slice(1), context.diagnostics);
      const branch: BranchDraft = {
        id: uniqueId(`${keyword}-${branches.length + 1}`), type: keyword, condition: joinTokens(parsed.body),
        branchIndex: 0, parent: open.at(-1)?.id ?? null, startOrder: messages.length, endOrder: messages.length - 1,
        line: segment.line, comments: claimed,
      };
      branches.push(branch);
      open.push(branch);
      continue;
    }
    if (keyword === 'else' || keyword === 'and') {
      const current = open.at(-1) ?? justClosed;
      if (!current || current.type !== BRANCH_OF[keyword]) {
        fail(segment, 'W101', `${keyword} needs an open ${BRANCH_OF[keyword]} block`, `${BRANCH_OF[keyword]} { … } ${keyword} { … }`);
        continue;
      }
      current.endOrder = messages.length - 1;
      const parsed = readAttributes(segment.tokens.slice(1), context.diagnostics);
      const branch: BranchDraft = {
        id: uniqueId(`${current.type}-${branches.length + 1}`), type: current.type, condition: joinTokens(parsed.body),
        branchIndex: current.branchIndex + 1, parent: current.parent, startOrder: messages.length,
        endOrder: messages.length - 1, line: segment.line, comments: claimed,
      };
      branches.push(branch);
      if (open.at(-1) === current) open[open.length - 1] = branch;
      else open.push(branch);
      continue;
    }
    if (keyword === 'autonumber') {
      autonumber = true;
      continue;
    }
    if (keyword === 'title' || keyword === 'direction') continue; // document layer owns them
    if (keyword === 'box' || keyword === 'rect' || keyword === 'legend' || keyword === 'align') {
      reserved.push(segment.raw);
      continue;
    }

    const arrowIndex = segment.tokens.findIndex((token) => token.kind === 'arrow' && MESSAGE_ARROWS.has(token.value));
    if (arrowIndex >= 0) {
      const arrow = segment.tokens[arrowIndex]!.value as MessageDraft['arrow'];
      const left = segment.tokens.slice(0, arrowIndex);
      const right = segment.tokens.slice(arrowIndex + 1);
      const equals = left.findIndex((token) => token.value === '=');
      const fromName = joinTokens(equals >= 0 ? left.slice(equals + 1) : left);
      const fromId = equals >= 0 ? joinTokens(left.slice(0, equals)) : undefined;
      const colon = right.findIndex((token) => token.value === ':');
      const parsed = readAttributes(colon >= 0 ? right.slice(colon + 1) : [], context.diagnostics);
      const toName = joinTokens(colon >= 0 ? right.slice(0, colon) : right);
      if (!fromName || !toName) {
        fail(segment, 'W101', 'Message needs a sender and a receiver', 'A -> B : text');
        continue;
      }
      const toEquals = toName.indexOf('=');
      const from = declare(fromName, segment.line, false, fromId);
      const to = declare(toEquals >= 0 ? toName.slice(toEquals + 1).trim() : toName, segment.line, false);
      if (from.firstUseLine === null) from.firstUseLine = segment.line;
      if (to.firstUseLine === null) to.firstUseLine = segment.line;
      const label = joinTokens(parsed.body);
      messages.push({
        id: `msg-${messages.length + 1}`, from: from.id, to: to.id, arrow, order: messages.length,
        ...(label ? { label } : {}), line: segment.line, attrs: parsed.attributes,
        comments: claimed, parent: open.at(-1)?.id ?? null,
      });
      continue;
    }

    // Bare declaration: `api = API Gateway` or `Alice`.
    const parsed = readAttributes(segment.tokens, context.diagnostics);
    const equals = parsed.body.findIndex((token) => token.value === '=');
    const label = joinTokens(equals >= 0 ? parsed.body.slice(equals + 1) : parsed.body);
    const explicitId = equals >= 0 ? joinTokens(parsed.body.slice(0, equals)) : undefined;
    if (!label) {
      fail(segment, 'W101', `Unknown sequence statement ${keyword}`, 'participant, message, note, loop/alt/opt/par/break, activate');
      continue;
    }
    const participant = declare(label, segment.line, true, explicitId);
    const stereotype = parsed.attributes.find((attribute) => !attribute.key && PARTICIPANT_STEREOTYPES.has(attribute.value))?.value;
    if (stereotype) participant.stereotype = stereotype;
    participant.attrs.push(...parsed.attributes.filter((attribute) => attribute.key || !PARTICIPANT_STEREOTYPES.has(attribute.value)));
    participant.comments.push(...claimed);
  }
  while (open.length > 0) {
    const branch = open.pop()!;
    branch.endOrder = messages.length - 1;
    context.diagnostics.push(tokenDiagnostic('W103', 'warning', undefined, `Unclosed ${branch.type} block`, '} inserted'));
  }
  return { participants, messages, notes, branches, autonumber, reserved };
}

function textWidth(text: string, fontSize: number, extra: number): number {
  return Math.round(measurePortableText(text, { fontSize, fontWeight: 600, overflow: 'visible' }).width) + extra;
}

function materialize(model: SeqModel, context: FamilyContext): FamilyScene {
  // Node translations stay frame-relative (the scene composes the parent
  // transform); only connector waypoints are page coordinates.
  void context;
  const laneWidth = new Map(model.participants.map((participant) => [
    participant.id, Math.max(LANE_WIDTH, textWidth(participant.label, 12, 40)),
  ]));
  const laneX = new Map<string, number>();
  let cursor = PADDING.left;
  for (const participant of model.participants) {
    laneX.set(participant.id, cursor);
    cursor += laneWidth.get(participant.id)! + LANE_GAP;
  }
  const lanesRight = model.participants.length > 0 ? cursor - LANE_GAP : PADDING.left + LANE_WIDTH;
  const timelineY = (order: number) => HEADER + ACTOR_EXTRA + MESSAGE_OFFSET + order * MESSAGE_SPACING;
  const lastOrder = Math.max(-1, ...model.messages.map((message) => message.order));
  const branchesBottom = model.branches.reduce((bottom, branch) => Math.max(bottom, timelineY(branch.endOrder) + 48), 0);
  const lifeline = Math.max(
    HEADER + ACTOR_EXTRA + MESSAGE_OFFSET + (lastOrder + 1) * MESSAGE_SPACING + LIFELINE_TAIL,
    branchesBottom + 24,
  );
  const scene = (x: number, y: number) => ({ x, y });
  const nodes: SceneNode[] = [];
  const connectors: SceneConnector[] = [];

  // Fragments first: their fills paint behind the participants (draw order).
  for (const branch of model.branches) {
    const startY = timelineY(branch.startOrder) - 44;
    const endY = branch.endOrder >= branch.startOrder ? timelineY(branch.endOrder) : startY + 8;
    const topLeft = scene(PADDING.left - FRAGMENT_INSET, startY);
    nodes.push({
      id: branch.id, kind: 'annotation', parentId: null, layerId: 'default', zIndex: 0,
      transform: { translation: topLeft, rotationRadians: 0, scale: { x: 1, y: 1 } },
      size: {
        width: Math.max(220, lanesRight - PADDING.left + FRAGMENT_INSET + 30),
        height: Math.max(64, endY - startY + 44),
      },
      content: {
        seqFragmentId: branch.id,
        label: branch.branchIndex === 0 ? branch.type.toUpperCase() : branch.type === 'par' ? 'AND' : 'ELSE',
        ...(branch.condition ? { subLabel: branch.condition } : {}),
        color: FRAGMENT_COLORS[branch.type] ?? 'violet',
        seqMessageOrder: branch.startOrder,
      },
      appearance: {}, ports: [],
      metadata: {
        dsl: {
          id: branch.id, line: branch.line, seqBranch: true, seqFragmentType: branch.type,
          seqFragmentBranch: branch.branchIndex, seqFragmentParent: branch.parent,
          seqFragmentStart: branch.startOrder, seqFragmentEnd: branch.endOrder,
          ...(branch.comments.length ? { comments: branch.comments } : {}),
        },
      },
      extensions: {},
    });
  }

  for (const participant of model.participants) {
    const actor = participant.kind === 'actor';
    const typed = typedFrom(participant.attrs);
    const palette = typed.color && !isHexColor(typed.color) ? COLOR_WORDS[typed.color]?.key : undefined;
    const custom = typed.color && isHexColor(typed.color) ? typed.color : undefined;
    const attrs = nonVisualAttributes(typed, 'node');
    nodes.push({
      id: participant.id, kind: 'sequence_participant', parentId: null, layerId: 'default', zIndex: 1,
      transform: { translation: scene(laneX.get(participant.id)!, actor ? 0 : ACTOR_EXTRA), rotationRadians: 0, scale: { x: 1, y: 1 } },
      size: { width: laneWidth.get(participant.id)!, height: lifeline + (actor ? ACTOR_EXTRA : 0) },
      content: {
        label: participant.label,
        seqParticipantKind: participant.kind,
        ...(participant.activations.length ? { seqActivations: participant.activations.map((activation) => ({ ...activation })) } : {}),
        ...(custom ? { color: 'custom', customColor: custom } : palette ? { color: palette } : {}),
      },
      appearance: {}, ports: [],
      metadata: {
        dsl: {
          id: participant.id, line: participant.line, seqParticipant: true,
          seqDeclared: participant.declared,
          ...(participant.stereotype ? { seqStereotype: participant.stereotype } : {}),
          ...(participant.firstUseLine !== null ? { seqFirstUseLine: participant.firstUseLine } : {}),
          ...(attrs.length ? { attrs: attrsToJson(attrs) } : {}),
          ...(participant.comments.length ? { comments: participant.comments } : {}),
        },
      },
      extensions: {},
    });
  }

  for (const message of model.messages) {
    const attrs = nonVisualAttributes(typedFrom(message.attrs), 'edge');
    const self = message.from === message.to;
    connectors.push({
      id: message.id,
      source: { nodeId: message.from, portId: null, anchor: null, point: null },
      target: { nodeId: message.to, portId: null, anchor: null, point: null },
      route: { kind: 'direct', ownership: 'automatic' }, waypoints: [],
      labels: message.label ? [{ id: `${message.id}-label`, text: message.label, pathRatio: 0.5, offset: { x: 0, y: 0 }, metadata: {} }] : [],
      appearance: {},
      semantics: { seqMessageKind: self ? 'self' : message.arrow === '-->' || message.arrow === '-->>' ? 'return' : message.arrow === '->>' ? 'async' : 'sync', seqMessageOrder: message.order },
      metadata: {
        dsl: {
          line: message.line, seqArrow: message.arrow,
          ...(attrs.length ? { attrs: attrsToJson(attrs) } : {}),
          ...(message.comments.length ? { comments: message.comments } : {}),
        },
      },
      extensions: {},
    });
  }

  for (const note of model.notes) {
    const width = Math.max(180, textWidth(note.text, 11, 44));
    const height = Math.max(56, Math.round(measurePortableText(note.text, { fontSize: 11, fontWeight: 500, maxWidth: width - 24, overflow: 'wrap' }).height) + 40);
    const firstLane = laneX.get(note.targets[0]!) ?? PADDING.left;
    const lastLane = laneX.get(note.targets.at(-1)!) ?? firstLane;
    const x = note.position === 'over'
      ? (firstLane + lastLane + laneWidth.get(note.targets[0]!)!) / 2 - width / 2
      : note.position === 'left'
        ? firstLane - width - 32
        : firstLane + laneWidth.get(note.targets[0]!)! + 32;
    nodes.push({
      id: note.id, kind: 'sequence_note', parentId: null, layerId: 'default', zIndex: 2,
      transform: { translation: scene(x, timelineY(note.order) - 18), rotationRadians: 0, scale: { x: 1, y: 1 } },
      size: { width, height },
      content: { label: note.text, seqNotePosition: note.position, seqNoteTargets: [...note.targets], seqMessageOrder: note.order },
      appearance: {}, ports: [],
      metadata: { dsl: { id: note.id, line: note.line, seqNote: true, ...(note.comments.length ? { comments: note.comments } : {}) } },
      extensions: {},
    });
  }

  const width = Math.max(lanesRight, ...nodes.map((node) => node.transform.translation.x + node.size.width)) + PADDING.right;
  const height = Math.max(lifeline + PADDING.bottom, ...nodes.map((node) => node.transform.translation.y + node.size.height + 24));
  return {
    nodes,
    connectors,
    size: { width, height },
    meta: {
      ...(model.autonumber ? { seqAutonumber: true } : {}),
      ...(model.reserved.length ? { reserved: model.reserved } : {}),
    },
  };
}

/* ---------------------------------------------------------------- serialization */

interface SceneBranch {
  node: SceneNode;
  id: string;
  type: string;
  branchIndex: number;
  parent: string | null;
  start: number;
  end: number;
  line: number;
}

/** Strict line order is the canonical form; blocks re-open around their messages. */
function sequenceText(scene: DslFrameScene): string[] {
  const raw = dslFrameRaw(scene.frame);
  const participants = scene.nodes.filter((node) => node.kind === 'sequence_participant');
  const notes = scene.nodes.filter((node) => node.kind === 'sequence_note');
  const byId = new Map(participants.map((node) => [node.id, node]));
  const messages = [...scene.connectors];
  const branches: SceneBranch[] = scene.nodes
    .filter((node) => node.kind === 'annotation' && (node.metadata.dsl as { seqBranch?: boolean })?.seqBranch)
    .map((node) => {
      const meta = node.metadata.dsl as Record<string, unknown>;
      return {
        node, id: node.id,
        type: typeof meta.seqFragmentType === 'string' ? meta.seqFragmentType : 'alt',
        branchIndex: typeof meta.seqFragmentBranch === 'number' ? meta.seqFragmentBranch : 0,
        parent: typeof meta.seqFragmentParent === 'string' ? meta.seqFragmentParent : null,
        start: typeof meta.seqFragmentStart === 'number' ? meta.seqFragmentStart : 0,
        end: typeof meta.seqFragmentEnd === 'number' ? meta.seqFragmentEnd : -1,
        line: Number(meta.line ?? 0),
      };
    })
    .sort((a, b) => a.line - b.line);
  const orderOf = (connector: SceneConnector) => typeof connector.semantics.seqMessageOrder === 'number' ? connector.semantics.seqMessageOrder : 0;
  /** Innermost branch that contains a message order. */
  const ownerOf = (order: number): string | null => {
    let best: SceneBranch | null = null;
    for (const branch of branches) {
      if (order < branch.start || order > branch.end) continue;
      if (!best || branch.start >= best.start) best = branch;
    }
    return best?.id ?? null;
  };
  const heads = branches.filter((branch) => branch.branchIndex === 0);
  /** Branches after `head` that continue the same block (else/and), scoped by line. */
  const continuationsOf = (head: SceneBranch): SceneBranch[] => {
    const nextHeadLine = heads
      .filter((candidate) => candidate.parent === head.parent && candidate.type === head.type && candidate.line > head.line)
      .reduce((minimum, candidate) => Math.min(minimum, candidate.line), Number.POSITIVE_INFINITY);
    return branches
      .filter((candidate) => candidate.parent === head.parent && candidate.type === head.type
        && candidate.branchIndex > head.branchIndex && candidate.line > head.line && candidate.line < nextHeadLine)
      .sort((a, b) => a.branchIndex - b.branchIndex);
  };

  const participantLine = (node: SceneNode): string[] => {
    const meta = dslNodeMeta(node);
    const attrs: CanonicalAttribute[] = [];
    if (node.content.seqParticipantKind === 'actor') attrs.push({ value: 'actor' });
    const stereotype = (node.metadata.dsl as { seqStereotype?: string }).seqStereotype;
    if (typeof stereotype === 'string' && stereotype) attrs.push({ value: stereotype });
    const kept = (node.metadata.dsl as { attrs?: CanonicalAttribute[] }).attrs;
    if (Array.isArray(kept)) attrs.push(...kept);
    const word = colorWordOf(node);
    if (word) attrs.push({ value: word });
    return [...commentLines(meta.comments, ''), `participant ${nodeName(node)}${attributeText(sortAttributes(attrs))}`];
  };
  const messageLine = (connector: SceneConnector): string[] => {
    const from = connector.source.nodeId ? byId.get(connector.source.nodeId) : undefined;
    const to = connector.target.nodeId ? byId.get(connector.target.nodeId) : undefined;
    if (!from || !to) return [];
    const meta = dslConnectorMeta(connector);
    const arrow = (connector.metadata.dsl as { seqArrow?: string }).seqArrow ?? '->';
    const label = connector.labels[0]?.text;
    return [...commentLines(meta.comments, ''), `${nodeName(from)} ${arrow} ${nodeName(to)}${label ? ` : ${quote(label)}` : ''}${attributeText(sortAttributes(meta.attrs ?? []))}`];
  };
  const noteLine = (node: SceneNode): string[] => {
    const meta = dslNodeMeta(node);
    const targets = Array.isArray(node.content.seqNoteTargets) ? node.content.seqNoteTargets as string[] : [];
    const position = node.content.seqNotePosition === 'left' || node.content.seqNotePosition === 'right' ? node.content.seqNotePosition : 'over';
    const names = targets.map((id) => { const target = byId.get(id); return target ? nodeName(target) : quote(id); });
    return [...commentLines(meta.comments, ''), `note ${position === 'over' ? 'over' : `${position} of`} ${names.join(', ')} : ${quote(String(node.content.label ?? ''))}`];
  };

  /** A declared participant keeps its lane order; auto-declared ones ride their messages. */
  const needsDeclaration = (node: SceneNode): boolean => {
    const meta = dslNodeMeta(node);
    if (node.content.seqParticipantKind === 'actor') return true;
    if (typeof (node.metadata.dsl as { seqStereotype?: string }).seqStereotype === 'string') return true;
    if (meta.name !== undefined || slugifyDslId(nodeLabelOf(node)) !== node.id) return true;
    if ((node.metadata.dsl as { attrs?: unknown }).attrs) return true;
    if (colorWordOf(node)) return true;
    const firstUseLine = (node.metadata.dsl as { seqFirstUseLine?: number }).seqFirstUseLine;
    if (firstUseLine === undefined) return true;
    return (node.metadata.dsl as { seqDeclared?: boolean }).seqDeclared === true && meta.line <= firstUseLine;
  };

  const emitBlock = (head: SceneBranch, indent: string): string[] => {
    const out: string[] = [...commentLines(dslNodeMeta(head.node).comments, indent)];
    const group = [head, ...continuationsOf(head)];
    group.forEach((branch, index) => {
      const condition = conditionOf(branch);
      const opener = index === 0 ? branch.type : branch.type === 'par' ? 'and' : 'else';
      out.push(`${indent}${index === 0 ? '' : '} '}${opener}${condition ? ` ${condition}` : ''} {`);
      out.push(...emitChildren(branch.id, `${indent}  `));
    });
    out.push(`${indent}}`);
    return out;
  };
  function emitChildren(parent: string | null, indent: string): string[] {
    type Item = { line: number; rank: number; lines: string[] };
    const items: Item[] = [];
    if (parent === null) {
      for (const participant of participants) {
        if (!needsDeclaration(participant)) continue;
        items.push({ line: dslNodeMeta(participant).line, rank: 0, lines: participantLine(participant).map((text) => `${indent}${text}`) });
      }
    }
    for (const message of messages) {
      if (ownerOf(orderOf(message)) !== parent) continue;
      items.push({ line: dslConnectorMeta(message).line, rank: 1, lines: messageLine(message).map((text) => `${indent}${text}`) });
    }
    for (const note of notes) {
      const order = typeof note.content.seqMessageOrder === 'number' ? note.content.seqMessageOrder : 0;
      if (ownerOf(order) !== parent) continue;
      items.push({ line: dslNodeMeta(note).line, rank: 2, lines: noteLine(note).map((text) => `${indent}${text}`) });
    }
    for (const branch of heads) {
      if (branch.parent !== parent) continue;
      items.push({ line: branch.line, rank: 3, lines: emitBlock(branch, indent) });
    }
    return items.sort((a, b) => a.line - b.line || a.rank - b.rank).flatMap((item) => item.lines);
  }

  const lines: string[] = [];
  if (raw.seqAutonumber === true) lines.push('autonumber');
  lines.push(...emitChildren(null, ''));
  const reserved = Array.isArray(raw.reserved) ? raw.reserved.filter((item): item is string => typeof item === 'string') : [];
  lines.push(...reserved);
  return lines;
}

function conditionOf(branch: SceneBranch): string {
  return typeof branch.node.content.subLabel === 'string' ? branch.node.content.subLabel : '';
}

function nodeLabelOf(node: SceneNode): string {
  return typeof node.content.label === 'string' && node.content.label.length > 0 ? node.content.label : node.id;
}

function colorWordOf(node: SceneNode): string | undefined {
  const color = node.content.color;
  if (typeof color !== 'string' || color === 'slate') return undefined;
  return Object.keys(COLOR_WORDS).find((candidate) => COLOR_WORDS[candidate]!.key === color);
}

export const sequenceFamily: Family = {
  name: 'sequence',
  async compile(segments, context) {
    return materialize(parseSequence(segments, context), context);
  },
  serialize: sequenceText,
};
