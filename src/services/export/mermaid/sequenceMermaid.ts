import type { FlowEdge, FlowNode } from '@/lib/types';
import { sanitizeId, sanitizeLabel } from '../formatting';

function sortNodesByPosition(nodes: FlowNode[]): FlowNode[] {
  return [...nodes].sort((left, right) => {
    if (left.position.y !== right.position.y) return left.position.y - right.position.y;
    if (left.position.x !== right.position.x) return left.position.x - right.position.x;
    return left.id.localeCompare(right.id);
  });
}

function resolveSequenceArrow(kind: string | undefined): string {
  if (kind === 'async') return '-)';
  if (kind === 'return') return '-->>';
  if (kind === 'destroy') return '-x';
  return '->>';
}

function sortSequenceActivations(
  activations: Array<{ order: number; activate: boolean }> | undefined
): Array<{ order: number; activate: boolean }> {
  return [...(activations ?? [])].sort((left, right) => left.order - right.order);
}

type SequenceFragmentState = {
  type: string;
  condition: string;
  branchKind?: 'start' | 'else' | 'and';
};

function syncFragmentState(
  lines: string[],
  currentFrag: SequenceFragmentState | null,
  nextFrag: SequenceFragmentState | null
): SequenceFragmentState | null {
  if (
    currentFrag &&
    nextFrag &&
    currentFrag.type === nextFrag.type &&
    currentFrag.condition !== nextFrag.condition
  ) {
    if (nextFrag.type === 'alt' && nextFrag.branchKind === 'else') {
      lines.push(`    else ${nextFrag.condition}`);
      return nextFrag;
    }
    if (nextFrag.type === 'par' && nextFrag.branchKind === 'and') {
      lines.push(`    and ${nextFrag.condition}`);
      return nextFrag;
    }
    lines.push('    end');
    currentFrag = null;
  }

  if (
    currentFrag &&
    (!nextFrag || nextFrag.type !== currentFrag.type || nextFrag.condition !== currentFrag.condition)
  ) {
    lines.push('    end');
    currentFrag = null;
  }

  if (nextFrag && !currentFrag) {
    lines.push(`    ${nextFrag.type} ${nextFrag.condition}`);
    return nextFrag;
  }

  return currentFrag;
}

export function toSequenceMermaid(nodes: FlowNode[], edges: FlowEdge[]): string {
  const lines: string[] = ['sequenceDiagram'];
  const participantIdByNodeId = new Map<string, string>();

  const participants = sortNodesByPosition(nodes.filter((n) => n.type === 'sequence_participant'));
  const notes = nodes.filter((n) => n.type === 'sequence_note');
  const sortedEdges = [...edges].sort((a, b) => {
    const ao = typeof a.data?.seqMessageOrder === 'number' ? a.data.seqMessageOrder : 0;
    const bo = typeof b.data?.seqMessageOrder === 'number' ? b.data.seqMessageOrder : 0;
    return ao - bo;
  });

  participants.forEach((node) => {
    const kind = node.data.seqParticipantKind || 'participant';
    const label = String(node.data.label || node.id).trim() || node.id;
    const id = sanitizeId(node.id);
    participantIdByNodeId.set(node.id, id);
    const explicitAlias =
      typeof node.data.seqParticipantAlias === 'string' ? node.data.seqParticipantAlias.trim() : '';
    if (explicitAlias) {
      lines.push(`    ${kind} ${id} as ${sanitizeLabel(label)}`);
    } else if (id !== label) {
      lines.push(`    ${kind} ${id} as ${sanitizeLabel(label)}`);
    } else {
      lines.push(`    ${kind} ${id}`);
    }
  });

  const activations = participants.flatMap((node) => {
    const id = participantIdByNodeId.get(node.id) ?? sanitizeId(node.id);
    return sortSequenceActivations(node.data.seqActivations).map((activation) => ({
      kind: 'activation' as const,
      order: activation.order,
      participantId: id,
      activation,
    }));
  });

  const timelineEntries = [
    ...notes.map((node) => ({
      kind: 'note' as const,
      order: typeof node.data.seqMessageOrder === 'number' ? node.data.seqMessageOrder : 0,
      node,
    })),
    ...activations,
    ...sortedEdges.map((edge) => ({
      kind: 'edge' as const,
      order: typeof edge.data?.seqMessageOrder === 'number' ? edge.data.seqMessageOrder : 0,
      edge,
    })),
  ].sort((left, right) => {
    if (left.order !== right.order) return left.order - right.order;
    const timelinePriority = { note: 0, activation: 1, edge: 2 };
    return timelinePriority[left.kind] - timelinePriority[right.kind];
  });

  let currentFrag: SequenceFragmentState | null = null;
  timelineEntries.forEach((entry) => {
    if (entry.kind === 'note') {
      const node = entry.node;
      const noteFrag = node.data.seqFragment
        ? {
            type: node.data.seqFragment.type,
            condition: node.data.seqFragment.condition,
            branchKind: node.data.seqFragment.branchKind,
          }
        : null;
      currentFrag = syncFragmentState(lines, currentFrag, noteFrag);
      const text = String(node.data.label || '');
      const position = node.data.seqNotePosition || 'over';
      const rawTargets = Array.isArray(node.data.seqNoteTargets)
        ? node.data.seqNoteTargets
        : typeof node.data.seqNoteTarget === 'string'
          ? [node.data.seqNoteTarget]
          : [];
      const targets = rawTargets
        .map((target) => (typeof target === 'string' ? target.trim() : ''))
        .filter(Boolean)
        .map((target) => sanitizeId(target));

      if (text && targets.length > 0) {
        const targetExpr = position === 'over' && targets.length > 1
          ? `${targets[0]}, ${targets[1]}`
          : targets[0];
        lines.push(`    note ${position} ${targetExpr}: ${sanitizeLabel(text)}`);
      }
      return;
    }

    if (entry.kind === 'activation') {
      lines.push(`    ${entry.activation.activate ? 'activate' : 'deactivate'} ${entry.participantId}`);
      return;
    }

    const edge = entry.edge;
    const frag = edge.data?.seqFragment
      ? {
          type: edge.data.seqFragment.type,
          condition: edge.data.seqFragment.condition,
          branchKind: edge.data.seqFragment.branchKind,
        }
      : null;

    currentFrag = syncFragmentState(lines, currentFrag, frag);

    const arrow = resolveSequenceArrow(edge.data?.seqMessageKind);
    const label = typeof edge.label === 'string' ? edge.label.trim() : '';
    const suffix = label ? `: ${label}` : '';
    const source = participantIdByNodeId.get(edge.source) ?? sanitizeId(edge.source);
    const target = participantIdByNodeId.get(edge.target) ?? sanitizeId(edge.target);
    lines.push(`    ${source}${arrow}${target}${suffix}`);
  });

  if (currentFrag) {
    lines.push('    end');
  }

  return `${lines.join('\n')}\n`;
}
