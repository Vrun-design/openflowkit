import type { FlowNode } from '@/lib/types';
import { getNodeParentId } from '@/lib/nodeParent';
import { resolveNodeSize } from '@/components/nodeHelpers';

export const SECTION_MIN_WIDTH = 500;
export const SECTION_MIN_HEIGHT = 400;
export const SECTION_PADDING_X = 32;
export const SECTION_PADDING_BOTTOM = 32;
// Title now floats ABOVE the section border — no internal header space needed
export const SECTION_HEADER_HEIGHT = 16;
export const SECTION_CONTENT_PADDING_TOP = SECTION_HEADER_HEIGHT;

export interface NodeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getAbsoluteNodePosition(
  node: FlowNode,
  allNodes: FlowNode[]
): { x: number; y: number } {
  let absoluteX = node.position.x;
  let absoluteY = node.position.y;
  let currentParentId = getNodeParentId(node);

  while (currentParentId) {
    const parentNode = allNodes.find((candidate) => candidate.id === currentParentId);
    if (!parentNode) {
      break;
    }
    absoluteX += parentNode.position.x;
    absoluteY += parentNode.position.y;
    currentParentId = getNodeParentId(parentNode);
  }

  return { x: absoluteX, y: absoluteY };
}

function getNodeSize(node: FlowNode): { width: number; height: number } {
  return resolveNodeSize(node);
}

export function getAbsoluteNodeBounds(node: FlowNode, allNodes: FlowNode[]): NodeBounds {
  const position = getAbsoluteNodePosition(node, allNodes);
  const size = getNodeSize(node);
  return {
    x: position.x,
    y: position.y,
    width: size.width,
    height: size.height,
  };
}

export function getNodeAncestorIds(node: FlowNode, allNodes: FlowNode[]): string[] {
  const ancestorIds: string[] = [];
  let currentParentId = getNodeParentId(node);

  while (currentParentId) {
    ancestorIds.push(currentParentId);
    const parentNode = allNodes.find((candidate) => candidate.id === currentParentId);
    currentParentId = parentNode ? getNodeParentId(parentNode) : '';
  }

  return ancestorIds;
}

export function getDirectSectionChildren(sectionId: string, allNodes: FlowNode[]): FlowNode[] {
  return allNodes.filter((node) => getNodeParentId(node) === sectionId);
}

export function getSectionDescendants(sectionId: string, allNodes: FlowNode[]): FlowNode[] {
  return allNodes.filter((node) => getNodeAncestorIds(node, allNodes).includes(sectionId));
}

export function isPointInsideBounds(point: { x: number; y: number }, bounds: NodeBounds): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

export function getSectionContentBounds(section: FlowNode, allNodes: FlowNode[]): NodeBounds {
  const bounds = getAbsoluteNodeBounds(section, allNodes);

  return {
    x: bounds.x + SECTION_PADDING_X,
    y: bounds.y + SECTION_CONTENT_PADDING_TOP,
    width: Math.max(bounds.width - SECTION_PADDING_X * 2, 1),
    height: Math.max(bounds.height - SECTION_CONTENT_PADDING_TOP - SECTION_PADDING_BOTTOM, 1),
  };
}

export function isSectionLocked(node: FlowNode): boolean {
  return node.type === 'section' && node.data?.sectionLocked === true;
}

export function isSectionHidden(node: FlowNode): boolean {
  return node.type === 'section' && node.data?.sectionHidden === true;
}

export function getSectionOrder(node: FlowNode): number {
  return typeof node.data?.sectionOrder === 'number' ? node.data.sectionOrder : 0;
}

export function withSectionDefaults<T extends FlowNode>(node: T): T {
  if (node.type !== 'section') {
    return node;
  }

  return {
    ...node,
    data: {
      ...node.data,
      sectionSizingMode: node.data?.sectionSizingMode === 'fit' ? 'fit' : 'manual',
      sectionLayoutMode: 'freeform',
      sectionOrder: typeof node.data?.sectionOrder === 'number' ? node.data.sectionOrder : 0,
      sectionLocked: node.data?.sectionLocked === true,
      sectionHidden: node.data?.sectionHidden === true,
      sectionCollapsed: node.data?.sectionCollapsed === true,
    },
  };
}

export function getDefaultNodePosition(
  count: number,
  baseX: number,
  baseY: number
): { x: number; y: number } {
  const columns = 4;
  const column = count % columns;
  const row = Math.floor(count / columns);
  return { x: baseX + column * 80, y: baseY + row * 80 };
}

/**
 * React Flow v12 requires parent nodes to appear BEFORE their children in the
 * nodes array. This function topologically sorts the array so that invariant
 * is always satisfied, which prevents the "child flies away during parent drag"
 * visual artifact.
 */
export function ensureParentsBeforeChildren(nodes: FlowNode[]): FlowNode[] {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const result: FlowNode[] = [];
  const visited = new Set<string>();

  function visit(node: FlowNode): void {
    if (visited.has(node.id)) return;
    const parentId = getNodeParentId(node);
    if (parentId) {
      const parent = nodeById.get(parentId);
      if (parent) visit(parent);
    }
    visited.add(node.id);
    result.push(node);
  }

  for (const node of nodes) {
    visit(node);
  }

  return result;
}
