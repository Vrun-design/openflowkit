import { createMindmapEdge } from '@/constants';
import type { FlowEdge, FlowNode, NodeData } from '@/lib/types';
import { getMindmapChildrenById, getMindmapDescendantIds } from '@/lib/mindmapTree';
import {
  type MindmapSide,
  type MindmapBranchStyle,
  getOrderedChildren,
  assignRootChildSides,
  layoutBranch,
} from './mindmapLayoutEngine';

const REPARENT_DISTANCE_THRESHOLD = 140;
const REPARENT_IMPROVEMENT_THRESHOLD = 56;
const ROOT_REBRANCH_THRESHOLD = 140;

function isMindmapNode(node: FlowNode | undefined): node is FlowNode {
  return Boolean(node) && node.type === 'mindmap';
}

function getConnectedMindmapComponent(
  nodeId: string,
  nodes: FlowNode[],
  edges: FlowEdge[]
): Set<string> {
  const mindmapNodeIds = new Set(nodes.filter(isMindmapNode).map((node) => node.id));
  const pending = [nodeId];
  const visited = new Set<string>();

  while (pending.length > 0) {
    const currentId = pending.pop();
    if (!currentId || visited.has(currentId) || !mindmapNodeIds.has(currentId)) {
      continue;
    }
    visited.add(currentId);

    edges.forEach((edge) => {
      if (edge.source === currentId && !visited.has(edge.target)) {
        pending.push(edge.target);
      }
      if (edge.target === currentId && !visited.has(edge.source)) {
        pending.push(edge.source);
      }
    });
  }

  return visited;
}

function findMindmapRootId(componentIds: Set<string>, edges: FlowEdge[]): string | null {
  const incomingIds = new Set<string>();
  edges.forEach((edge) => {
    if (componentIds.has(edge.source) && componentIds.has(edge.target)) {
      incomingIds.add(edge.target);
    }
  });

  const roots = Array.from(componentIds).filter((nodeId) => !incomingIds.has(nodeId));
  roots.sort();
  return roots[0] ?? null;
}

export function resolveMindmapBranchStyleForNode(
  nodeId: string,
  nodes: FlowNode[]
): MindmapBranchStyle {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const visited = new Set<string>();
  let currentNode = nodesById.get(nodeId);

  while (
    currentNode &&
    isMindmapNode(currentNode) &&
    typeof currentNode.data.mindmapParentId === 'string' &&
    currentNode.data.mindmapParentId.length > 0
  ) {
    if (visited.has(currentNode.id)) {
      break;
    }
    visited.add(currentNode.id);
    const parentNode = nodesById.get(currentNode.data.mindmapParentId);
    if (!isMindmapNode(parentNode)) {
      break;
    }
    currentNode = parentNode;
  }

  return currentNode?.data.mindmapBranchStyle === 'straight' ? 'straight' : 'curved';
}

export function relayoutMindmapComponent(
  nodes: FlowNode[],
  edges: FlowEdge[],
  focusNodeId: string
): FlowNode[] {
  const componentIds = getConnectedMindmapComponent(focusNodeId, nodes, edges);
  if (componentIds.size === 0) {
    return nodes;
  }

  const rootId = findMindmapRootId(componentIds, edges);
  if (!rootId) {
    return nodes;
  }

  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const rootNode = nodesById.get(rootId);
  if (!isMindmapNode(rootNode)) {
    return nodes;
  }
  const rootBranchStyle = rootNode.data.mindmapBranchStyle === 'straight' ? 'straight' : 'curved';

  const childrenById = getMindmapChildrenById(nodes, edges);
  const positionsById = new Map<string, { x: number; y: number }>();
  const metadataById = new Map<
    string,
    { mindmapDepth: number; mindmapParentId?: string; mindmapSide?: MindmapSide }
  >();
  positionsById.set(rootId, { x: rootNode.position.x, y: rootNode.position.y });
  metadataById.set(rootId, { mindmapDepth: 0 });

  const rootChildren = getOrderedChildren(rootId, childrenById, nodesById);
  const rootChildSides = assignRootChildSides(rootChildren, childrenById, nodesById);
  const leftRootChildren = rootChildren.filter((childId) => rootChildSides.get(childId) === 'left');
  const rightRootChildren = rootChildren.filter(
    (childId) => rootChildSides.get(childId) === 'right'
  );

  layoutBranch(
    leftRootChildren,
    'left',
    rootId,
    rootNode.position.x,
    rootNode.position.y,
    1,
    childrenById,
    nodesById,
    positionsById,
    metadataById
  );
  layoutBranch(
    rightRootChildren,
    'right',
    rootId,
    rootNode.position.x,
    rootNode.position.y,
    1,
    childrenById,
    nodesById,
    positionsById,
    metadataById
  );

  return nodes.map((node) => {
    if (!componentIds.has(node.id) || !isMindmapNode(node)) {
      return node;
    }

    const nextPosition = positionsById.get(node.id);
    const nextMetadata = metadataById.get(node.id);
    if (!nextPosition || !nextMetadata) {
      return node;
    }

    const nextData: NodeData = {
      ...node.data,
      mindmapDepth: nextMetadata.mindmapDepth,
      mindmapBranchStyle: rootBranchStyle,
    };

    if (nextMetadata.mindmapParentId) {
      nextData.mindmapParentId = nextMetadata.mindmapParentId;
    } else {
      delete nextData.mindmapParentId;
    }

    if (nextMetadata.mindmapSide) {
      nextData.mindmapSide = nextMetadata.mindmapSide;
    } else {
      delete nextData.mindmapSide;
    }

    return {
      ...node,
      position: nextPosition,
      hidden: false,
      data: nextData,
    };
  });
}

