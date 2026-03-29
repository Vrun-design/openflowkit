import type { FlowEdge, FlowNode } from '@/lib/types';
import type { DiagramPlugin } from '@/diagram-types/core';

interface ParsedParticipant {
  id: string;
  label: string;
  kind: 'participant' | 'actor';
  alias?: string;
}

interface ParsedMessage {
  from: string;
  to: string;
  label: string;
  kind: 'sync' | 'async' | 'return' | 'self' | 'create' | 'destroy';
}

interface ParsedFragment {
  type: 'alt' | 'loop' | 'opt' | 'par' | 'break' | 'critical';
  condition: string;
  startOrder: number;
  elseOrder?: number;
}

interface ParsedActivation {
  participant: string;
  activate: boolean;
  order: number;
}

interface ParsedNote {
  text: string;
  target: string;
  position: 'over' | 'left' | 'right';
  order: number;
}

function resolveMessageKind(arrow: string): ParsedMessage['kind'] {
  if (arrow === '-->' || arrow === '-->>' || arrow === '-->>>' || arrow === '--x') return 'return';
  if (arrow === '-)' || arrow === '--)') return 'async';
  if (arrow === '-x') return 'destroy';
  return 'sync';
}

function parseSequence(input: string): {
  nodes: FlowNode[];
  edges: FlowEdge[];
  error?: string;
  diagnostics?: string[];
} {
  const lines = input.replace(/\r\n/g, '\n').split('\n');
  const participants: ParsedParticipant[] = [];
  const messages: ParsedMessage[] = [];
  const fragments: ParsedFragment[] = [];
  const activations: ParsedActivation[] = [];
  const notes: ParsedNote[] = [];
  const knownIds = new Set<string>();
  const diagnostics: string[] = [];
  let hasHeader = false;
  let messageOrder = 0;
  const fragmentStack: Array<{
    type: ParsedFragment['type'];
    condition: string;
    startOrder: number;
  }> = [];

  function ensureParticipant(name: string): void {
    if (knownIds.has(name)) return;
    participants.push({ id: name, label: name, kind: 'participant' });
    knownIds.add(name);
  }

  for (const [index, rawLine] of lines.entries()) {
    const lineNumber = index + 1;
    const line = rawLine.trim();
    if (!line || line.startsWith('%%')) continue;

    if (/^sequenceDiagram\b/i.test(line)) {
      hasHeader = true;
      continue;
    }
    if (!hasHeader) continue;

    if (/^title\b/i.test(line)) continue;
    if (/^autonumber\b/i.test(line)) continue;

    const participantMatch = line.match(/^(participant|actor)\s+(.+?)(?:\s+as\s+(.+))?$/i);
    if (participantMatch) {
      const kind = participantMatch[1].toLowerCase() as 'participant' | 'actor';
      const rawId = participantMatch[2].trim();
      const alias = participantMatch[3]?.trim();
      if (!knownIds.has(rawId)) {
        participants.push({ id: rawId, label: alias || rawId, kind, alias });
        knownIds.add(rawId);
      }
      continue;
    }

    const activateMatch = line.match(/^(activate|deactivate)\s+(\S+)/i);
    if (activateMatch) {
      const isActivate = activateMatch[1].toLowerCase() === 'activate';
      const participant = activateMatch[2];
      ensureParticipant(participant);
      activations.push({ participant, activate: isActivate, order: messageOrder });
      continue;
    }

    const fragmentMatch = line.match(/^(alt|loop|opt|par|break|critical)\s+(.+)$/i);
    if (fragmentMatch) {
      fragmentStack.push({
        type: fragmentMatch[1].toLowerCase() as ParsedFragment['type'],
        condition: fragmentMatch[2].trim(),
        startOrder: messageOrder,
      });
      continue;
    }

    const elseMatch = line.match(/^else\s+(.+)$/i);
    if (elseMatch && fragmentStack.length > 0) {
      const top = fragmentStack[fragmentStack.length - 1];
      if (top.type === 'alt') {
        fragments.push({
          type: top.type,
          condition: top.condition,
          startOrder: top.startOrder,
          elseOrder: messageOrder,
        });
        top.condition = elseMatch[1].trim();
        top.startOrder = messageOrder;
      }
      continue;
    }

    if (/^end\b/i.test(line)) {
      if (fragmentStack.length > 0) {
        const top = fragmentStack.pop()!;
        fragments.push({ type: top.type, condition: top.condition, startOrder: top.startOrder });
      }
      continue;
    }

    const noteMatch = line.match(
      /^note\s+(left of|right of|over)\s+(\S+?)(?:,\s*(\S+))?\s*:\s*(.+)$/i
    );
    if (noteMatch) {
      const position = noteMatch[1].toLowerCase().replace(' ', '_') as 'left' | 'right' | 'over';
      const target1 = noteMatch[2];
      const target2 = noteMatch[3];
      const text = noteMatch[4].trim();
      ensureParticipant(target1);
      if (target2) ensureParticipant(target2);
      notes.push({ text, target: target1, position, order: messageOrder });
      continue;
    }

    const arrowPatterns = ['-->>>', '-->>', '-->', '--x', '--)', '->>>', '->>', '->', '-x', '-)'];
    let matched = false;
    for (const arrow of arrowPatterns) {
      const arrowIndex = line.indexOf(arrow);
      if (arrowIndex <= 0) continue;
      const from = line.slice(0, arrowIndex).trim();
      const rest = line.slice(arrowIndex + arrow.length).trim();
      const colonIndex = rest.indexOf(':');
      const to = colonIndex >= 0 ? rest.slice(0, colonIndex).trim() : rest.trim();
      const label = colonIndex >= 0 ? rest.slice(colonIndex + 1).trim() : '';

      if (!from || !to) {
        diagnostics.push(`Invalid message at line ${lineNumber}: "${line}"`);
        matched = true;
        break;
      }

      ensureParticipant(from);
      ensureParticipant(to);

      const isSelf = from === to;
      const kind = isSelf ? 'self' : resolveMessageKind(arrow);
      messages.push({ from, to, label, kind });
      messageOrder++;
      matched = true;
      break;
    }

    if (!matched && /(->|-->|->>|-->>|-x|--x)/.test(line)) {
      diagnostics.push(`Unrecognized message syntax at line ${lineNumber}: "${line}"`);
    }
  }

  if (!hasHeader) {
    return { nodes: [], edges: [], error: 'Missing sequenceDiagram header.' };
  }

  if (participants.length === 0) {
    return { nodes: [], edges: [], error: 'No participants found.' };
  }

  const LANE_WIDTH = 220;
  const participantKindMap = new Map(participants.map((p) => [p.id, p.kind]));

  const activationByParticipant = new Map<string, number[]>();
  for (const act of activations) {
    if (!activationByParticipant.has(act.participant))
      activationByParticipant.set(act.participant, []);
    activationByParticipant.get(act.participant)!.push(act.order);
  }

  const nodes: FlowNode[] = participants.map((p, i) => ({
    id: p.id,
    type: 'sequence_participant',
    position: { x: i * LANE_WIDTH, y: 0 },
    data: {
      label: p.label,
      seqParticipantKind: p.kind,
      seqParticipantAlias: p.alias,
      seqActivations: activationByParticipant.get(p.id),
    },
  }));

  const edges: FlowEdge[] = messages.map((msg, i) => {
    const frag = fragments.find((f) => {
      const end = f.elseOrder !== undefined ? f.elseOrder : f.startOrder;
      return i >= f.startOrder && i <= end;
    });

    return {
      id: `e-seq-${i + 1}`,
      source: msg.from,
      target: msg.to,
      sourceHandle: 'top',
      targetHandle: 'top',
      label: msg.label || undefined,
      type: 'sequence_message',
      data: {
        seqMessageKind: msg.kind,
        seqMessageOrder: i,
        sourceIsActor: participantKindMap.get(msg.from) === 'actor',
        targetIsActor: participantKindMap.get(msg.to) === 'actor',
        seqFragment: frag ? { type: frag.type, condition: frag.condition, edgeIds: [] } : undefined,
      },
    };
  });

  const noteNodes: FlowNode[] = notes.map((note, i) => ({
    id: `seq-note-${i + 1}`,
    type: 'sequence_note',
    position: { x: 0, y: 0 },
    data: {
      label: note.text,
      seqNoteTarget: note.target,
      seqNotePosition: note.position,
      seqMessageOrder: note.order,
    },
  }));

  return {
    nodes: [...nodes, ...noteNodes],
    edges,
    ...(diagnostics.length > 0 ? { diagnostics } : {}),
  };
}

export const SEQUENCE_PLUGIN: DiagramPlugin = {
  id: 'sequence',
  displayName: 'Sequence Diagram',
  parseMermaid: parseSequence,
};
