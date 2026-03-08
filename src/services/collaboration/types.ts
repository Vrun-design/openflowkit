import type { FlowEdge, FlowNode } from '@/lib/types';

export type CollaborationOperationType =
  | 'node.upsert'
  | 'node.delete'
  | 'edge.upsert'
  | 'edge.delete';

export interface CollaborationOperationEnvelope {
  opId: string;
  roomId: string;
  clientId: string;
  baseVersion: number;
  timestamp: number;
  type: CollaborationOperationType;
  payload: CollaborationOperationPayload;
}

export type CollaborationOperationPayload =
  | { node: FlowNode }
  | { nodeId: string }
  | { edge: FlowEdge }
  | { edgeId: string };

export interface CollaborationDocumentState {
  roomId: string;
  version: number;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface CollaborationPresenceState {
  clientId: string;
  name: string;
  color: string;
  cursor: {
    x: number;
    y: number;
  };
}

export interface CollaborationParticipantState {
  clientId: string;
  name: string;
  color: string;
}

export interface CollaborationRoomConfig {
  roomId: string;
  clientId: string;
  signalingServers: string[];
  password: string;
}
