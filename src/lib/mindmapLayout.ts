import { createMindmapEdge } from '@/constants';
import type { FlowEdge, FlowNode, NodeData } from '@/lib/types';

const ROOT_CHILD_HORIZONTAL_GAP = 280;
const BRANCH_HORIZONTAL_GAP = 220;
const VERTICAL_GAP = 36;
const LEAF_SPAN = 84;
const REPARENT_DISTANCE_THRESHOLD = 140;
const REPARENT_IMPROVEMENT_THRESHOLD = 56;
const ROOT_REBRANCH_THRESHOLD = 140;

type MindmapSide = NonNullable<NodeData['mindmapSide']>;
type MindmapBranchStyle = NonNullable<NodeData['mindmapBranchStyle']>;

function isMindmapNode(node: FlowNode | undefined): node is FlowNode {
  return Boolean(node) && node.type === 'mindmap';
}

function getMindmapChildrenById(nodes: FlowNode[], edges: FlowEdge[]): Map<string, string[]> {
  const nodeIds = new Set(nodes.filter(isMindmapNode).map((node) => node.id));
  const childrenById = new Map<string, string[]>();
  const connectedTargets = new Set<string>();

  edges.forEach((edge) => {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      return;
    }

    const children = childrenById.get(edge.source) ?? [];
    children.push(edge.target);
    childrenById.set(edge.source, children);
    connectedTargets.add(edge.target);
  });

  nodes.filter(isMindmapNode).forEach((node) => {
    const parentId = typeof node.data.mindmapParentId === 'string' ? node.data.mindmapParentId : '';
    if (!parentId || !nodeIds.has(parentId) || connectedTargets.has(node.id)) {
      return;
    }

    const children = childrenById.get(parentId) ?? [];
    if (!children.includes(node.id)) {
      children.push(node.id);
    }
    childrenById.set(parentId, children);
  });

  childrenById.forEach((children) => {
    children.sort((left, right) => left.localeCompare(right));
  });

  return childrenById;
}

