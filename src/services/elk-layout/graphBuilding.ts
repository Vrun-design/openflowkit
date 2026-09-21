import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk.bundled.js';
import { NODE_HEIGHT, NODE_WIDTH } from '@/constants';
import { getIconAssetNodeMinSize, resolveNodeSize } from '@/lib/nodeSize';
import {
  SECTION_CONTENT_PADDING_TOP,
  SECTION_PADDING_BOTTOM,
  SECTION_PADDING_X,
} from '@/lib/sectionBounds';
import { getNodeParentId } from '@/lib/nodeParent';
import type { FlowEdge, FlowNode } from '@/lib/types';
import { DEFAULT_MAX_WIDTH, estimateWrappedTextBox } from './textSizing';
import type { FlowNodeWithMeasuredDimensions } from './types';

export const IMPORT_NODE_MIN_WIDTH = 120;
export const IMPORT_NODE_MIN_HEIGHT = 40;
export const IMPORT_NODE_MAX_WIDTH = 320;

const ELK_SECTION_PADDING = `[top=${SECTION_CONTENT_PADDING_TOP},left=${SECTION_PADDING_X},bottom=${SECTION_PADDING_BOTTOM},right=${SECTION_PADDING_X}]`;
const ELK_COMPOUND_LAYOUT_OPTIONS = {
  'elk.algorithm': 'layered',
} as const;

export function estimateNodeSize(
  node: FlowNode,
  nodeMinWidth: number,
  nodeMinHeight: number
): { width: number; height: number } {
  const isImportSized = nodeMinWidth < NODE_WIDTH;
  const estimate = estimateWrappedTextBox(String(node.data?.label ?? ''), {
    minWidth: nodeMinWidth,
    minHeight: nodeMinHeight,
    maxWidth: isImportSized ? IMPORT_NODE_MAX_WIDTH : DEFAULT_MAX_WIDTH,
  });

  // Only apply resolvedSize as a floor when it represents an explicit user-set
  // dimension, not the canvas default. For import-sized nodes, resolveNodeSize()
  // returns 250px which would silently defeat import compaction.
  if (isImportSized) {
    return estimate;
  }

  const resolvedSize = resolveNodeSize(node);
  return {
    width: Math.max(resolvedSize.width, estimate.width),
    height: Math.max(resolvedSize.height, estimate.height),
  };
}

function hasInternalEdges(childIds: Set<string>, edges: FlowEdge[]): boolean {
  return edges.some((e) => childIds.has(e.source) && childIds.has(e.target));
}

export function buildElkNode(
  node: FlowNode,
  childrenByParent: Map<string, FlowNode[]>,
  allEdges: FlowEdge[],
  nodeMinWidth = NODE_WIDTH,
  nodeMinHeight = NODE_HEIGHT,
  rootElkDirection = 'DOWN'
): ElkNode {
  const children = childrenByParent.get(node.id) || [];

  const nodeWithMeasuredDimensions = node as FlowNodeWithMeasuredDimensions;
  let width = nodeWithMeasuredDimensions.measured?.width;
  let height = nodeWithMeasuredDimensions.measured?.height;

  if (!width || !height) {
    if (node.data?.assetPresentation === 'icon') {
      const minSize = getIconAssetNodeMinSize(Boolean(node.data?.label?.trim()));
      width = width ?? minSize.minWidth;
      height = height ?? minSize.minHeight;
    } else {
      const estimatedSize = estimateNodeSize(node, nodeMinWidth, nodeMinHeight);
      width = width ?? estimatedSize.width;
      height = height ?? estimatedSize.height;
    }
  }

  const hasChildren = children.length > 0;

  // Subgraphs with no internal edges (pure parallel siblings) lay out
  // horizontally regardless of root direction — matching Mermaid's Dagre
  // which places same-rank disconnected nodes side by side.
  const childIds = hasChildren ? new Set(children.map((c) => c.id)) : null;
  const parallelChildren = childIds !== null && !hasInternalEdges(childIds, allEdges);

  // Compound nodes must explicitly inherit the root elk.direction — ELK does
  // not cascade it automatically, so without this subgraphs always use ELK's
  // built-in default (DOWN) regardless of the root graph setting.
  const compoundLayoutOptions = hasChildren
    ? {
        ...ELK_COMPOUND_LAYOUT_OPTIONS,
        'elk.direction': parallelChildren ? 'RIGHT' : rootElkDirection,
      }
    : {};

  // Anchored layout: pinned nodes keep their current canvas position and
  // ELK arranges the rest around them. Position is supplied as ELK input;
  // the FIXED placement strategy tells the layered algorithm to honor it.
  const pinned = node.data?.pinned === true && !hasChildren;
  const pinnedOptions = pinned
    ? {
        'org.eclipse.elk.position': `(${node.position.x},${node.position.y})`,
        'org.eclipse.elk.layered.nodePlacement.strategy': 'FIXED',
      }
    : {};

  return {
    id: node.id,
    width: hasChildren ? undefined : width,
    height: hasChildren ? undefined : height,
    ...(pinned ? { x: node.position.x, y: node.position.y } : {}),
    children: children.map((child) =>
      buildElkNode(child, childrenByParent, allEdges, nodeMinWidth, nodeMinHeight, rootElkDirection)
    ),
    layoutOptions: {
      'elk.padding': ELK_SECTION_PADDING,
      ...compoundLayoutOptions,
      ...pinnedOptions,
    },
  };
}