export function syncMindmapEdges(nodes: FlowNode[], edges: FlowEdge[]): FlowEdge[] {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));

  return edges.map((edge) => {
    const sourceNode = nodesById.get(edge.source);
    const targetNode = nodesById.get(edge.target);
    if (!isMindmapNode(sourceNode) || !isMindmapNode(targetNode)) {
      return edge;
    }

    const nextEdge = createMindmapEdge(
      sourceNode,
      targetNode,
      typeof edge.label === 'string' ? edge.label : undefined,
      edge.id,
      resolveMindmapBranchStyleForNode(sourceNode.id, nodes)
    );
    return {
      ...edge,
      ...nextEdge,
      data: {
        ...(edge.data ?? {}),
        ...(nextEdge.data ?? {}),
      },
    };
  });
}

function getDistanceBetweenNodes(left: FlowNode | undefined, right: FlowNode | undefined): number {
  if (!left || !right) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.hypot(left.position.x - right.position.x, left.position.y - right.position.y);
}

interface MindmapDropReconcileResult {
  nodes: FlowNode[];
  edges: FlowEdge[];
  changed: boolean;
}

export interface MindmapDropPreview {
  targetParentId: string | null;
  rootId: string | null;
  targetSide: MindmapSide | null;
  mode: 'reparent' | 'rebranch' | null;
}

function getPreferredRootSide(rootX: number, candidateX: number): MindmapSide | null {
  if (candidateX <= rootX - ROOT_REBRANCH_THRESHOLD) {
    return 'left';
  }
  if (candidateX >= rootX + ROOT_REBRANCH_THRESHOLD) {
    return 'right';
  }
  return null;
}

