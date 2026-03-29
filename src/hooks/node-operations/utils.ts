import type { FlowNode, NodeData } from '@/lib/types';
import { clearNodeParent, getNodeParentId, setNodeParent } from '@/lib/nodeParent';
import { resolveNodeSize } from '@/components/nodeHelpers';
import { NODE_DEFAULTS } from '@/theme';
import { createId } from '@/lib/id';

export const SECTION_MIN_WIDTH = 500;
export const SECTION_MIN_HEIGHT = 400;
export const SECTION_PADDING_X = 32;
export const SECTION_PADDING_BOTTOM = 32;
export const SECTION_HEADER_HEIGHT = 56;
export const SECTION_CONTENT_PADDING_TOP = SECTION_HEADER_HEIGHT;
const SECTION_DEFAULT_INSERT_SPACING = 28;

interface NodeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SectionTargetCandidate {
  section: FlowNode;
  depth: number;
  area: number;
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
      sectionOrder:
        typeof node.data?.sectionOrder === 'number' ? node.data.sectionOrder : 0,
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

interface CreateGenericShapeNodeOptions {
  type?: FlowNode['type'];
  label?: string;
  subLabel?: string;
  color?: string;
  shape?: NodeData['shape'];
  icon?: string;
  layerId?: string;
}

interface CreateMindmapTopicNodeOptions {
  id: string;
  position: { x: number; y: number };
  depth: number;
  parentId: string;
  side: 'left' | 'right';
  branchStyle: 'curved' | 'straight';
  layerId?: string;
}

interface CreateArchitectureServiceNodeOptions {
  id: string;
  position: { x: number; y: number };
  sourceNode: FlowNode;
  layerId: string;
}

export function createGenericShapeNode(
  id: string,
  position: { x: number; y: number },
  options: CreateGenericShapeNodeOptions = {}
): FlowNode {
  return {
    id,
    position,
    data: {
      label: options.label ?? '',
      subLabel: options.subLabel ?? '',
      color: options.color,
      shape: options.shape,
      icon: options.icon,
      layerId: options.layerId,
    },
    type: options.type ?? 'process',
  };
}

export function createProcessNode(
  id: string,
  position: { x: number; y: number },
  labels?: { label?: string; subLabel?: string }
): FlowNode {
  const defaults = NODE_DEFAULTS.process;
  return createGenericShapeNode(id, position, {
    type: 'process',
    label: labels?.label,
    subLabel: labels?.subLabel,
    color: defaults?.color || 'slate',
    shape: defaults?.shape as NodeData['shape'],
    icon: defaults?.icon && defaults.icon !== 'none' ? defaults.icon : undefined,
  });
}

export function createAnnotationNode(
  id: string,
  position: { x: number; y: number },
  labels: { label: string; subLabel: string }
): FlowNode {
  return {
    id,
    position,
    data: { label: labels.label, subLabel: labels.subLabel, color: 'yellow' },
    type: 'annotation',
  };
}

export function createSectionNode(
  id: string,
  position: { x: number; y: number },
  label: string
): FlowNode {
  return withSectionDefaults({
    id,
    position,
    data: {
      label,
      subLabel: '',
      color: 'blue',
      sectionSizingMode: 'manual',
      sectionLayoutMode: 'freeform',
      sectionOrder: 0,
      sectionLocked: false,
      sectionHidden: false,
      sectionCollapsed: false,
    },
    type: 'section',
    style: { width: SECTION_MIN_WIDTH, height: SECTION_MIN_HEIGHT },
    zIndex: -1,
  });
}

export function createTextNode(
  id: string,
  position: { x: number; y: number },
  label: string
): FlowNode {
  return {
    id,
    position,
    data: { label, subLabel: '', color: 'slate' },
    type: 'text',
  };
}

export function createImageNode(
  id: string,
  imageUrl: string,
  position: { x: number; y: number },
  label: string
): FlowNode {
  return {
    id,
    position,
    data: { label, imageUrl, transparency: 1, rotation: 0 },
    type: 'image',
    style: { width: 200, height: 200 },
  };
}

export function createClassNode(
  id: string,
  position: { x: number; y: number },
  label = 'ClassName'
): FlowNode {
  return {
    id,
    position,
    data: { label, color: 'slate', classStereotype: '', classAttributes: [], classMethods: [] },
    type: 'class',
  };
}

export function createEntityNode(
  id: string,
  position: { x: number; y: number },
  label = 'entity'
): FlowNode {
  return {
    id,
    position,
    data: { label, color: 'blue', erFields: [] },
    type: 'er_entity',
  };
}

export function createJourneyNode(
  id: string,
  position: { x: number; y: number },
  label = 'Step'
): FlowNode {
  return {
    id,
    position,
    data: {
      label,
      color: 'violet',
      journeySection: '',
      journeyActor: '',
      journeyTask: label,
      journeyScore: 3,
    },
    type: 'journey',
  };
}

export function createArchitectureNode(
  id: string,
  position: { x: number; y: number },
  label = 'Service'
): FlowNode {
  return {
    id,
    position,
    data: { label, color: 'blue', archProvider: 'aws', archResourceType: 'service' },
    type: 'architecture',
  };
}

export function createBrowserNode(
  id: string,
  position: { x: number; y: number },
  label = 'Page'
): FlowNode {
  return {
    id,
    position,
    data: { label, color: 'slate', icon: 'lock', variant: 'default' },
    type: 'browser',
    style: { width: 400, height: 300 },
  };
}

export function createMobileNode(
  id: string,
  position: { x: number; y: number },
  label = 'Screen'
): FlowNode {
  return {
    id,
    position,
    data: { label, color: 'slate', variant: 'default' },
    type: 'mobile',
    style: { width: 300, height: 600 },
  };
}

export function createSequenceParticipantNode(
  id: string,
  position: { x: number; y: number },
  label = 'Actor'
): FlowNode {
  return {
    id,
    position,
    data: { label, color: 'slate', seqParticipantKind: 'participant' },
    type: 'sequence_participant',
  };
}

export function createMindmapTopicNode({
  id,
  position,
  depth,
  parentId,
  side,
  branchStyle,
  layerId,
}: CreateMindmapTopicNodeOptions): FlowNode {
  return {
    id,
    type: 'mindmap',
    position,
    data: {
      label: 'New Topic',
      color: 'slate',
      shape: 'rounded',
      mindmapDepth: depth,
      mindmapParentId: parentId,
      mindmapSide: side,
      mindmapBranchStyle: branchStyle,
      layerId,
    },
    selected: true,
  };
}

export function createArchitectureServiceNode({
  id,
  position,
  sourceNode,
  layerId,
}: CreateArchitectureServiceNodeOptions): FlowNode {
  const sourceProvider = sourceNode.data?.archProvider || 'custom';

  return {
    id,
    type: 'architecture',
    position,
    data: {
      label: 'New Service',
      color: 'slate',
      shape: 'rectangle',
      icon: 'Server',
      archProvider: sourceProvider,
      archProviderLabel:
        sourceProvider === 'custom' ? sourceNode.data?.archProviderLabel : undefined,
      archResourceType: 'service',
      archEnvironment: sourceNode.data?.archEnvironment || 'default',
      archBoundaryId: sourceNode.data?.archBoundaryId,
      archZone: sourceNode.data?.archZone,
      archTrustDomain: sourceNode.data?.archTrustDomain,
      customIconUrl: sourceProvider === 'custom' ? sourceNode.data?.customIconUrl : undefined,
      archIconPackId: sourceProvider !== 'custom' ? sourceNode.data?.archIconPackId : undefined,
      archIconShapeId: sourceProvider !== 'custom' ? sourceNode.data?.archIconShapeId : undefined,
      layerId,
    },
    selected: true,
  };
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

function getNodeAncestorIds(node: FlowNode, allNodes: FlowNode[]): string[] {
  const ancestorIds: string[] = [];
  let currentParentId = getNodeParentId(node);

  while (currentParentId) {
    ancestorIds.push(currentParentId);
    const parentNode = allNodes.find((candidate) => candidate.id === currentParentId);
    currentParentId = parentNode ? getNodeParentId(parentNode) : '';
  }

  return ancestorIds;
}

function getDirectSectionChildren(sectionId: string, allNodes: FlowNode[]): FlowNode[] {
  return allNodes.filter((node) => getNodeParentId(node) === sectionId);
}

export function getSectionDescendants(sectionId: string, allNodes: FlowNode[]): FlowNode[] {
  return allNodes.filter((node) => getNodeAncestorIds(node, allNodes).includes(sectionId));
}

function isPointInsideBounds(point: { x: number; y: number }, bounds: NodeBounds): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

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

  return allNodes
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

  return findSectionTargetAtPoint(
    getDragTargetPoint(draggedNode, allNodes, absolutePoint),
    draggedNode.id,
    allNodes
  )?.id ?? null;
}

export function getNextSectionOrder(allNodes: FlowNode[]): number {
  const sectionOrders = allNodes
    .filter((node) => node.type === 'section')
    .map((node) => getSectionOrder(node));
  return sectionOrders.length === 0 ? 1 : Math.max(...sectionOrders) + 1;
}

export function getSectionInsertPosition(section: FlowNode, allNodes: FlowNode[]): { x: number; y: number } {
  const contentBounds = getSectionContentBounds(section, allNodes);
  const childCount = getDirectSectionChildren(section.id, allNodes).length;

  return {
    x: contentBounds.x + childCount * SECTION_DEFAULT_INSERT_SPACING,
    y: contentBounds.y + childCount * SECTION_DEFAULT_INSERT_SPACING,
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
  const preferredSection =
    preferredSectionId
      ? allNodes.find((candidate) => candidate.id === preferredSectionId && candidate.type === 'section')
      : null;

  const targetSection =
    !absolutePoint && preferredSection && !isSectionHidden(preferredSection) && !isSectionLocked(preferredSection)
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
  return allNodes.map((node) =>
    node.id === nodeId ? unparentNode(node, absolutePosition) : node
  );
}

export function bringContentsIntoSection(allNodes: FlowNode[], sectionId: string): FlowNode[] {
  const section = allNodes.find((node) => node.id === sectionId);
  if (!section || section.type !== 'section') {
    return allNodes;
  }

  const contentBounds = getSectionContentBounds(section, allNodes);

  return allNodes.map((node) => {
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

  return autoFitSectionsToChildren(parentedNodes);
}
