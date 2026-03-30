import type { FlowEdge, FlowNode } from '@/lib/types';
import type { CollaborationDocumentState } from './types';

function reconcileCollection<T extends { id: string }>(
  currentItems: T[],
  nextItems: T[]
): T[] {
  const currentById = new Map(currentItems.map((item) => [item.id, item]));
  let changed = currentItems.length !== nextItems.length;
  const reconciled = nextItems.map((nextItem) => {
    const currentItem = currentById.get(nextItem.id);
    if (!currentItem) {
      changed = true;
      return nextItem;
    }

    if (JSON.stringify(currentItem) === JSON.stringify(nextItem)) {
      return currentItem;
    }

    changed = true;
    return nextItem;
  });

  return changed ? reconciled : currentItems;
}

export function createCollaborationDocumentStateFromCanvas(
  roomId: string,
  version: number,
  nodes: FlowNode[],
  edges: FlowEdge[]
): CollaborationDocumentState {
  return {
    roomId,
    version,
    nodes,
    edges,
  };
}

export function applyCollaborationDocumentStateToCanvas(
  state: CollaborationDocumentState,
  setNodes: (nodes: FlowNode[] | ((nodes: FlowNode[]) => FlowNode[])) => void,
  setEdges: (edges: FlowEdge[] | ((edges: FlowEdge[]) => FlowEdge[])) => void
): void {
  setNodes((currentNodes) => reconcileCollection(currentNodes, state.nodes));
  setEdges((currentEdges) => reconcileCollection(currentEdges, state.edges));
}
