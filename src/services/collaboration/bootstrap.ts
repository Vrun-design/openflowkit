import type { FlowEdge, FlowNode } from '@/lib/types';
import { createCollaborationRuntimeController } from './runtimeController';
import type { CollaborationRuntimeController } from './runtimeController';
import { createCollaborationSessionBootstrap } from './session';
import {
  applyCollaborationDocumentStateToCanvas,
  createCollaborationDocumentStateFromCanvas,
} from './storeBridge';
import {
  createCollaborationTransportFactory,
  type CollaborationTransportFactoryResult,
} from './transportFactory';
import type { CollaborationPresenceState } from './types';

type SetFlowNodes = (payload: FlowNode[] | ((nodes: FlowNode[]) => FlowNode[])) => void;
type SetFlowEdges = (payload: FlowEdge[] | ((edges: FlowEdge[]) => FlowEdge[])) => void;

export interface CollaborationRuntimeBundleParams {
  collaborationRoomId: string;
  collaborationRoomSecret: string;
  clientId: string;
  localIdentity: {
    name: string;
    color: string;
  };
  currentNodes: FlowNode[];
  currentEdges: FlowEdge[];
  setNodes: SetFlowNodes;
  setEdges: SetFlowEdges;
  setCollaborationPresence: (presence: CollaborationPresenceState[]) => void;
}

export interface CollaborationRuntimeBundle {
  runtimeController: CollaborationRuntimeController;
  transportFactory: CollaborationTransportFactoryResult;
}

export function createCollaborationRuntimeBundle({
  collaborationRoomId,
  collaborationRoomSecret,
  clientId,
  localIdentity,
  currentNodes,
  currentEdges,
  setNodes,
  setEdges,
  setCollaborationPresence,
}: CollaborationRuntimeBundleParams): CollaborationRuntimeBundle {
  const transportFactory = createCollaborationTransportFactory('realtime');
  const runtimeController = createCollaborationRuntimeController({
    transport: transportFactory.transport,
    session: createCollaborationSessionBootstrap({
      roomId: collaborationRoomId,
      roomPassword: collaborationRoomSecret,
      clientId,
      name: localIdentity.name,
      color: localIdentity.color,
    }),
    initialDocumentState: createCollaborationDocumentStateFromCanvas(
      collaborationRoomId,
      0,
      currentNodes,
      currentEdges
    ),
    onDocumentStateChange: (state) => {
      applyCollaborationDocumentStateToCanvas(state, setNodes, setEdges);
    },
    onPresenceChange: (presence) => {
      setCollaborationPresence(presence);
    },
  });

  return {
    runtimeController,
    transportFactory,
  };
}
