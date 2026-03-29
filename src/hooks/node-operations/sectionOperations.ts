import type { FlowNode, NodeData } from '@/lib/types';
import { clearNodeParent, getNodeParentId, setNodeParent } from '@/lib/nodeParent';
import { createId } from '@/lib/id';
import {
  SECTION_PADDING_X,
  SECTION_PADDING_BOTTOM,
  SECTION_HEADER_HEIGHT,
  SECTION_MIN_WIDTH,
  SECTION_MIN_HEIGHT,
  getAbsoluteNodePosition,
  getAbsoluteNodeBounds,
  getSectionContentBounds,
  getDirectSectionChildren,
  getSectionDescendants,
  isPointInsideBounds,
  isSectionHidden,
  isSectionLocked,
  getSectionOrder,
  getDefaultNodePosition,
  ensureParentsBeforeChildren,
} from './sectionBounds';
import { createSectionNode } from './nodeFactories';
import { findSectionTargetAtPoint, getDragTargetPoint } from './sectionHitTesting';

export function fitSectionToChildren(section: FlowNode, allNodes: FlowNode[]): FlowNode[] {
  const descendants = getSectionDescendants(section.id, allNodes);
  if (descendants.length === 0) {
    return allNodes;
  }

  const childBounds = descendants.map((node) => getAbsoluteNodeBounds(node, allNodes));
  const minX = Math.min(...childBounds.map((bounds) => bounds.x));
  const minY = Math.min(...childBounds.map((bounds) => bounds.y));
  const maxX = Math.max(...childBounds.map((bounds) => bounds.x + bounds.width));
  const maxY = Math.max(...childBounds.map((bounds) => bounds.y + bounds.height));

  const nextX = minX - SECTION_PADDING_X;
  const nextY = minY - SECTION_HEADER_HEIGHT;
  const nextWidth = Math.max(maxX - minX + SECTION_PADDING_X * 2, SECTION_MIN_WIDTH);
  const nextHeight = Math.max(
    maxY - minY + SECTION_HEADER_HEIGHT + SECTION_PADDING_BOTTOM,
    SECTION_MIN_HEIGHT
  );
  const deltaX = nextX - section.position.x;
  const deltaY = nextY - section.position.y;

  if (
    deltaX === 0 &&
    deltaY === 0 &&
    section.style?.width === nextWidth &&
    section.style?.height === nextHeight
  ) {
    return allNodes;
  }

  const directChildren = new Set(
    getDirectSectionChildren(section.id, allNodes).map((node) => node.id)
  );

  return allNodes.map((node) => {
    if (node.id === section.id) {
      return {
        ...node,
        position: { x: nextX, y: nextY },
        style: {
          ...node.style,
          width: nextWidth,
          height: nextHeight,
        },
      };
    }

    if (directChildren.has(node.id)) {
      return {
        ...node,
        position: {
          x: node.position.x - deltaX,
          y: node.position.y - deltaY,
        },
      };
    }

    return node;
  });
}

export function autoFitSectionsToChildren(allNodes: FlowNode[]): FlowNode[] {
  const sections = allNodes.filter((node) => node.type === 'section');
  return sections.reduce((nodes, section) => {
    const latestSection = nodes.find((candidate) => candidate.id === section.id);
    if (!latestSection || latestSection.type !== 'section') {
      return nodes;
    }

    if (latestSection.data?.sectionSizingMode !== 'fit') {
      return nodes;
    }

    return fitSectionToChildren(latestSection, nodes);
  }, allNodes);
}

export function wrapSelectionInSection(
  allNodes: FlowNode[],
  sectionId: string,
  label: string
): FlowNode[] {
  const selectedNodes = allNodes.filter((node) => node.selected && node.type !== 'section');
  if (selectedNodes.length === 0) {
    return allNodes.concat(
      createSectionNode(sectionId, getDefaultNodePosition(allNodes.length, 50, 50), label)
    );
  }

  const selectedBounds = selectedNodes.map((node) => getAbsoluteNodeBounds(node, allNodes));
  const minX = Math.min(...selectedBounds.map((bounds) => bounds.x));
  const minY = Math.min(...selectedBounds.map((bounds) => bounds.y));
  const maxX = Math.max(...selectedBounds.map((bounds) => bounds.x + bounds.width));
  const maxY = Math.max(...selectedBounds.map((bounds) => bounds.y + bounds.height));

  const section = createSectionNode(
    sectionId,
    { x: minX - SECTION_PADDING_X, y: minY - SECTION_HEADER_HEIGHT },
    label
  );
  section.style = {
    ...section.style,
    width: Math.max(maxX - minX + SECTION_PADDING_X * 2, SECTION_MIN_WIDTH),
    height: Math.max(
      maxY - minY + SECTION_HEADER_HEIGHT + SECTION_PADDING_BOTTOM,
      SECTION_MIN_HEIGHT
    ),
  };
  section.data = {
    ...section.data,
    sectionSizingMode: 'manual',
    sectionLayoutMode: 'freeform',
    sectionCollapsed: false,
  };

  const selectedIds = new Set(selectedNodes.map((node) => node.id));

  const withSection = allNodes
    .map((node) => {
      if (!selectedIds.has(node.id)) {
        return node;
      }

      const absolutePosition = getAbsoluteNodePosition(node, allNodes);
      return setNodeParent(
        clearNodeParent({
          ...node,
          position: {
            x: absolutePosition.x - section.position.x,
            y: absolutePosition.y - section.position.y,
          },
        }),
        section.id
      );
    })
    .concat(section);

  return ensureParentsBeforeChildren(withSection);
}

