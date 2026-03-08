import { createId } from '@/lib/id';
import { getNodeParentId, setNodeParent } from '@/lib/nodeParent';
import type { FlowNode, NodeData } from '@/lib/types';
import { createDefaultEdge } from '@/constants';
import { useFlowStore } from '@/store';
import { assignSmartHandlesWithOptions, getSmartRoutingOptionsFromViewSettings } from '@/services/smartEdgeRouting';
import { queueNodeLabelEditRequest } from '@/hooks/nodeLabelEditRequest';
import { getBlankGenericShapeData, isGenericShapeType } from '@/lib/genericShapePolicy';

function createSiblingData(sourceNode: FlowNode): NodeData {
  const isGenericShape = isGenericShapeType(sourceNode.type);
  const subLabel = typeof sourceNode.data?.subLabel === 'string' ? sourceNode.data.subLabel : '';

  if (isGenericShape) {
    return getBlankGenericShapeData(sourceNode);
  }

  return {
    ...getBlankGenericShapeData(sourceNode),
    label: 'New Node',
    subLabel,
  };
}

export function createConnectedSibling(sourceNodeId: string): string | null {
  const state = useFlowStore.getState();
  const sourceNode = state.nodes.find((node) => node.id === sourceNodeId);
  if (!sourceNode) {
    return null;
  }

  const siblingId = createId(sourceNode.type ?? 'node');
  const siblingX = sourceNode.position.x + 260;
  const siblingY = sourceNode.position.y;
  const sourceParentId = getNodeParentId(sourceNode);

  let siblingNode: FlowNode = {
    id: siblingId,
    type: sourceNode.type,
    position: { x: siblingX, y: siblingY },
    data: createSiblingData(sourceNode),
    selected: true,
  };

  if (sourceParentId) {
    siblingNode = setNodeParent(siblingNode, sourceParentId);
  }

  const insertedEdge = createDefaultEdge(sourceNodeId, siblingId);

  state.recordHistoryV2();
  state.setNodes((nodes) => [
    ...nodes.map((node) => ({ ...node, selected: false })),
    siblingNode,
  ]);
  state.setEdges((edges) => {
    const insertedEdges = edges.concat(insertedEdge);
    if (!state.viewSettings.smartRoutingEnabled) {
      return insertedEdges;
    }
    return assignSmartHandlesWithOptions(
      useFlowStore.getState().nodes.concat(siblingNode),
      insertedEdges,
      getSmartRoutingOptionsFromViewSettings(state.viewSettings)
    );
  });
  state.setSelectedNodeId(siblingId);
  if (isGenericShapeType(sourceNode.type)) {
    queueNodeLabelEditRequest(siblingId, { replaceExisting: true });
  }

  return siblingId;
}
