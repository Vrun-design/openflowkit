import { resolveNodeSize } from '@/lib/nodeSize';
import type { FlowEdge, FlowNode } from '@/lib/types';
import { estimateWrappedTextBox } from '@/services/elk-layout/textSizing';
import {
  SEQ_ACTOR_EXTRA_H,
  SEQ_BOX_H,
  SEQ_LANE_GAP,
  SEQ_MSG_OFFSET,
  SEQ_MSG_SPACING,
  SEQ_NODE_W,
} from '@/services/sequence/layoutConstants';

function sortByPosition<T extends FlowNode | FlowEdge>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const leftOrder =
      'data' in left && typeof left.data?.seqMessageOrder === 'number' ? left.data.seqMessageOrder : null;
    const rightOrder =
      'data' in right && typeof right.data?.seqMessageOrder === 'number' ? right.data.seqMessageOrder : null;

    if (leftOrder !== null || rightOrder !== null) {
      if (leftOrder === null) return 1;
      if (rightOrder === null) return -1;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    }

    const leftX = 'position' in left ? left.position.x : 0;
    const rightX = 'position' in right ? right.position.x : 0;
    if (leftX !== rightX) {
      return leftX - rightX;
    }

    return left.id.localeCompare(right.id);
  });
}

function getMeasuredNodeSize(node: FlowNode, minWidth: number, minHeight: number): { width: number; height: number } {
  const measuredNode = node as FlowNode & { measured?: { width?: number; height?: number } };
  const measuredWidth = measuredNode.measured?.width;
  const measuredHeight = measuredNode.measured?.height;
  if (typeof measuredWidth === 'number' && typeof measuredHeight === 'number') {
    return {
      width: Math.max(measuredWidth, minWidth),
      height: Math.max(measuredHeight, minHeight),
    };
  }

  const resolved = resolveNodeSize(node);
  return {
    width: Math.max(resolved.width, minWidth),
    height: Math.max(resolved.height, minHeight),
  };
}

function getSequenceTimelineY(order: number): number {
  return SEQ_BOX_H + SEQ_ACTOR_EXTRA_H + SEQ_MSG_OFFSET + order * SEQ_MSG_SPACING;
}

function buildParticipantCenters(participants: FlowNode[]): Map<string, { left: number; center: number; width: number }> {
  const centers = new Map<string, { left: number; center: number; width: number }>();
  let currentLeft = 0;

  for (const participant of participants) {
    const size = getMeasuredNodeSize(participant, SEQ_NODE_W, SEQ_BOX_H + SEQ_ACTOR_EXTRA_H);
    centers.set(participant.id, {
      left: currentLeft,
      center: currentLeft + size.width / 2,
      width: size.width,
    });
    currentLeft += size.width + SEQ_LANE_GAP;
  }

  return centers;
}

function relayoutParticipants(
  participants: FlowNode[],
  centers: Map<string, { left: number; center: number; width: number }>
): FlowNode[] {
  return participants.map((participant) => ({
    ...participant,
    position: {
      x: centers.get(participant.id)?.left ?? participant.position.x,
      y: participant.data?.seqParticipantKind === 'actor' ? 0 : SEQ_ACTOR_EXTRA_H,
    },
  }));
}

function relayoutNotes(
  notes: FlowNode[],
  centers: Map<string, { left: number; center: number; width: number }>
): FlowNode[] {
  return sortByPosition(notes).map((note) => {
    const order =
      typeof note.data?.seqMessageOrder === 'number' ? note.data.seqMessageOrder : 0;
    const noteSize = estimateWrappedTextBox(String(note.data?.label ?? ''), {
      minWidth: 120,
      minHeight: 56,
      maxWidth: 180,
      lineHeight: 18,
      verticalPadding: 14,
    });
    const targetIds = Array.isArray(note.data?.seqNoteTargets)
      ? note.data.seqNoteTargets.filter((targetId): targetId is string => typeof targetId === 'string')
      : typeof note.data?.seqNoteTarget === 'string'
        ? [note.data.seqNoteTarget]
        : [];
    const targetCenters = targetIds
      .map((targetId) => centers.get(targetId))
      .filter((value): value is { left: number; center: number; width: number } => Boolean(value));
    const primaryCenter = targetCenters[0];
    const sharedCenter =
      targetCenters.length >= 2
        ? (targetCenters[0].center + targetCenters[targetCenters.length - 1].center) / 2
        : primaryCenter?.center;

    let x = note.position.x;
    if (note.data?.seqNotePosition === 'left' && primaryCenter) {
      x = primaryCenter.left - noteSize.width - 32;
    } else if (note.data?.seqNotePosition === 'right' && primaryCenter) {
      x = primaryCenter.left + primaryCenter.width + 32;
    } else if (typeof sharedCenter === 'number') {
      x = sharedCenter - noteSize.width / 2;
    }

    return {
      ...note,
      position: {
        x,
        y: getSequenceTimelineY(order) - 18,
      },
      style: {
        ...note.style,
        width: noteSize.width,
        minHeight: noteSize.height,
      },
    };
  });
}

function relayoutFragments(
  fragments: FlowNode[],
  participants: FlowNode[]
): FlowNode[] {
  const leftEdge = participants[0]?.position.x ?? 0;

  return sortByPosition(fragments).map((fragment, index) => {
    const order =
      typeof fragment.data?.seqMessageOrder === 'number' ? fragment.data.seqMessageOrder : index;
    const fragmentSize = estimateWrappedTextBox(String(fragment.data?.subLabel ?? fragment.data?.label ?? ''), {
      minWidth: 136,
      minHeight: 54,
      maxWidth: 196,
      lineHeight: 18,
      verticalPadding: 14,
    });

    return {
      ...fragment,
      position: {
        x: leftEdge - fragmentSize.width - 36,
        y: getSequenceTimelineY(order) - 28,
      },
      style: {
        ...fragment.style,
        width: fragmentSize.width,
        minHeight: fragmentSize.height,
      },
    };
  });
}

export function relayoutSequenceDiagram(
  nodes: FlowNode[],
  edges: FlowEdge[]
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const participants = sortByPosition(nodes.filter((node) => node.type === 'sequence_participant'));
  if (participants.length === 0) {
    return { nodes, edges };
  }

  const centers = buildParticipantCenters(participants);
  const notes = nodes.filter((node) => node.type === 'sequence_note');
  const fragments = nodes.filter(
    (node) => node.type === 'annotation' && typeof node.data?.seqFragmentId === 'string'
  );
  const remainingNodes = nodes.filter(
    (node) =>
      node.type !== 'sequence_participant'
      && node.type !== 'sequence_note'
      && !(node.type === 'annotation' && typeof node.data?.seqFragmentId === 'string')
  );

  const layoutedParticipants = relayoutParticipants(participants, centers);
  const layoutedNotes = relayoutNotes(notes, centers);
  const layoutedFragments = relayoutFragments(fragments, layoutedParticipants);

  return {
    nodes: [...layoutedParticipants, ...layoutedNotes, ...layoutedFragments, ...remainingNodes],
    edges,
  };
}