function getConnectedMindmapComponent(nodeId: string, nodes: FlowNode[], edges: FlowEdge[]): Set<string> {
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

function getMindmapDescendantIds(nodeId: string, childrenById: Map<string, string[]>): Set<string> {
  const descendants = new Set<string>();
  const pending = [...(childrenById.get(nodeId) ?? [])];

  while (pending.length > 0) {
    const currentId = pending.pop();
    if (!currentId || descendants.has(currentId)) {
      continue;
    }
    descendants.add(currentId);
    pending.push(...(childrenById.get(currentId) ?? []));
  }

  return descendants;
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

function getNodeDepth(node: FlowNode): number {
  return typeof node.data.mindmapDepth === 'number' ? node.data.mindmapDepth : 0;
}

function getNodeSide(node: FlowNode): MindmapSide | null {
  return node.data.mindmapSide === 'left' || node.data.mindmapSide === 'right'
    ? node.data.mindmapSide
    : null;
}

export function resolveMindmapBranchStyleForNode(nodeId: string, nodes: FlowNode[]): MindmapBranchStyle {
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

function getNodeSpan(nodeId: string, childrenById: Map<string, string[]>): number {
  const children = childrenById.get(nodeId) ?? [];
  if (children.length === 0) {
    return LEAF_SPAN;
  }

  const childrenSpan = children.reduce((total, childId) => total + getNodeSpan(childId, childrenById), 0);
  const totalGap = VERTICAL_GAP * Math.max(0, children.length - 1);
  return Math.max(LEAF_SPAN, childrenSpan + totalGap);
}

function getHorizontalGap(depth: number): number {
  return depth <= 1 ? ROOT_CHILD_HORIZONTAL_GAP : BRANCH_HORIZONTAL_GAP;
}

function getOrderedChildren(
  parentId: string,
  childrenById: Map<string, string[]>,
  nodesById: Map<string, FlowNode>
): string[] {
  const children = childrenById.get(parentId) ?? [];
  return [...children].sort((leftId, rightId) => {
    const leftNode = nodesById.get(leftId);
    const rightNode = nodesById.get(rightId);
    if (!leftNode || !rightNode) {
      return leftId.localeCompare(rightId);
    }

    if (leftNode.position.y !== rightNode.position.y) {
      return leftNode.position.y - rightNode.position.y;
    }
    if (leftNode.position.x !== rightNode.position.x) {
      return leftNode.position.x - rightNode.position.x;
    }
    return leftId.localeCompare(rightId);
  });
}

function assignRootChildSides(
  childIds: string[],
  childrenById: Map<string, string[]>,
  nodesById: Map<string, FlowNode>
): Map<string, MindmapSide> {
  const assignments = new Map<string, MindmapSide>();
  let leftSpan = 0;
  let rightSpan = 0;

  const sortedChildIds = [...childIds].sort((leftId, rightId) => {
    const leftNode = nodesById.get(leftId);
    const rightNode = nodesById.get(rightId);
    const leftSide = leftNode ? getNodeSide(leftNode) : null;
    const rightSide = rightNode ? getNodeSide(rightNode) : null;

    if (leftSide && rightSide && leftSide !== rightSide) {
      return leftSide === 'left' ? -1 : 1;
    }
    if (leftSide && !rightSide) {
      return -1;
    }
    if (!leftSide && rightSide) {
      return 1;
    }
    if (leftNode && rightNode && leftNode.position.y !== rightNode.position.y) {
      return leftNode.position.y - rightNode.position.y;
    }
    return leftId.localeCompare(rightId);
  });

  sortedChildIds.forEach((childId) => {
    const preferredSide = getNodeSide(nodesById.get(childId));
    const childSpan = getNodeSpan(childId, childrenById);
    const assignedSide = preferredSide ?? (leftSpan <= rightSpan ? 'left' : 'right');
    assignments.set(childId, assignedSide);
    if (assignedSide === 'left') {
      leftSpan += childSpan;
      return;
    }
    rightSpan += childSpan;
  });

  return assignments;
}

function layoutBranch(
  childIds: string[],
  side: MindmapSide,
  parentId: string,
  parentX: number,
  parentY: number,
  depth: number,
  childrenById: Map<string, string[]>,
  nodesById: Map<string, FlowNode>,
  positionsById: Map<string, { x: number; y: number }>,
  metadataById: Map<string, { mindmapDepth: number; mindmapParentId?: string; mindmapSide?: MindmapSide }>
): void {
  if (childIds.length === 0) {
    return;
  }

  const totalSpan = childIds.reduce((sum, childId) => sum + getNodeSpan(childId, childrenById), 0)
    + VERTICAL_GAP * Math.max(0, childIds.length - 1);
  let cursorY = parentY - totalSpan / 2;

  childIds.forEach((childId) => {
    const childSpan = getNodeSpan(childId, childrenById);
    const childCenterY = cursorY + childSpan / 2;
    const childX = parentX + (side === 'right' ? 1 : -1) * getHorizontalGap(depth);

    positionsById.set(childId, { x: childX, y: childCenterY });
    metadataById.set(childId, {
      mindmapDepth: depth,
      mindmapParentId: parentId,
      mindmapSide: side,
    });

    const grandChildren = getOrderedChildren(childId, childrenById, nodesById);
    layoutBranch(
      grandChildren,
      side,
      childId,
      childX,
      childCenterY,
      depth + 1,
      childrenById,
      nodesById,
      positionsById,
      metadataById
    );

    cursorY += childSpan + VERTICAL_GAP;
  });
}

export function relayoutMindmapComponent(nodes: FlowNode[], edges: FlowEdge[], focusNodeId: string): FlowNode[] {
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
  const metadataById = new Map<string, { mindmapDepth: number; mindmapParentId?: string; mindmapSide?: MindmapSide }>();
  positionsById.set(rootId, { x: rootNode.position.x, y: rootNode.position.y });
  metadataById.set(rootId, { mindmapDepth: 0 });

  const rootChildren = getOrderedChildren(rootId, childrenById, nodesById);
  const rootChildSides = assignRootChildSides(rootChildren, childrenById, nodesById);
  const leftRootChildren = rootChildren.filter((childId) => rootChildSides.get(childId) === 'left');
  const rightRootChildren = rootChildren.filter((childId) => rootChildSides.get(childId) === 'right');

  layoutBranch(leftRootChildren, 'left', rootId, rootNode.position.x, rootNode.position.y, 1, childrenById, nodesById, positionsById, metadataById);
  layoutBranch(rightRootChildren, 'right', rootId, rootNode.position.x, rootNode.position.y, 1, childrenById, nodesById, positionsById, metadataById);

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

  return edges
    .map((edge) => {
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

export function reconcileMindmapDrop(nodes: FlowNode[], edges: FlowEdge[], draggedNodeId: string): MindmapDropReconcileResult {
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
      const nextNodes = nodes.map((node) => (
        node.id === draggedNodeId
          ? {
              ...node,
              data: {
                ...node.data,
                mindmapSide: preferredSide,
              },
            }
          : node
      ));
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
    closestParentId
    && closestParentId !== currentParentId
    && closestDistance + REPARENT_IMPROVEMENT_THRESHOLD < currentParentDistance
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

      const preferredSide = parentNode.id === rootId
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

export function computeMindmapDropPreview(nodes: FlowNode[], edges: FlowEdge[], draggedNodeId: string): MindmapDropPreview | null {
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
    closestParentId
    && closestParentId !== currentParentId
    && closestDistance + REPARENT_IMPROVEMENT_THRESHOLD < currentParentDistance
  ) {
    const parentNode = nodes.find((node) => node.id === closestParentId);
    const targetSide = isMindmapNode(parentNode) && parentNode.id === rootId
      ? getPreferredRootSide(rootNode.position.x, draggedNode.position.x)
      : isMindmapNode(parentNode)
        ? parentNode.data.mindmapSide ?? null
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
