import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk.bundled.js';
import { NODE_HEIGHT, NODE_WIDTH } from '@/constants';
import { getIconAssetNodeMinSize, resolveNodeSize } from '@/components/nodeHelpers';
import {
  SECTION_CONTENT_PADDING_TOP,
  SECTION_MIN_HEIGHT,
  SECTION_MIN_WIDTH,
  SECTION_PADDING_BOTTOM,
  SECTION_PADDING_X,
} from '@/hooks/node-operations/sectionBounds';
import { createLogger } from '@/lib/logger';
import { clearStoredRouteData } from '@/lib/edgeRouteData';
import { getNodeParentId } from '@/lib/nodeParent';
import type { FlowEdge, FlowNode } from '@/lib/types';
import { assignSmartHandlesWithOptions, handleSideFromVector } from './smartEdgeRouting';
import { normalizeLayoutInputsForDeterminism } from './elk-layout/determinism';
import { normalizeElkEdgeBoundaryFanout, type NodeBounds } from './elk-layout/boundaryFanout';
import {
  buildResolvedLayoutConfiguration,
  getDeterministicSeedOptions,
  resolveLayoutPresetOptions,
} from './elk-layout/options';
import type { FlowNodeWithMeasuredDimensions, LayoutOptions } from './elk-layout/types';
import { estimateWrappedTextBox, DEFAULT_MAX_WIDTH } from './elk-layout/textSizing';
import { getNodeHandleIdForSide } from '@/lib/nodeHandles';

interface ElkLayoutEngine {
  layout: (graph: ElkNode) => Promise<ElkNode>;
}

interface ElkModuleLike {
  default?: new () => unknown;
}

let elkInstancePromise: Promise<ElkLayoutEngine> | null = null;
const LARGE_DIAGRAM_NODE_THRESHOLD = 48;
const LARGE_DIAGRAM_EDGE_THRESHOLD = 72;
const logger = createLogger({ scope: 'elkLayout' });
const FALLBACK_LAYER_ORDER = ['edge', 'frontend', 'api', 'services', 'data', 'external'] as const;

const FALLBACK_LAYER_KEYWORDS: ReadonlyArray<{
  layer: (typeof FALLBACK_LAYER_ORDER)[number];
  keywords: string[];
}> = [
  { layer: 'edge', keywords: ['edge', 'gateway', 'cdn'] },
  { layer: 'frontend', keywords: ['frontend', 'browser', 'web', 'mobile'] },
  { layer: 'api', keywords: ['api'] },
  { layer: 'services', keywords: ['service', 'compute', 'worker', 'backend'] },
  { layer: 'data', keywords: ['data', 'database', 'cache', 'storage'] },
  { layer: 'external', keywords: ['external', 'third-party', 'third party'] },
];

const ELK_SECTION_PADDING = `[top=${SECTION_CONTENT_PADDING_TOP},left=${SECTION_PADDING_X},bottom=${SECTION_PADDING_BOTTOM},right=${SECTION_PADDING_X}]`;
const ELK_COMPOUND_LAYOUT_OPTIONS = {
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
  'elk.algorithm': 'layered',
} as const;

interface CacheEntry {
  nodes: FlowNode[];
  edges: FlowEdge[];
  timestamp: number;
}

const layoutCache = new Map<string, CacheEntry>();
const LAYOUT_CACHE_MAX = 20;
const LAYOUT_CACHE_TTL_MS = 60_000;

function getLayoutCacheKey(nodes: FlowNode[], edges: FlowEdge[], options: LayoutOptions): string {
  const nodeStr = nodes
    .map((n) => n.id)
    .sort()
    .join(',');
  const edgeStr = edges
    .map((e) => `${e.source}>${e.target}`)
    .sort()
    .join(',');
  return `${nodeStr}|${edgeStr}|${options.direction ?? 'TB'}:${options.algorithm ?? 'layered'}:${options.spacing ?? 'normal'}:${options.diagramType ?? ''}`;
}

/** Reset the cached ELK instance — useful in tests or when the instance may have become stale. */
export function resetElkInstance(): void {
  elkInstancePromise = null;
}

export function clearLayoutCache(): void {
  layoutCache.clear();
}

function getCachedLayout(cacheKey: string): { nodes: FlowNode[]; edges: FlowEdge[] } | null {
  const entry = layoutCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > LAYOUT_CACHE_TTL_MS) {
    layoutCache.delete(cacheKey);
    return null;
  }
  return { nodes: entry.nodes, edges: entry.edges };
}