export function unparentSectionChildren(sectionId: string, allNodes: FlowNode[]): FlowNode[] {
  return allNodes.map((node) => {
    if (getNodeParentId(node) !== sectionId) {
      return node;
    }

    const absolutePosition = getAbsoluteNodePosition(node, allNodes);
    return clearNodeParent({
      ...node,
      position: absolutePosition,
    });
  });
}

interface ReassignArchitectureNodeBoundaryParams {
  nodes: FlowNode[];
  nodeId: string;
  data: Partial<NodeData>;
}

export function reassignArchitectureNodeBoundary({
  nodes,
  nodeId,
  data,
}: ReassignArchitectureNodeBoundaryParams): FlowNode[] {
  const targetNode = nodes.find((node) => node.id === nodeId);
  if (!targetNode) {
    return nodes;
  }

  const rawBoundaryId = data.archBoundaryId;
  const hasBoundaryUpdate = typeof rawBoundaryId === 'string';
  if (targetNode.type !== 'architecture' || !hasBoundaryUpdate) {
    return nodes.map((node) =>
      node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
    );
  }

  const requestedBoundaryId = rawBoundaryId.trim();
  const absolutePosition = getAbsoluteNodePosition(targetNode, nodes);

  if (requestedBoundaryId.length === 0) {
    return nodes.map((node) => {
      if (node.id !== nodeId) {
        return node;
      }

      const nextNode = {
        ...node,
        position: absolutePosition,
        data: {
          ...node.data,
          ...data,
          archBoundaryId: '',
        },
      } as FlowNode;
      return clearNodeParent(nextNode);
    });
  }

  const boundaryNode = nodes.find(
    (node) => node.id === requestedBoundaryId && node.type === 'section'
  );
  if (!boundaryNode) {
    return nodes.map((node) =>
      node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
    );
  }

  return nodes.map((node) => {
    if (node.id !== nodeId) {
      return node;
    }

    const boundaryAbsolutePosition = getAbsoluteNodePosition(boundaryNode, nodes);
    return setNodeParent(
      {
        ...node,
        position: {
          x: absolutePosition.x - boundaryAbsolutePosition.x,
          y: absolutePosition.y - boundaryAbsolutePosition.y,
        },
        data: {
          ...node.data,
          ...data,
          archBoundaryId: boundaryNode.id,
        },
      },
      boundaryNode.id
    );
  });
}

export function getNextSectionOrder(allNodes: FlowNode[]): number {
  const sectionOrders = allNodes
    .filter((node) => node.type === 'section')
    .map((node) => getSectionOrder(node));
  return sectionOrders.length === 0 ? 1 : Math.max(...sectionOrders) + 1;
}

export function getSectionInsertPosition(
  section: FlowNode,
  allNodes: FlowNode[]
): { x: number; y: number } {
  const contentBounds = getSectionContentBounds(section, allNodes);
  const childCount = getDirectSectionChildren(section.id, allNodes).length;

  return {
    x: contentBounds.x + childCount * 28,
    y: contentBounds.y + childCount * 28,
  };
}

export function parentNodeToSectionAtAbsolutePosition(
  node: FlowNode,
  section: FlowNode,
  allNodes: FlowNode[]
): FlowNode {
  const absoluteSectionPosition = getAbsoluteNodePosition(section, allNodes);
  return setNodeParent(
    {
      ...node,
      position: {
        x: node.position.x - absoluteSectionPosition.x,
        y: node.position.y - absoluteSectionPosition.y,
      },
    },
    section.id
  );
}

export function insertNodeIntoNearestSection(
  allNodes: FlowNode[],
  node: FlowNode,
  absolutePoint?: { x: number; y: number },
  preferredSectionId?: string | null
): FlowNode {
  const preferredSection = preferredSectionId
    ? allNodes.find(
        (candidate) => candidate.id === preferredSectionId && candidate.type === 'section'
      )
    : null;

  const targetSection =
    !absolutePoint &&
    preferredSection &&
    !isSectionHidden(preferredSection) &&
    !isSectionLocked(preferredSection)
      ? preferredSection
      : absolutePoint
        ? findSectionTargetAtPoint(absolutePoint, node.id, allNodes)
        : null;

  if (!targetSection) {
    return clearNodeParent(node);
  }

  const insertPoint = absolutePoint ?? getSectionInsertPosition(targetSection, allNodes);
  const absoluteSectionPosition = getAbsoluteNodePosition(targetSection, allNodes);
  return setNodeParent(
    {
      ...clearNodeParent(node),
      position: {
        x: insertPoint.x - absoluteSectionPosition.x,
        y: insertPoint.y - absoluteSectionPosition.y,
      },
    },
    targetSection.id
  );
}

