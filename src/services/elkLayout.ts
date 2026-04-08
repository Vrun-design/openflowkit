import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk.bundled.js';
import { NODE_HEIGHT, NODE_WIDTH } from '@/constants';
import { getIconAssetNodeMinSize, resolveNodeSize } from '@/components/nodeHelpers';
import {
  SECTION_CONTENT_PADDING_TOP,
  SECTION_PADDING_BOTTOM,
  SECTION_PADDING_X,
} from '@/hooks/node-operations/sectionBounds';
import { createLogger } from '@/lib/logger';
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

const layoutCache = new Map<string, { nodes: FlowNode[]; edges: FlowEdge[] }>();
const LAYOUT_CACHE_MAX = 20;

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

function buildElkNode(node: FlowNode, childrenByParent: Map<string, FlowNode[]>): ElkNode {
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
      const resolvedSize = resolveNodeSize(node);
      const label = node.data?.label || '';
      const estimatedWidth = Math.max(resolvedSize.width, NODE_WIDTH, label.length * 8 + 40);
      const estimatedHeight = Math.max(
        resolvedSize.height,
        NODE_HEIGHT,
        Math.ceil(label.length / 40) * 20 + 60
      );

      width = width ?? estimatedWidth;
      height = height ?? estimatedHeight;
    }
  }

  const hasChildren = children.length > 0;
  return {
    id: node.id,
    width: hasChildren ? undefined : width,
    height: hasChildren ? undefined : height,
    children: children.map((child) => buildElkNode(child, childrenByParent)),
    layoutOptions: {
      'elk.padding': ELK_SECTION_PADDING,
      ...(hasChildren ? ELK_COMPOUND_LAYOUT_OPTIONS : {}),
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
  const label = node.data?.label ?? '';
  const width =
    pos?.width ??
    (node as FlowNodeWithMeasuredDimensions).measured?.width ??
    Math.max(NODE_WIDTH, label.length * 8 + 40);
  const height =
    pos?.height ??
    (node as FlowNodeWithMeasuredDimensions).measured?.height ??
    Math.max(NODE_HEIGHT, Math.ceil(label.length / 40) * 20 + 60);
  return {
    left: x,
    right: x + width,
    top: y,
    bottom: y + height,
    centerX: x + width / 2,
    centerY: y + height / 2,
  };
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
    const labelPosition = 0.5 + spread * ((idx / (count - 1)) - 0.5);

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
    data: {
      ...edge.data,
      routingMode: 'auto' as const,
      elkPoints: undefined,
    },
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

  return nodeCount >= 24 || edgeCount >= 36;
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
  const cached = layoutCache.get(cacheKey);
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

  const elkGraph: ElkNode = {
    id: 'root',
    layoutOptions,
    children: orderedTopLevelNodes.map((node) => buildElkNode(node, childrenByParent)),
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
          },
        };
      }
      return edge;
    });

    if (layoutCache.size >= LAYOUT_CACHE_MAX) {
      const firstKey = layoutCache.keys().next().value;
      if (firstKey !== undefined) layoutCache.delete(firstKey);
    }
    layoutCache.set(cacheKey, { nodes: laidOutNodes, edges: laidOutEdges });

    return { nodes: laidOutNodes, edges: laidOutEdges };
  } catch (err) {
    logger.error('ELK layout error.', { error: err });
    return { nodes, edges };
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
