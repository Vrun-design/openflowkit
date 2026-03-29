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

  participants.forEach((node) => {
    const id = participantIdByNodeId.get(node.id) ?? sanitizeId(node.id);
    const acts = node.data.seqActivations;
    if (acts && acts.length > 0) {
      acts.forEach((_, i) => {
        lines.push(`    ${i % 2 === 0 ? 'activate' : 'deactivate'} ${id}`);
      });
    }
  });

  notes.forEach((node) => {
    const text = String(node.data.label || '');
    const target = node.data.seqNoteTarget || '';
    const position = node.data.seqNotePosition || 'over';
    if (text && target) {
      lines.push(`    note ${position} ${sanitizeId(target)}: ${sanitizeLabel(text)}`);
    }
  });

  let currentFrag: { type: string; condition: string } | null = null;
  sortedEdges.forEach((edge) => {
    const frag = edge.data?.seqFragment;

    if (
      currentFrag &&
      (!frag || frag.type !== currentFrag.type || frag.condition !== currentFrag.condition)
    ) {
      lines.push('    end');
      currentFrag = null;
    }

    if (frag && !currentFrag) {
      lines.push(`    ${frag.type} ${frag.condition}`);
      currentFrag = { type: frag.type, condition: frag.condition };
    }

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
