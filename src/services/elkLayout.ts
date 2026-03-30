import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk.bundled.js';
import { NODE_HEIGHT, NODE_WIDTH } from '@/constants';
import { getIconAssetNodeMinSize, resolveNodeSize } from '@/components/nodeHelpers';
import { createLogger } from '@/lib/logger';
import type { FlowEdge, FlowNode } from '@/lib/types';
import { assignSmartHandlesWithOptions } from './smartEdgeRouting';
import { normalizeLayoutInputsForDeterminism } from './elk-layout/determinism';
import { normalizeElkEdgeBoundaryFanout } from './elk-layout/boundaryFanout';
import {
  buildResolvedLayoutConfiguration,
  getDeterministicSeedOptions,
  resolveLayoutPresetOptions,
} from './elk-layout/options';
import type { FlowNodeWithMeasuredDimensions, LayoutOptions } from './elk-layout/types';

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
const SEMANTIC_LAYER_ORDER = ['edge', 'frontend', 'api', 'services', 'data', 'external'] as const;

const layoutCache = new Map<string, { nodes: FlowNode[]; edges: FlowEdge[] }>();
const LAYOUT_CACHE_MAX = 20;

function getLayoutCacheKey(nodes: FlowNode[], edges: FlowEdge[], options: LayoutOptions): string {
  const nodeStr = nodes.map((n) => n.id).sort().join(',');
  const edgeStr = edges.map((e) => `${e.source}>${e.target}`).sort().join(',');
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

  return {
    id: node.id,
    width: children.length === 0 ? width : undefined,
    height: children.length === 0 ? height : undefined,
    children: children.map((child) => buildElkNode(child, childrenByParent)),
    layoutOptions: {
      'elk.padding': '[top=40,left=20,bottom=20,right=20]',
    },
  };
}

function inferSemanticLayerRank(node: FlowNode): number | null {
  const label = String(node.data?.label ?? '').toLowerCase();
  const subLabel = String(node.data?.subLabel ?? '').toLowerCase();
  const type = String(node.type ?? '').toLowerCase();
  const haystack = `${label} ${subLabel} ${type}`;

  if (haystack.includes('edge') || haystack.includes('gateway') || haystack.includes('cdn')) {
    return SEMANTIC_LAYER_ORDER.indexOf('edge');
  }
  if (
    haystack.includes('frontend') ||
    haystack.includes('browser') ||
    haystack.includes('web') ||
    haystack.includes('mobile')
  ) {
    return SEMANTIC_LAYER_ORDER.indexOf('frontend');
  }
  if (haystack.includes('api')) {
    return SEMANTIC_LAYER_ORDER.indexOf('api');
  }
  if (
    haystack.includes('service') ||
    haystack.includes('compute') ||
    haystack.includes('worker') ||
    haystack.includes('backend')
  ) {
    return SEMANTIC_LAYER_ORDER.indexOf('services');
  }
  if (
    haystack.includes('data') ||
    haystack.includes('database') ||
    haystack.includes('cache') ||
    haystack.includes('storage')
  ) {
    return SEMANTIC_LAYER_ORDER.indexOf('data');
  }
  if (
    haystack.includes('external') ||
    haystack.includes('third-party') ||
    haystack.includes('third party')
  ) {
    return SEMANTIC_LAYER_ORDER.indexOf('external');
  }

  return null;
}

function isArchitectureLikeNode(node: FlowNode): boolean {
  if (node.type === 'architecture') {
    return true;
  }

  return inferSemanticLayerRank(node) !== null || ['browser', 'mobile', 'section', 'group'].includes(String(node.type));
}

function resolveEffectiveDiagramType(nodes: FlowNode[], diagramType?: string): string | undefined {
  if (diagramType) {
    return diagramType;
  }

  return nodes.some(isArchitectureLikeNode) ? 'architecture' : undefined;
}

function sortTopLevelNodesForArchitecture(topLevelNodes: FlowNode[]): FlowNode[] {
  return [...topLevelNodes].sort((left, right) => {
    const leftRank = inferSemanticLayerRank(left);
    const rightRank = inferSemanticLayerRank(right);

    if (leftRank === null && rightRank === null) {
      return 0;
    }
    if (leftRank === null) {
      return 1;
    }
    if (rightRank === null) {
      return -1;
    }
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
  const cacheKey = getLayoutCacheKey(nodes, edges, options);
  const cached = layoutCache.get(cacheKey);
  if (cached) return cached;

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
  const { layoutOptions } = buildResolvedLayoutConfiguration({
    ...options,
    diagramType: effectiveDiagramType,
  });
  const { topLevelNodes, childrenByParent, sortedEdges } = normalizeLayoutInputsForDeterminism(
    nodes,
    edges
  );
  const orderedTopLevelNodes =
    effectiveDiagramType === 'architecture' || effectiveDiagramType === 'infrastructure'
      ? sortTopLevelNodesForArchitecture(topLevelNodes)
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

    const laidOutNodes = nodes.map((node) => {
      const position = positionMap.get(node.id);
      if (!position) return node;

      const style = { ...node.style };
      if (node.type === 'group' || node.type === 'section' || node.type === 'container') {
        if (position.width) style.width = position.width;
        if (position.height) style.height = position.height;
      }

      return {
        ...node,
        position: { x: position.x, y: position.y },
        style,
      };
    });
    const reroutedEdges = resolveLayoutedEdgeHandles(laidOutNodes, sortedEdges);
    const sparse = isSparseDiagram(nodes.length, sortedEdges.length);
    const useLightweightPostProcessing = shouldUseLightweightLayoutPostProcessing(
      nodes.length,
      sortedEdges.length,
      effectiveDiagramType
    );

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