export function reconcileMindmapDrop(
  nodes: FlowNode[],
  edges: FlowEdge[],
  draggedNodeId: string
): MindmapDropReconcileResult {
  const draggedNode = nodes.find((node) => node.id === draggedNodeId);
  if (!isMindmapNode(draggedNode)) {
    return { nodes, edges, changed: false };
  }

  const componentIds = getConnectedMindmapComponent(draggedNodeId, nodes, edges);
  const rootId = findMindmapRootId(componentIds, edges);
  if (!rootId || rootId === draggedNodeId) {
    return { nodes, edges, changed: false };
  }

  const rootNode = nodes.find((node) => node.id === rootId);
  if (!isMindmapNode(rootNode)) {
    return { nodes, edges, changed: false };
  }

  const childrenById = getMindmapChildrenById(nodes, edges);
  const descendantIds = getMindmapDescendantIds(draggedNodeId, childrenById);
  const currentParentId = draggedNode.data.mindmapParentId;
  const currentParentNode = nodes.find((node) => node.id === currentParentId);
  const currentParentDistance = getDistanceBetweenNodes(draggedNode, currentParentNode);

  if (currentParentId === rootId) {
    const preferredSide = getPreferredRootSide(rootNode.position.x, draggedNode.position.x);
    if (preferredSide && preferredSide !== draggedNode.data.mindmapSide) {
      const nextNodes = nodes.map((node) =>
        node.id === draggedNodeId
          ? {
              ...node,
              data: {
                ...node.data,
                mindmapSide: preferredSide,
              },
            }
          : node
      );
      return {
        nodes: relayoutMindmapComponent(nextNodes, edges, draggedNodeId),
        edges,
        changed: true,
      };
    }
  }

  let closestParentId: string | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  nodes.forEach((candidate) => {
    if (!isMindmapNode(candidate)) {
      return;
    }
    if (candidate.id === draggedNodeId || descendantIds.has(candidate.id)) {
      return;
    }
    if (!componentIds.has(candidate.id)) {
      return;
    }

    const dx = candidate.position.x - draggedNode.position.x;
    const dy = candidate.position.y - draggedNode.position.y;
    const distance = Math.hypot(dx, dy);
    if (distance > REPARENT_DISTANCE_THRESHOLD || distance >= closestDistance) {
      return;
    }

    closestDistance = distance;
    closestParentId = candidate.id;
  });

  if (
    closestParentId &&
    closestParentId !== currentParentId &&
    closestDistance + REPARENT_IMPROVEMENT_THRESHOLD < currentParentDistance
  ) {
    const parentNode = nodes.find((node) => node.id === closestParentId);
    if (!isMindmapNode(parentNode)) {
      return { nodes, edges, changed: false };
    }

    const nextEdges = syncMindmapEdges(
      nodes,
      edges
        .filter((edge) => !(edge.target === draggedNodeId && componentIds.has(edge.source)))
        .concat(
          createMindmapEdge(
            parentNode,
            draggedNode,
            undefined,
            undefined,
            resolveMindmapBranchStyleForNode(parentNode.id, nodes)
          )
        )
    );
    const nextNodes = nodes.map((node) => {
      if (node.id !== draggedNodeId) {
        return node;
      }

      const preferredSide =
        parentNode.id === rootId
          ? getPreferredRootSide(rootNode.position.x, draggedNode.position.x)
          : parentNode.data.mindmapSide;
      return {
        ...node,
        data: {
          ...node.data,
          mindmapParentId: parentNode.id,
          ...(preferredSide ? { mindmapSide: preferredSide } : {}),
        },
      };
    });

    return {
      nodes: relayoutMindmapComponent(nextNodes, nextEdges, draggedNodeId),
      edges: nextEdges,
      changed: true,
    };
  }

  return { nodes, edges, changed: false };
}

export function computeMindmapDropPreview(
  nodes: FlowNode[],
  edges: FlowEdge[],
  draggedNodeId: string
): MindmapDropPreview | null {
  const draggedNode = nodes.find((node) => node.id === draggedNodeId);
  if (!isMindmapNode(draggedNode)) {
    return null;
  }

  const componentIds = getConnectedMindmapComponent(draggedNodeId, nodes, edges);
  const rootId = findMindmapRootId(componentIds, edges);
  if (!rootId || rootId === draggedNodeId) {
    return null;
  }

  const rootNode = nodes.find((node) => node.id === rootId);
  if (!isMindmapNode(rootNode)) {
    return null;
  }

  const childrenById = getMindmapChildrenById(nodes, edges);
  const descendantIds = getMindmapDescendantIds(draggedNodeId, childrenById);
  const currentParentId = draggedNode.data.mindmapParentId;
  const currentParentNode = nodes.find((node) => node.id === currentParentId);
  const currentParentDistance = getDistanceBetweenNodes(draggedNode, currentParentNode);

  if (currentParentId === rootId) {
    const targetSide = getPreferredRootSide(rootNode.position.x, draggedNode.position.x);
    if (targetSide && targetSide !== draggedNode.data.mindmapSide) {
      return {
        targetParentId: rootId,
        rootId,
        targetSide,
        mode: 'rebranch',
      };
    }
  }

  let closestParentId: string | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  nodes.forEach((candidate) => {
    if (!isMindmapNode(candidate) || !componentIds.has(candidate.id)) {
      return;
    }
    if (candidate.id === draggedNodeId || descendantIds.has(candidate.id)) {
      return;
    }

    const distance = Math.hypot(
      candidate.position.x - draggedNode.position.x,
      candidate.position.y - draggedNode.position.y
    );
    if (distance > REPARENT_DISTANCE_THRESHOLD || distance >= closestDistance) {
      return;
    }

    closestDistance = distance;
    closestParentId = candidate.id;
  });

  if (
    closestParentId &&
    closestParentId !== currentParentId &&
    closestDistance + REPARENT_IMPROVEMENT_THRESHOLD < currentParentDistance
  ) {
    const parentNode = nodes.find((node) => node.id === closestParentId);
    const targetSide =
      isMindmapNode(parentNode) && parentNode.id === rootId
        ? getPreferredRootSide(rootNode.position.x, draggedNode.position.x)
        : isMindmapNode(parentNode)
          ? (parentNode.data.mindmapSide ?? null)
          : null;
    return {
      targetParentId: closestParentId,
      rootId,
      targetSide,
      mode: 'reparent',
    };
  }

  return null;
}
