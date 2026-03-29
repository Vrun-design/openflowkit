import type { FlowNode, NodeData } from '@/lib/types';

export const ROOT_CHILD_HORIZONTAL_GAP = 280;
export const BRANCH_HORIZONTAL_GAP = 220;
export const VERTICAL_GAP = 36;
export const LEAF_SPAN = 84;

export type MindmapSide = NonNullable<NodeData['mindmapSide']>;
export type MindmapBranchStyle = NonNullable<NodeData['mindmapBranchStyle']>;

export function getNodeSide(node: FlowNode): MindmapSide | null {
  return node.data.mindmapSide === 'left' || node.data.mindmapSide === 'right'
    ? node.data.mindmapSide
    : null;
}

export function getNodeSpan(nodeId: string, childrenById: Map<string, string[]>): number {
  const children = childrenById.get(nodeId) ?? [];
  if (children.length === 0) return LEAF_SPAN;
  const childrenSpan = children.reduce(
    (total, childId) => total + getNodeSpan(childId, childrenById),
    0
  );
  const totalGap = VERTICAL_GAP * Math.max(0, children.length - 1);
  return Math.max(LEAF_SPAN, childrenSpan + totalGap);
}

export function getHorizontalGap(depth: number): number {
  return depth <= 1 ? ROOT_CHILD_HORIZONTAL_GAP : BRANCH_HORIZONTAL_GAP;
}

export function getOrderedChildren(
  parentId: string,
  childrenById: Map<string, string[]>,
  nodesById: Map<string, FlowNode>
): string[] {
  const children = childrenById.get(parentId) ?? [];
  return [...children].sort((leftId, rightId) => {
    const leftNode = nodesById.get(leftId);
    const rightNode = nodesById.get(rightId);
    if (!leftNode || !rightNode) return leftId.localeCompare(rightId);
    if (leftNode.position.y !== rightNode.position.y)
      return leftNode.position.y - rightNode.position.y;
    if (leftNode.position.x !== rightNode.position.x)
      return leftNode.position.x - rightNode.position.x;
    return leftId.localeCompare(rightId);
  });
}

export function assignRootChildSides(
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
    if (leftSide && rightSide && leftSide !== rightSide) return leftSide === 'left' ? -1 : 1;
    if (leftSide && !rightSide) return -1;
    if (!leftSide && rightSide) return 1;
    if (leftNode && rightNode && leftNode.position.y !== rightNode.position.y)
      return leftNode.position.y - rightNode.position.y;
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

export function layoutBranch(
  childIds: string[],
  side: MindmapSide,
  parentId: string,
  parentX: number,
  parentY: number,
  depth: number,
  childrenById: Map<string, string[]>,
  nodesById: Map<string, FlowNode>,
  positionsById: Map<string, { x: number; y: number }>,
  metadataById: Map<
    string,
    { mindmapDepth: number; mindmapParentId?: string; mindmapSide?: MindmapSide }
  >
): void {
  if (childIds.length === 0) return;

  const totalSpan =
    childIds.reduce((sum, childId) => sum + getNodeSpan(childId, childrenById), 0) +
    VERTICAL_GAP * Math.max(0, childIds.length - 1);
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