export function duplicateSectionWithChildren(allNodes: FlowNode[], sectionId: string): FlowNode[] {
  const section = allNodes.find((node) => node.id === sectionId);
  if (!section || section.type !== 'section') {
    return allNodes;
  }

  const sectionTree = [section, ...getSectionDescendants(sectionId, allNodes)];
  const idMap = new Map(sectionTree.map((node) => [node.id, createId()]));
  const rootPosition = section.position;

  const duplicatedNodes = sectionTree.map((node) => {
    const duplicatedNodeId = idMap.get(node.id) ?? createId();
    const duplicatedParentId = getNodeParentId(node);
    const nextNode: FlowNode = {
      ...node,
      id: duplicatedNodeId,
      selected: true,
      position: {
        x: node.position.x + (node.id === sectionId ? 60 : 0),
        y: node.position.y + (node.id === sectionId ? 60 : 0),
      },
    };

    if (!duplicatedParentId) {
      return clearNodeParent(nextNode);
    }

    const duplicatedAncestorId = idMap.get(duplicatedParentId);
    if (!duplicatedAncestorId) {
      const absolutePosition = getAbsoluteNodePosition(node, allNodes);
      return clearNodeParent({
        ...nextNode,
        position: {
          x: absolutePosition.x - rootPosition.x + nextNode.position.x,
          y: absolutePosition.y - rootPosition.y + nextNode.position.y,
        },
      });
    }

    return setNodeParent(nextNode, duplicatedAncestorId);
  });

  const clearedSelectionNodes = allNodes.map((node) => ({
    ...node,
    selected: false,
  })) as FlowNode[];

  return [...clearedSelectionNodes, ...duplicatedNodes];
}

function unparentNode(node: FlowNode, absolutePosition: { x: number; y: number }): FlowNode {
  return clearNodeParent({ ...node, position: absolutePosition });
}

export function releaseNodeFromSection(allNodes: FlowNode[], nodeId: string): FlowNode[] {
  const targetNode = allNodes.find((node) => node.id === nodeId);
  if (!targetNode || !getNodeParentId(targetNode)) {
    return allNodes;
  }

  const absolutePosition = getAbsoluteNodePosition(targetNode, allNodes);
  return allNodes.map((node) => (node.id === nodeId ? unparentNode(node, absolutePosition) : node));
}

export function bringContentsIntoSection(allNodes: FlowNode[], sectionId: string): FlowNode[] {
  const section = allNodes.find((node) => node.id === sectionId);
  if (!section || section.type !== 'section') {
    return allNodes;
  }

  const contentBounds = getSectionContentBounds(section, allNodes);

  const parented = allNodes.map((node) => {
    if (node.id === sectionId || node.type === 'section' || getNodeParentId(node)) {
      return node;
    }

    const bounds = getAbsoluteNodeBounds(node, allNodes);
    const center = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    };

    if (!isPointInsideBounds(center, contentBounds)) {
      return node;
    }

    const absoluteSectionPosition = getAbsoluteNodePosition(section, allNodes);
    return setNodeParent(
      {
        ...node,
        position: {
          x: bounds.x - absoluteSectionPosition.x,
          y: bounds.y - absoluteSectionPosition.y,
        },
      },
      section.id
    );
  });

  return ensureParentsBeforeChildren(parented);
}

export function applySectionParenting(currentNodes: FlowNode[], draggedNode: FlowNode): FlowNode[] {
  if (draggedNode.type === 'section') {
    return currentNodes;
  }

  const absolutePosition = getAbsoluteNodePosition(draggedNode, currentNodes);
  const newParent = findSectionTargetAtPoint(
    getDragTargetPoint(draggedNode, currentNodes),
    draggedNode.id,
    currentNodes
  );
  if (newParent?.id === getNodeParentId(draggedNode)) {
    return currentNodes;
  }

  const parentedNodes = currentNodes.map((node) => {
    if (node.id !== draggedNode.id) {
      return node;
    }

    if (newParent) {
      const absoluteParentPosition = getAbsoluteNodePosition(newParent, currentNodes);
      return setNodeParent(
        {
          ...node,
          position: {
            x: absolutePosition.x - absoluteParentPosition.x,
            y: absolutePosition.y - absoluteParentPosition.y,
          },
        },
        newParent.id
      );
    }

    if (getNodeParentId(node)) {
      return unparentNode(node, absolutePosition);
    }

    return { ...node, position: draggedNode.position };
  });

  return ensureParentsBeforeChildren(autoFitSectionsToChildren(parentedNodes));
}