function setCachedLayout(cacheKey: string, nodes: FlowNode[], edges: FlowEdge[]): void {
  if (layoutCache.size >= LAYOUT_CACHE_MAX) {
    const firstKey = layoutCache.keys().next().value;
    if (firstKey !== undefined) layoutCache.delete(firstKey);
  }
  layoutCache.set(cacheKey, { nodes, edges, timestamp: Date.now() });
}

async function getElkInstance(): Promise<ElkLayoutEngine> {
  if (!elkInstancePromise) {
    elkInstancePromise = import('elkjs/lib/elk.bundled.js').then((module) => {
      const elkModule = module as ElkModuleLike;
      if (typeof elkModule.default !== 'function') {
        throw new Error('ELK module did not expose a constructor.');
      }

      const candidate = new elkModule.default();
      if (!candidate || typeof (candidate as ElkLayoutEngine).layout !== 'function') {
        throw new Error('ELK instance does not implement layout().');
      }

      return candidate as ElkLayoutEngine;
    });
  }
  return elkInstancePromise;
}

const IMPORT_NODE_MIN_WIDTH = 120;
const IMPORT_NODE_MIN_HEIGHT = 40;
const IMPORT_NODE_MAX_WIDTH = 320;

function estimateNodeSize(
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

function buildElkNode(
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

  return {
    id: node.id,
    width: hasChildren ? undefined : width,
    height: hasChildren ? undefined : height,
    children: children.map((child) =>
      buildElkNode(child, childrenByParent, allEdges, nodeMinWidth, nodeMinHeight, rootElkDirection)
    ),
    layoutOptions: {
      'elk.padding': ELK_SECTION_PADDING,
      ...compoundLayoutOptions,
    },
  };
}

const SECTION_TYPES = new Set(['section', 'group', 'browser', 'mobile']);

function buildDynamicLayerOrder(nodes: FlowNode[]): readonly string[] {
  const sections = nodes.filter((n) => SECTION_TYPES.has(String(n.type)));
  if (sections.length === 0) return FALLBACK_LAYER_ORDER;
  return sections.map((n) => String(n.data?.label ?? n.id).toLowerCase());
}

function inferSemanticLayerRank(node: FlowNode, dynamicOrder: readonly string[]): number | null {
  if (typeof node.data?.archLayerRank === 'number' && Number.isFinite(node.data.archLayerRank)) {
    return node.data.archLayerRank;
  }

  const label = String(node.data?.label ?? '').toLowerCase();
  const subLabel = String(node.data?.subLabel ?? '').toLowerCase();
  const type = String(node.type ?? '').toLowerCase();
  const haystack = `${label} ${subLabel} ${type}`;

  const dynamicRank = dynamicOrder.findIndex((layer) => haystack.includes(layer));
  if (dynamicRank !== -1) return dynamicRank;

  const fallbackMatch = FALLBACK_LAYER_KEYWORDS.find(({ keywords }) =>
    keywords.some((kw) => haystack.includes(kw))
  );
  return fallbackMatch ? FALLBACK_LAYER_ORDER.indexOf(fallbackMatch.layer) : null;
}

function isArchitectureLikeNode(node: FlowNode): boolean {
  if (node.type === 'architecture') return true;
  return (
    inferSemanticLayerRank(node, FALLBACK_LAYER_ORDER) !== null ||
    SECTION_TYPES.has(String(node.type))
  );
}

function resolveEffectiveDiagramType(nodes: FlowNode[], diagramType?: string): string | undefined {
  if (diagramType) return diagramType;
  return nodes.some(isArchitectureLikeNode) ? 'architecture' : undefined;
}

function sortTopLevelNodesForArchitecture(
  topLevelNodes: FlowNode[],
  dynamicOrder: readonly string[]
): FlowNode[] {
  const rankCache = new Map(
    topLevelNodes.map((n) => [n.id, inferSemanticLayerRank(n, dynamicOrder)])
  );
  return [...topLevelNodes].sort((left, right) => {
    const leftRank = rankCache.get(left.id) ?? null;
    const rightRank = rankCache.get(right.id) ?? null;
    if (leftRank === null && rightRank === null) return 0;
    if (leftRank === null) return 1;
    if (rightRank === null) return -1;
    return leftRank - rightRank;
  });
}

function buildPositionMap(
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

function getNodeBoundsFromPositionMap(
  node: FlowNode,
  positionMap: Map<string, { x: number; y: number; width?: number; height?: number }>
): NodeBounds {
  const pos = positionMap.get(node.id);
  const x = pos?.x ?? node.position.x;
  const y = pos?.y ?? node.position.y;
  const measured = (node as FlowNodeWithMeasuredDimensions).measured;
  const needsEstimate = !pos?.width || !pos?.height;
  const estimate = needsEstimate ? estimateNodeSize(node, NODE_WIDTH, NODE_HEIGHT) : null;
  const width = pos?.width ?? measured?.width ?? estimate!.width;
  const height = pos?.height ?? measured?.height ?? estimate!.height;
  return {
    left: x,
    right: x + width,
    top: y,
    bottom: y + height,
    centerX: x + width / 2,
    centerY: y + height / 2,
  };
}

function getFallbackNodeSize(
  node: FlowNode,
  nodeMinWidth: number,
  nodeMinHeight: number
): { width: number; height: number } {
  const measured = node as FlowNodeWithMeasuredDimensions;
  if (measured.measured?.width && measured.measured?.height) {
    return {
      width: measured.measured.width,
      height: measured.measured.height,
    };
  }

  if (node.data?.assetPresentation === 'icon') {
    const minSize = getIconAssetNodeMinSize(Boolean(node.data?.label?.trim()));
    return { width: minSize.minWidth, height: minSize.minHeight };
  }

  return estimateNodeSize(node, nodeMinWidth, nodeMinHeight);
}

function getFallbackSpacing(options: LayoutOptions): { primary: number; secondary: number } {
  const isImport = options.source === 'import';
  const primaryBase = isImport ? 36 : 56;
  const secondaryBase = isImport ? 52 : 84;

  switch (options.contentDensity) {
    case 'compact':
      return { primary: primaryBase - 8, secondary: secondaryBase - 10 };
    case 'verbose':
      return { primary: primaryBase + 10, secondary: secondaryBase + 14 };
    default:
      return { primary: primaryBase, secondary: secondaryBase };
  }
}

function applyRecursiveFallbackLayout(
  nodes: FlowNode[],
  options: LayoutOptions,
  nodeMinWidth: number,
  nodeMinHeight: number
): FlowNode[] {
  const { topLevelNodes, childrenByParent } = normalizeLayoutInputsForDeterminism(nodes, []);
  const positionedNodes = new Map<string, FlowNode>();
  const isHorizontal = options.direction === 'LR' || options.direction === 'RL';
  const spacing = getFallbackSpacing(options);

  function layoutNode(
    node: FlowNode,
    origin: { x: number; y: number }
  ): { width: number; height: number } {
    const directChildren = childrenByParent.get(node.id) ?? [];
    const hasChildren = directChildren.length > 0;
    const nextNode: FlowNode = {
      ...node,
      position: origin,
    };

    if (!hasChildren) {
      positionedNodes.set(node.id, nextNode);
      return getFallbackNodeSize(node, nodeMinWidth, nodeMinHeight);
    }

    let cursorX = SECTION_PADDING_X;
    let cursorY = SECTION_CONTENT_PADDING_TOP;
    let maxChildRight = cursorX;
    let maxChildBottom = cursorY;

    for (const child of directChildren) {
      const childBounds = layoutNode(child, { x: cursorX, y: cursorY });
      maxChildRight = Math.max(maxChildRight, cursorX + childBounds.width);
      maxChildBottom = Math.max(maxChildBottom, cursorY + childBounds.height);

      if (isHorizontal) {
        cursorX += childBounds.width + spacing.primary;
      } else {
        cursorY += childBounds.height + spacing.primary;
      }
    }

    const width = Math.max(maxChildRight + SECTION_PADDING_X, SECTION_MIN_WIDTH);
    const height = Math.max(maxChildBottom + SECTION_PADDING_BOTTOM, SECTION_MIN_HEIGHT);

    positionedNodes.set(node.id, {
      ...nextNode,
      style:
        node.type === 'group' || node.type === 'section' || node.type === 'container'
          ? {
              ...node.style,
              width,
              height,
            }
          : node.style,
    });

    return { width, height };
  }

  let cursorX = 0;
  let cursorY = 0;
  for (const node of topLevelNodes) {
    const laidOutSize = layoutNode(node, { x: cursorX, y: cursorY });
    if (isHorizontal) {
      cursorX += laidOutSize.width + spacing.secondary;
    } else {
      cursorY += laidOutSize.height + spacing.secondary;
    }
  }

  return nodes.map((node) => positionedNodes.get(node.id) ?? node);
}

function inferHandleSideFromPoint(
  bounds: NodeBounds,
  point: { x: number; y: number },
  adjacentPoint?: { x: number; y: number }
): 'left' | 'right' | 'top' | 'bottom' {
  const dx = adjacentPoint ? adjacentPoint.x - point.x : point.x - bounds.centerX;
  const dy = adjacentPoint ? adjacentPoint.y - point.y : point.y - bounds.centerY;
  return handleSideFromVector(dx, dy);
}

function staggerParallelEdgeLabels(edges: FlowEdge[]): FlowEdge[] {
  if (!edges.some((e) => e.label)) return edges;

  const pairCounts = new Map<string, number>();
  const pairIndex = new Map<string, number>();

  for (const edge of edges) {
    const key = [edge.source, edge.target].sort().join('|');
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
  }

  return edges.map((edge) => {
    const key = [edge.source, edge.target].sort().join('|');
    const count = pairCounts.get(key) ?? 1;
    if (count <= 1 || !edge.label) return edge;

    const idx = pairIndex.get(key) ?? 0;
    pairIndex.set(key, idx + 1);

    // Spread labels across 0.3–0.7 range to avoid pile-up at the midpoint.
    const spread = 0.4;
    const labelPosition = 0.5 + spread * (idx / (count - 1) - 0.5);

    return {
      ...edge,
      data: {
        ...edge.data,
        labelPosition: edge.data?.labelPosition ?? labelPosition,
      },
    };
  });
}

function applyElkHandles(
  edges: FlowEdge[],
  nodes: FlowNode[],
  positionMap: Map<string, { x: number; y: number; width?: number; height?: number }>,
  edgePointsMap: Map<string, { x: number; y: number }[]>
): FlowEdge[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const routed = edges.map((edge) => {
    if (edge.source === edge.target) return edge;
    const points = edgePointsMap.get(edge.id);
    if (!points || points.length < 2) return edge;
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!sourceNode || !targetNode) return edge;
    const sourceBounds = getNodeBoundsFromPositionMap(sourceNode, positionMap);
    const targetBounds = getNodeBoundsFromPositionMap(targetNode, positionMap);
    const sourceSide = inferHandleSideFromPoint(sourceBounds, points[0], points[1]);
    const targetSide = inferHandleSideFromPoint(
      targetBounds,
      points[points.length - 1],
      points[points.length - 2]
    );
    const sourceHandle = getNodeHandleIdForSide(sourceNode, sourceSide);
    const targetHandle = getNodeHandleIdForSide(targetNode, targetSide);
    if (edge.sourceHandle === sourceHandle && edge.targetHandle === targetHandle) return edge;
    return { ...edge, sourceHandle, targetHandle };
  });
  return staggerParallelEdgeLabels(routed);
}

export type { LayoutAlgorithm, LayoutDirection, LayoutOptions } from './elk-layout/types';
export {
  buildResolvedLayoutConfiguration,
  getDeterministicSeedOptions,
  normalizeLayoutInputsForDeterminism,
  normalizeElkEdgeBoundaryFanout,
  resolveLayoutPresetOptions,
};

export function resolveLayoutedEdgeHandles(nodes: FlowNode[], edges: FlowEdge[]): FlowEdge[] {
  return assignSmartHandlesWithOptions(nodes, edges, {
    profile: 'standard',
    bundlingEnabled: true,
  });
}

/**
 * Re-routes all edges using smart handle assignment, clearing any stale ELK waypoints.
 * Use this after manual node moves to clean up all edges without re-running the full layout.
 */
export function rerouteEdges(nodes: FlowNode[], edges: FlowEdge[]): FlowEdge[] {
  return resolveLayoutedEdgeHandles(nodes, edges).map((edge) => ({
    ...edge,
    data: clearStoredRouteData(edge),
  }));
}

function isSparseDiagram(nodeCount: number, edgeCount: number): boolean {
  if (nodeCount <= 20) return true;
  const avgDegree = nodeCount > 0 ? (edgeCount * 2) / nodeCount : 0;
  return avgDegree <= 2.5;
}

function detectCycles(nodes: FlowNode[], edges: FlowEdge[]): boolean {
  const adjacency = new Map<string, string[]>();
  const visiting = new Set<string>();
  const visited = new Set<string>();

  nodes.forEach((node) => adjacency.set(node.id, []));
  edges.forEach((edge) => {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, []);
    }
    adjacency.get(edge.source)?.push(edge.target);
  });

  function visit(nodeId: string): boolean {
    if (visiting.has(nodeId)) {
      return true;
    }
    if (visited.has(nodeId)) {
      return false;
    }

    visiting.add(nodeId);
    for (const nextId of adjacency.get(nodeId) ?? []) {
      if (visit(nextId)) {
        return true;
      }
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
    return false;
  }

  for (const nodeId of adjacency.keys()) {
    if (visit(nodeId)) {
      return true;
    }
  }

  return false;
}