export function buildPositionMap(
  layoutResult: ElkNode
): Map<string, { x: number; y: number; width?: number; height?: number }> {
  const positionMap = new Map<string, { x: number; y: number; width?: number; height?: number }>();

  function traverse(node: ElkNode): void {
    if (node.id !== 'root') {
      positionMap.set(node.id, {
        x: node.x ?? 0,
        y: node.y ?? 0,
        width: node.width,
        height: node.height,
      });
    }
    node.children?.forEach(traverse);
  }

  traverse(layoutResult);
  return positionMap;
}

export function normalizeParentedElkPositions(
  nodes: FlowNode[],
  absolutePositionMap: Map<string, { x: number; y: number; width?: number; height?: number }>
): Map<string, { x: number; y: number; width?: number; height?: number }> {
  const normalizedPositionMap = new Map(absolutePositionMap);

  for (const node of nodes) {
    const parentId = getNodeParentId(node);
    if (!parentId) {
      continue;
    }

    const childPosition = absolutePositionMap.get(node.id);
    const parentPosition = absolutePositionMap.get(parentId);
    if (!childPosition || !parentPosition) {
      continue;
    }

    normalizedPositionMap.set(node.id, {
      ...childPosition,
      x: childPosition.x - parentPosition.x,
      y: childPosition.y - parentPosition.y,
    });
  }

  return normalizedPositionMap;
}

export function applyElkLayoutToNodes(
  nodes: FlowNode[],
  absolutePositionMap: Map<string, { x: number; y: number; width?: number; height?: number }>
): FlowNode[] {
  const normalizedPositionMap = normalizeParentedElkPositions(nodes, absolutePositionMap);

  return nodes.map((node) => {
    const normalizedPosition = normalizedPositionMap.get(node.id);
    if (!normalizedPosition) {
      return node;
    }

    const style = { ...node.style };
    if (node.type === 'group' || node.type === 'section' || node.type === 'container') {
      if (normalizedPosition.width) {
        style.width = normalizedPosition.width;
      }
      if (normalizedPosition.height) {
        style.height = normalizedPosition.height;
      }
    }

    return {
      ...node,
      position: { x: normalizedPosition.x, y: normalizedPosition.y },
      style,
    };
  });
}

function buildParentIdMap(
  topLevelNodes: FlowNode[],
  childrenByParent: Map<string, FlowNode[]>
): Map<string, string | null> {
  const parentById = new Map<string, string | null>();
  function walk(node: FlowNode, parentId: string | null): void {
    parentById.set(node.id, parentId);
    for (const child of childrenByParent.get(node.id) ?? []) {
      walk(child, node.id);
    }
  }
  for (const node of topLevelNodes) walk(node, null);
  return parentById;
}

function ancestorChain(
  nodeId: string,
  parentById: Map<string, string | null>
): string[] {
  const chain: string[] = [];
  let cursor: string | null | undefined = nodeId;
  while (cursor) {
    chain.push(cursor);
    cursor = parentById.get(cursor) ?? null;
  }
  return chain;
}

function lowestCommonAncestor(
  sourceId: string,
  targetId: string,
  parentById: Map<string, string | null>
): string | null {
  const sourceAncestors = new Set(ancestorChain(sourceId, parentById));
  for (const ancestor of ancestorChain(targetId, parentById)) {
    if (sourceAncestors.has(ancestor)) return ancestor;
  }
  return null;
}

function attachEdgesAtLca(
  root: ElkNode,
  edges: FlowEdge[],
  parentById: Map<string, string | null>
): void {
  const elkNodeById = new Map<string, ElkNode>();
  function indexNodes(node: ElkNode): void {
    elkNodeById.set(node.id, node);
    node.children?.forEach(indexNodes);
  }
  root.children?.forEach(indexNodes);

  const edgesByOwner = new Map<string | null, ElkExtendedEdge[]>();
  for (const edge of edges) {
    const lca = lowestCommonAncestor(edge.source, edge.target, parentById);
    // If endpoints share a compound parent, attach the edge there; otherwise
    // place it at the root. ELK crashes with INCLUDE_CHILDREN when an edge
    // sits above its LCA in the hierarchy.
    const ownerId = lca && elkNodeById.has(lca) && lca !== edge.source && lca !== edge.target
      ? lca
      : null;
    const bucket = edgesByOwner.get(ownerId) ?? [];
    bucket.push({ id: edge.id, sources: [edge.source], targets: [edge.target] });
    edgesByOwner.set(ownerId, bucket);
  }

  for (const [ownerId, ownerEdges] of edgesByOwner) {
    const target = ownerId === null ? root : elkNodeById.get(ownerId);
    if (!target) continue;
    target.edges = [...(target.edges ?? []), ...ownerEdges];
  }
}

export function buildElkRootGraph(
  orderedTopLevelNodes: FlowNode[],
  childrenByParent: Map<string, FlowNode[]>,
  sortedEdges: FlowEdge[],
  layoutOptions: Record<string, string>,
  nodeMinWidth: number,
  nodeMinHeight: number
): ElkNode {
  const root: ElkNode = {
    id: 'root',
    layoutOptions,
    children: orderedTopLevelNodes.map((node) =>
      buildElkNode(
        node,
        childrenByParent,
        sortedEdges,
        nodeMinWidth,
        nodeMinHeight,
        layoutOptions['elk.direction'] ?? 'DOWN'
      )
    ),
    edges: [],
  };
  const parentById = buildParentIdMap(orderedTopLevelNodes, childrenByParent);
  attachEdgesAtLca(root, sortedEdges, parentById);
  return root;
}
