import type { FlowNode } from '@/lib/types';
import { clearNodeParent, getNodeParentId, setNodeParent } from '@/lib/nodeParent';
import { createSectionNode } from './nodeFactories';
import {
  ensureParentsBeforeChildren,
  getAbsoluteNodeBounds,
  getDirectSectionChildren,
  getAbsoluteNodePosition,
  SECTION_CONTENT_PADDING_TOP,
  SECTION_PADDING_BOTTOM,
  SECTION_PADDING_X,
} from './sectionBounds';
import { fitSectionToChildren } from './sectionOperations';

/**
 * Wraps the given top-level nodes in a new section sized around them.
 * Returns the unchanged array when there is nothing to wrap.
 */
export function wrapNodesInSection(
  allNodes: FlowNode[],
  nodeIds: readonly string[],
  sectionId: string,
  label: string
): FlowNode[] {
  const targets = allNodes.filter(
    (node) => nodeIds.includes(node.id) && !getNodeParentId(node) && node.type !== 'section'
  );
  if (targets.length === 0) return allNodes;
  const bounds = targets.map((node) => getAbsoluteNodeBounds(node, allNodes));
  const minX = Math.min(...bounds.map((b) => b.x)) - SECTION_PADDING_X;
  const minY = Math.min(...bounds.map((b) => b.y)) - SECTION_CONTENT_PADDING_TOP;
  const maxX = Math.max(...bounds.map((b) => b.x + b.width)) + SECTION_PADDING_X;
  const maxY = Math.max(...bounds.map((b) => b.y + b.height)) + SECTION_PADDING_BOTTOM;
  const section: FlowNode = {
    ...createSectionNode(sectionId, { x: minX, y: minY }, label),
    style: { width: maxX - minX, height: maxY - minY },
    selected: true,
  };
  const targetIds = new Set(targets.map(({ id }) => id));
  const parented = allNodes.map((node) => {
    if (!targetIds.has(node.id)) return node;
    return setNodeParent(
      { ...node, position: { x: node.position.x - minX, y: node.position.y - minY }, selected: false },
      sectionId
    );
  });
  return fitSectionToChildren(section, ensureParentsBeforeChildren([section, ...parented]));
}

/** Releases every direct child of a section to its parent level, then removes the section. */
export function ungroupSection(allNodes: FlowNode[], sectionId: string): FlowNode[] {
  const section = allNodes.find((node) => node.id === sectionId && node.type === 'section');
  if (!section) return allNodes;
  const origin = getAbsoluteNodePosition(section, allNodes);
  const parentOrigin = getNodeParentId(section)
    ? getAbsoluteNodePosition(allNodes.find((n) => n.id === getNodeParentId(section))!, allNodes)
    : { x: 0, y: 0 };
  const grandparentId = getNodeParentId(section);
  const childIds = new Set(getDirectSectionChildren(sectionId, allNodes).map(({ id }) => id));
  return allNodes
    .filter((node) => node.id !== sectionId)
    .map((node) => {
      if (!childIds.has(node.id)) return node;
      const released = {
        ...clearNodeParent(node),
        position: {
          x: node.position.x + origin.x - parentOrigin.x,
          y: node.position.y + origin.y - parentOrigin.y,
        },
        selected: true,
      };
      return grandparentId ? setNodeParent(released, grandparentId) : released;
    });
}
