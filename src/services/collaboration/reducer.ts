import type { CollaborationDocumentState, CollaborationOperationEnvelope } from './types';

export interface ApplyCollaborationOperationResult {
  nextState: CollaborationDocumentState;
  applied: boolean;
}

function areEqualByJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function applyCollaborationOperation(
  state: CollaborationDocumentState,
  operation: CollaborationOperationEnvelope
): ApplyCollaborationOperationResult {
  if (operation.roomId !== state.roomId) {
    return { nextState: state, applied: false };
  }

  switch (operation.type) {
    case 'node.upsert': {
      if (!('node' in operation.payload)) {
        return { nextState: state, applied: false };
      }
      const node = operation.payload.node;
      const existingIndex = state.nodes.findIndex((candidate) => candidate.id === node.id);
      if (existingIndex >= 0 && areEqualByJson(state.nodes[existingIndex], node)) {
        return { nextState: state, applied: false };
      }
      const nextNodes = [...state.nodes];
      if (existingIndex >= 0) {
        nextNodes[existingIndex] = node;
      } else {
        nextNodes.push(node);
      }
      return {
        applied: true,
        nextState: {
          ...state,
          version: state.version + 1,
          nodes: nextNodes,
        },
      };
    }
    case 'node.delete': {
      if (!('nodeId' in operation.payload)) {
        return { nextState: state, applied: false };
      }
      const nodeId = operation.payload.nodeId;
      const nodeExists = state.nodes.some((node) => node.id === nodeId);
      const hasConnectedEdges = state.edges.some((edge) => edge.source === nodeId || edge.target === nodeId);
      if (!nodeExists && !hasConnectedEdges) {
        return { nextState: state, applied: false };
      }
      const nextNodes = state.nodes.filter((node) => node.id !== nodeId);
      const nextEdges = state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
      return {
        applied: true,
        nextState: {
          ...state,
          version: state.version + 1,
          nodes: nextNodes,
          edges: nextEdges,
        },
      };
    }
    case 'edge.upsert': {
      if (!('edge' in operation.payload)) {
        return { nextState: state, applied: false };
      }
      const edge = operation.payload.edge;
      const existingIndex = state.edges.findIndex((candidate) => candidate.id === edge.id);
      if (existingIndex >= 0 && areEqualByJson(state.edges[existingIndex], edge)) {
        return { nextState: state, applied: false };
      }
      const nextEdges = [...state.edges];
      if (existingIndex >= 0) {
        nextEdges[existingIndex] = edge;
      } else {
        nextEdges.push(edge);
      }
      return {
        applied: true,
        nextState: {
          ...state,
          version: state.version + 1,
          edges: nextEdges,
        },
      };
    }
    case 'edge.delete': {
      if (!('edgeId' in operation.payload)) {
        return { nextState: state, applied: false };
      }
      const edgeId = operation.payload.edgeId;
      if (!state.edges.some((edge) => edge.id === edgeId)) {
        return { nextState: state, applied: false };
      }
      return {
        applied: true,
        nextState: {
          ...state,
          version: state.version + 1,
          edges: state.edges.filter((edge) => edge.id !== edgeId),
        },
      };
    }
    default:
      return { nextState: state, applied: false };
  }
}

export function applyCollaborationOperations(
  initialState: CollaborationDocumentState,
  operations: CollaborationOperationEnvelope[]
): CollaborationDocumentState {
  return operations.reduce((state, operation) => {
    const result = applyCollaborationOperation(state, operation);
    return result.nextState;
  }, initialState);
}
