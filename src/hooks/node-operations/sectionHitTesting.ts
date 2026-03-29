import type { FlowNode } from '@/lib/types';
import {
  SECTION_CONTENT_PADDING_TOP,
  getAbsoluteNodeBounds,
  getSectionContentBounds,
  getNodeAncestorIds,
  isPointInsideBounds,
  isSectionHidden,
  isSectionLocked,
  getSectionOrder,
} from './sectionBounds';

interface SectionTargetCandidate {
  section: FlowNode;
  depth: number;
  area: number;
}

function canTargetSection(section: FlowNode, draggedNodeId: string, allNodes: FlowNode[]): boolean {
  return (
    section.type === 'section' &&
    section.id !== draggedNodeId &&
    !isSectionHidden(section) &&
    !isSectionLocked(section) &&
    !getNodeAncestorIds(section, allNodes).includes(draggedNodeId)
  );
}

function findSectionTargetAtPoint(
  point: { x: number; y: number },
  draggedNodeId: string,
  allNodes: FlowNode[]
): FlowNode | null {
  const candidates = allNodes
    .filter((node): node is FlowNode => canTargetSection(node, draggedNodeId, allNodes))
    .map((section): SectionTargetCandidate | null => {
      const contentBounds = getSectionContentBounds(section, allNodes);
      if (!isPointInsideBounds(point, contentBounds)) {
        return null;
      }

      const depth = getNodeAncestorIds(section, allNodes).filter((ancestorId) => {
        const ancestor = allNodes.find((candidate) => candidate.id === ancestorId);
        return ancestor?.type === 'section';
      }).length;

      return {
        section,
        depth,
        area: contentBounds.width * contentBounds.height,
      };
    })
    .filter((candidate): candidate is SectionTargetCandidate => candidate !== null)
    .sort((left, right) => {
      if (right.depth !== left.depth) {
        return right.depth - left.depth;
      }

      if (left.area !== right.area) {
        return left.area - right.area;
      }

      return getSectionOrder(left.section) - getSectionOrder(right.section);
    });

  return candidates[0]?.section ?? null;
}

function getDragTargetPoint(
  draggedNode: FlowNode,
  allNodes: FlowNode[],
  absolutePoint?: { x: number; y: number }
): { x: number; y: number } {
  if (absolutePoint) {
    return absolutePoint;
  }

  const bounds = getAbsoluteNodeBounds(draggedNode, allNodes);
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + Math.min(bounds.height / 2, SECTION_CONTENT_PADDING_TOP),
  };
}

export function getContainingSectionId(
  allNodes: FlowNode[],
  draggedNode: FlowNode,
  absolutePoint?: { x: number; y: number }
): string | null {
  if (draggedNode.type === 'section') {
    return null;
  }

  return (
    findSectionTargetAtPoint(
      getDragTargetPoint(draggedNode, allNodes, absolutePoint),
      draggedNode.id,
      allNodes
    )?.id ?? null
  );
}

export { findSectionTargetAtPoint, getDragTargetPoint };
