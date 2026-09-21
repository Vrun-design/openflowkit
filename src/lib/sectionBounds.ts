import type { FlowNode } from '@/lib/types';
import { getNodeParentId } from '@/lib/nodeParent';
import { resolveNodeSize } from '@/lib/nodeSize';
import { isMermaidImportedContainerNode } from '@/services/mermaid/importProvenance';

// Section (container) geometry shared by the legacy-graph layout and mermaid import paths.
export const SECTION_MIN_WIDTH = 200;
export const SECTION_MIN_HEIGHT = 160;
export const SECTION_PADDING_X = 20;
export const SECTION_PADDING_BOTTOM = 32;
// Title floats above the section border — no internal header space needed.
export const SECTION_CONTENT_PADDING_TOP = 16;

function absolutePosition(node: FlowNode, allNodes: FlowNode[]): { x: number; y: number } {
  let x = node.position.x;
  let y = node.position.y;
  let parentId = getNodeParentId(node);
  while (parentId) {
    const parent = allNodes.find((candidate) => candidate.id === parentId);
    if (!parent) break;
    x += parent.position.x;
    y += parent.position.y;
    parentId = getNodeParentId(parent);
  }
  return { x, y };
}

function ancestorIds(node: FlowNode, allNodes: FlowNode[]): string[] {
  const ids: string[] = [];
  let parentId = getNodeParentId(node);
  while (parentId) {
    ids.push(parentId);
    const parent = allNodes.find((candidate) => candidate.id === parentId);
    parentId = parent ? getNodeParentId(parent) : '';
  }
  return ids;
}

function fitSectionToChildren(section: FlowNode, allNodes: FlowNode[]): FlowNode[] {
  if (isMermaidImportedContainerNode(section)) return allNodes;
  const descendants = allNodes.filter((node) => ancestorIds(node, allNodes).includes(section.id));
  if (descendants.length === 0) return allNodes;

  const bounds = descendants.map((node) => ({ ...absolutePosition(node, allNodes), ...resolveNodeSize(node) }));
  const minX = Math.min(...bounds.map((b) => b.x));
  const minY = Math.min(...bounds.map((b) => b.y));
  const maxX = Math.max(...bounds.map((b) => b.x + b.width));
  const maxY = Math.max(...bounds.map((b) => b.y + b.height));

  const nextX = minX - SECTION_PADDING_X;
  const nextY = minY - SECTION_CONTENT_PADDING_TOP;
  const nextWidth = Math.max(maxX - minX + SECTION_PADDING_X * 2, SECTION_MIN_WIDTH);
  const nextHeight = Math.max(maxY - minY + SECTION_CONTENT_PADDING_TOP + SECTION_PADDING_BOTTOM, SECTION_MIN_HEIGHT);
  const deltaX = nextX - section.position.x;
  const deltaY = nextY - section.position.y;
  if (deltaX === 0 && deltaY === 0 && section.style?.width === nextWidth && section.style?.height === nextHeight) {
    return allNodes;
  }

  return allNodes.map((node) => {
    if (node.id === section.id) {
      return { ...node, position: { x: nextX, y: nextY }, style: { ...node.style, width: nextWidth, height: nextHeight } };
    }
    if (getNodeParentId(node) === section.id) {
      return { ...node, position: { x: node.position.x - deltaX, y: node.position.y - deltaY } };
    }
    return node;
  });
}

/** Grows/shrinks every `sectionSizingMode: 'fit'` section around its descendants. */
export function autoFitSectionsToChildren(allNodes: FlowNode[]): FlowNode[] {
  return allNodes
    .filter((node) => node.type === 'section')
    .reduce((nodes, section) => {
      const latest = nodes.find((candidate) => candidate.id === section.id);
      if (!latest || latest.type !== 'section' || latest.data?.sectionSizingMode !== 'fit') return nodes;
      return fitSectionToChildren(latest, nodes);
    }, allNodes);
}