function getMaxBranchingFactor(edges: FlowEdge[]): number {
  const counts = new Map<string, number>();
  let max = 0;
  for (const edge of edges) {
    const count = (counts.get(edge.source) ?? 0) + 1;
    counts.set(edge.source, count);
    if (count > max) max = count;
  }
  return max;
}

export function resolveAutomaticLayoutAlgorithm(
  nodes: FlowNode[],
  edges: FlowEdge[],
  options: LayoutOptions = {}
): LayoutOptions['algorithm'] {
  if (options.algorithm) {
    return options.algorithm;
  }

  if (options.diagramType === 'architecture' || options.diagramType === 'infrastructure') {
    return 'layered';
  }

  const nodeCount = nodes.length;
  const edgeCount = edges.length;
  if (nodeCount <= 1 || edgeCount === 0) {
    return 'layered';
  }

  const density = edgeCount / Math.max(nodeCount * (nodeCount - 1), 1);
  const hasCycles = detectCycles(nodes, edges);
  const maxBranchingFactor = getMaxBranchingFactor(edges);

  if (!hasCycles && maxBranchingFactor > 4 && edgeCount >= nodeCount - 1) {
    return 'mrtree';
  }

  if (density > 0.15 || hasCycles) {
    return nodeCount >= 24 ? 'stress' : 'force';
  }

  return 'layered';
}

export function shouldUseLightweightLayoutPostProcessing(
  nodeCount: number,
  edgeCount: number,
  diagramType?: string
): boolean {
  if (nodeCount >= LARGE_DIAGRAM_NODE_THRESHOLD || edgeCount >= LARGE_DIAGRAM_EDGE_THRESHOLD) {
    return true;
  }

  const isArchitectureDiagram = diagramType === 'architecture' || diagramType === 'infrastructure';
  if (!isArchitectureDiagram) {
    return false;
  }

  return nodeCount >= 40 || edgeCount >= 60;
}

export async function getElkLayout(
  nodes: FlowNode[],
  edges: FlowEdge[],
  options: LayoutOptions = {}
): Promise<{ nodes: FlowNode[]; edges: FlowEdge[] }> {
  function collectEdgePoints(
    elkNode: ElkNode | (ElkNode & { edges?: ElkExtendedEdge[]; children?: ElkNode[] }),
    edgePointsMap: Map<string, { x: number; y: number }[]>
  ): void {
    if (elkNode.edges) {
      elkNode.edges.forEach((layeredElkEdge) => {
        if (layeredElkEdge.sections && layeredElkEdge.sections.length > 0) {
          const section = layeredElkEdge.sections[0];
          const points = [
            section.startPoint,
            ...(section.bendPoints || []),
            section.endPoint,
          ].filter(Boolean) as { x: number; y: number }[];
          edgePointsMap.set(layeredElkEdge.id, points);
        }
      });
    }
    if (elkNode.children) {
      elkNode.children.forEach((childNode) => collectEdgePoints(childNode, edgePointsMap));
    }
  }

  const effectiveDiagramType = resolveEffectiveDiagramType(nodes, options.diagramType);
  const algorithm = resolveAutomaticLayoutAlgorithm(nodes, edges, {
    ...options,
    diagramType: effectiveDiagramType,
  });
  const cacheKey = getLayoutCacheKey(nodes, edges, {
    ...options,
    algorithm,
    diagramType: effectiveDiagramType,
  });
  const cached = getCachedLayout(cacheKey);
  if (cached) return cached;
  const { layoutOptions } = buildResolvedLayoutConfiguration({
    ...options,
    algorithm,
    diagramType: effectiveDiagramType,
  });
  const { topLevelNodes, childrenByParent, sortedEdges } = normalizeLayoutInputsForDeterminism(
    nodes,
    edges
  );
  const orderedTopLevelNodes =
    effectiveDiagramType === 'architecture' || effectiveDiagramType === 'infrastructure'
      ? sortTopLevelNodesForArchitecture(topLevelNodes, buildDynamicLayerOrder(nodes))
      : topLevelNodes;

  const isImport = options.source === 'import';
  const nodeMinWidth = isImport ? IMPORT_NODE_MIN_WIDTH : NODE_WIDTH;
  const nodeMinHeight = isImport ? IMPORT_NODE_MIN_HEIGHT : NODE_HEIGHT;

  const elkGraph: ElkNode = {
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
    edges: sortedEdges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })) as ElkExtendedEdge[],
  };

  try {
    const elk = await getElkInstance();
    const layoutResult = await elk.layout(elkGraph);
    const positionMap = buildPositionMap(layoutResult);

    // Collect bend points by traversing the ENTIRE ELK result tree.
    // ELK puts routed edges inside children[].edges, NOT at the root level.
    const edgePointsMap = new Map<string, { x: number; y: number }[]>();
    collectEdgePoints(layoutResult, edgePointsMap);

    const laidOutNodes = applyElkLayoutToNodes(nodes, positionMap);
    const sparse = isSparseDiagram(nodes.length, sortedEdges.length);
    const useLightweightPostProcessing = shouldUseLightweightLayoutPostProcessing(
      nodes.length,
      sortedEdges.length,
      effectiveDiagramType
    );

    // For sparse/small diagrams: use smart position-based handle assignment + bezier routing.
    // For dense diagrams: infer handles directly from ELK's computed waypoints — more accurate.
    const reroutedEdges =
      sparse || useLightweightPostProcessing
        ? resolveLayoutedEdgeHandles(laidOutNodes, sortedEdges)
        : applyElkHandles(sortedEdges, laidOutNodes, positionMap, edgePointsMap);

    const normalizedElkPointsMap =
      sparse || useLightweightPostProcessing
        ? new Map<string, { x: number; y: number }[]>()
        : normalizeElkEdgeBoundaryFanout(reroutedEdges, laidOutNodes, positionMap, edgePointsMap);

    const laidOutEdges = reroutedEdges.map((edge) => {
      if (sparse || useLightweightPostProcessing) {
        return {
          ...edge,
          data: {
            ...edge.data,
            routingMode:
              edge.data?.routingMode === 'manual' ? ('manual' as const) : ('auto' as const),
            elkPoints: undefined,
            importRoutePoints: undefined,
            importRoutePath: undefined,
          },
        };
      }
      const points = normalizedElkPointsMap.get(edge.id) ?? edgePointsMap.get(edge.id);
      if (points) {
        return {
          ...edge,
          data: {
            ...edge.data,
            routingMode:
              edge.data?.routingMode === 'manual' ? ('manual' as const) : ('elk' as const),
            elkPoints: points,
            importRoutePoints: undefined,
            importRoutePath: undefined,
          },
        };
      }
      return edge;
    });

    setCachedLayout(cacheKey, laidOutNodes, laidOutEdges);

    return { nodes: laidOutNodes, edges: laidOutEdges };
  } catch (err) {
    logger.error('ELK layout error.', { error: err });
    const fallbackNodes = applyRecursiveFallbackLayout(nodes, options, nodeMinWidth, nodeMinHeight);
    return {
      nodes: fallbackNodes,
      edges: resolveLayoutedEdgeHandles(fallbackNodes, edges),
    };
  }
}

export function enforceDirectionalHandles(
  edges: FlowEdge[],
  direction: 'TB' | 'LR' | 'RL' | 'BT'
): FlowEdge[] {
  const isLR = direction === 'LR' || direction === 'RL';
  const sourceHandle = isLR ? 'right' : 'bottom';
  const targetHandle = isLR ? 'left' : 'top';

  return edges.map((edge) => ({
    ...edge,
    sourceHandle: edge.sourceHandle || sourceHandle,
    targetHandle: edge.targetHandle || targetHandle,
  }));
}
