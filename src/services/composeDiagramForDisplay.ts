import type { DiagramType, FlowEdge, FlowNode } from '@/lib/types';
import { autoFitSectionsToChildren } from '@/lib/sectionBounds';
import { clearStoredRouteData } from '@/lib/edgeRouteData';
import type { LayoutAlgorithm, LayoutOptions } from '@/services/elkLayout';
import { relayoutMindmapComponent, syncMindmapEdges } from '@/lib/mindmapLayout';
import { relayoutSequenceDiagram } from '@/services/sequenceLayout';
import type { ExtractedMermaidLayout } from '@/services/mermaid/extractLayoutFromSvg';
import { estimateWrappedTextBox } from '@/services/elk-layout/textSizing';

const IMPORT_LEAF_MAX_WIDTH = 200;
const IMPORT_LEAF_MIN_WIDTH = 120;

interface ComposeDiagramForDisplayOptions
  extends Pick<LayoutOptions, 'spacing' | 'source' | 'contentDensity'> {
  direction?: LayoutOptions['direction'];
  algorithm?: LayoutAlgorithm;
  diagramType?: DiagramType | string;
  mermaidSource?: string;
}

function isMindmapDisplayTarget(nodes: FlowNode[], diagramType?: string): boolean {
  if (diagramType === 'mindmap') {
    return nodes.some((node) => node.type === 'mindmap');
  }

  const visibleNodes = nodes.filter((node) => !node.hidden);
  return visibleNodes.length > 0 && visibleNodes.every((node) => node.type === 'mindmap');
}

function relayoutAllMindmapComponents(
  nodes: FlowNode[],
  edges: FlowEdge[]
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const mindmapRootIds = nodes
    .filter((node) => node.type === 'mindmap' && typeof node.data.mindmapParentId !== 'string')
    .map((node) => node.id);

  const fallbackRootIds =
    mindmapRootIds.length > 0
      ? mindmapRootIds
      : nodes.filter((node) => node.type === 'mindmap').map((node) => node.id);

  const layoutedNodes = fallbackRootIds.reduce(
    (currentNodes, rootId) => relayoutMindmapComponent(currentNodes, edges, rootId),
    nodes
  );

  return {
    nodes: layoutedNodes,
    edges: syncMindmapEdges(layoutedNodes, edges),
  };
}

export function sortParentsBeforeChildren(nodes: FlowNode[]): FlowNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const depth = new Map<string, number>();

  function getDepth(id: string): number {
    if (depth.has(id)) return depth.get(id)!;
    const node = byId.get(id);
    const parentId = node?.parentId;
    const d = parentId ? getDepth(parentId) + 1 : 0;
    depth.set(id, d);
    return d;
  }

  nodes.forEach((n) => getDepth(n.id));
  return [...nodes].sort((a, b) => getDepth(a.id) - getDepth(b.id));
}

function applyExtractedLayout(
  nodes: FlowNode[],
  edges: FlowEdge[],
  extracted: ExtractedMermaidLayout
): {
  nodes: FlowNode[];
  edges: FlowEdge[];
  matchedEdgeCount: number;
} {
  const extractedById = new Map(extracted.nodes.map((n) => [n.id, n]));
  const clusterById = new Map(extracted.clusters.map((c) => [c.id, c]));
  const absoluteNodePositionById = new Map(
    extracted.nodes.map((node) => [node.id, { x: node.x, y: node.y }])
  );

  const layoutedNodes = nodes.map((node): FlowNode => {
    const ext = extractedById.get(node.id);

    if (!ext) {
      const cluster = clusterById.get(node.id);
      if (!cluster) return node;

      return {
        ...node,
        position: { x: cluster.x, y: cluster.y },
        data: {
          ...node.data,
          sectionSizingMode:
            cluster.width > 0 && cluster.height > 0
              ? 'manual'
              : node.data?.sectionSizingMode,
        },
        style:
          cluster.width > 0 && cluster.height > 0
            ? { ...node.style, width: cluster.width, height: cluster.height }
            : node.style,
      };
    }

    // Keep position from Mermaid's SVG extraction. Use text-based width estimation so
    // labels wrap vertically rather than expanding horizontally. Height is not set —
    // React Flow measures it from rendered content.
    const { width: estimatedWidth } = estimateWrappedTextBox(
      String(node.data?.label ?? ''),
      { minWidth: IMPORT_LEAF_MIN_WIDTH, maxWidth: IMPORT_LEAF_MAX_WIDTH }
    );
    return {
      ...node,
      position: { x: ext.x, y: ext.y },
      style: { ...node.style, width: estimatedWidth },
    };
  });
  // Build a comprehensive map of absolute positions for ALL nodes (leaves + sections/clusters).
  // We need this to correctly relativize child positions regardless of whether the parent
  // was matched as a cluster or as a leaf node in the SVG extraction.
  const absolutePositionByParentId = new Map<string, { x: number; y: number }>();
  for (const cluster of extracted.clusters) {
    absolutePositionByParentId.set(cluster.id, { x: cluster.x, y: cluster.y });
  }
  // Also include sections that appeared in the leaf extraction (some parsers put sections there).
  for (const node of extracted.nodes) {
    if (!absolutePositionByParentId.has(node.id)) {
      absolutePositionByParentId.set(node.id, { x: node.x, y: node.y });
    }
  }

  const layoutedNodesWithRelativeChildren = layoutedNodes.map((node): FlowNode => {
    if (!node.parentId) {
      return node;
    }

    const absolutePosition = absoluteNodePositionById.get(node.id);

    // Prefer cluster position, then any extracted position for the parent.
    const parentAbsolute =
      clusterById.get(node.parentId) ??
      (absolutePositionByParentId.has(node.parentId)
        ? { x: absolutePositionByParentId.get(node.parentId)!.x, y: absolutePositionByParentId.get(node.parentId)!.y, id: node.parentId, rawId: undefined, label: undefined, width: 0, height: 0 }
        : undefined);

    if (!absolutePosition || !parentAbsolute) {
      // Parent position is unknown — keep the node's current absolute position.
      // ELK / autoFitSectionsToChildren will reconcile it during the layout phase.
      return node;
    }

    // Parent absolute position is at (0, 0) with no size: this indicates the section was
    // not matched by cluster reconciliation and has no real extracted position. Keep child
    // at its own absolute position so it isn't visually collapsed to origin.
    if (parentAbsolute.x === 0 && parentAbsolute.y === 0 && parentAbsolute.width === 0) {
      return node;
    }

    return {
      ...node,
      position: {
        x: absolutePosition.x - parentAbsolute.x,
        y: absolutePosition.y - parentAbsolute.y,
      },
    };
  });

  const extractedEdgeBuckets = new Map<string, typeof extracted.edges>();
  for (const edge of extracted.edges) {
    const key = `${edge.source}::${edge.target}`;
    const bucket = extractedEdgeBuckets.get(key) ?? [];
    bucket.push(edge);
    extractedEdgeBuckets.set(key, bucket);
  }

  let matchedEdgeCount = 0;
  const layoutedEdges = edges.map((edge) => {
    const key = `${edge.source}::${edge.target}`;
    const matched = extractedEdgeBuckets.get(key)?.shift();
    if (!matched) {
      return {
        ...edge,
        data: clearStoredRouteData(edge),
      };
    }

    matchedEdgeCount += 1;
    return {
      ...edge,
      data: {
        ...edge.data,
        routingMode: 'import-fixed' as const,
        elkPoints: undefined,
        importRoutePoints: matched.points,
        importRoutePath: matched.path,
        waypoint: undefined,
        waypoints: undefined,
      },
    };
  });

  return {
    nodes: layoutedNodesWithRelativeChildren,
    edges: layoutedEdges,
    matchedEdgeCount,
  };
}

export interface LayoutResult {
  nodes: FlowNode[];
  edges: FlowEdge[];
  svgExtracted?: boolean;
  layoutMode?: 'mermaid_exact' | 'mermaid_preserved_partial' | 'mermaid_partial' | 'elk_fallback';
  layoutFallbackReason?: string;
}

function hasExactMermaidNodeAndSectionMatch(counts: {
  matchedLeafNodeCount: number;
  totalLeafNodeCount: number;
  matchedSectionCount: number;
  totalSectionCount: number;
}): boolean {
  return (
    counts.matchedLeafNodeCount === counts.totalLeafNodeCount
    && counts.matchedSectionCount === counts.totalSectionCount
  );
}

function hasExactMermaidEdgeMatch(counts: {
  matchedEdgeGeometryCount: number;
  totalEdgeCount: number;
}): boolean {
  return counts.matchedEdgeGeometryCount === counts.totalEdgeCount;
}

async function getImportFallback(
  nodes: FlowNode[],
  edges: FlowEdge[],
  options: ComposeDiagramForDisplayOptions,
  layoutMode: LayoutResult['layoutMode'],
  layoutFallbackReason?: string
): Promise<LayoutResult> {
  const { getElkLayout } = await import('@/services/elkLayout');
  const layouted = await getElkLayout(nodes, edges, {
    direction: options.direction ?? 'TB',
    algorithm: options.algorithm,
    spacing: options.spacing ?? 'normal',
    contentDensity: options.contentDensity,
    diagramType: options.diagramType,
    source: options.source,
  });

  return {
    nodes: autoFitSectionsToChildren(layouted.nodes),
    edges: layouted.edges,
    layoutMode,
    layoutFallbackReason,
  };
}

/**
 * Repositions any leaf nodes that are at {x:0, y:0} (unmatched by SVG extraction)
 * to a horizontal row below the rest of the diagram, preventing them from stacking
 * at the canvas origin. Section nodes at {0,0} are intentionally left in place —
 * their children carry correct absolute positions regardless.
 */
function spreadUnpositionedLeafNodes(nodes: FlowNode[]): FlowNode[] {
  const UNPOSITIONED_GAP = 32;
  const UNPOSITIONED_NODE_WIDTH = IMPORT_LEAF_MAX_WIDTH;
  const UNPOSITIONED_NODE_HEIGHT = 48;

  // Nodes that are genuinely positioned: non-zero position, or have a parent
  // (child positions are relative so {0,0} within a parent is valid).
  const positioned = nodes.filter(
    (n) => n.type === 'section' || n.parentId || n.position.x !== 0 || n.position.y !== 0
  );
  const unpositioned = nodes.filter(
    (n) => n.type !== 'section' && !n.parentId && n.position.x === 0 && n.position.y === 0
  );

  if (unpositioned.length === 0) return nodes;

  // Find the bottom edge of all positioned leaf nodes so we can place below.
  let maxBottom = 0;
  for (const n of positioned) {
    if (n.type === 'section') continue;
    const h = (n.style?.height as number | undefined) ?? UNPOSITIONED_NODE_HEIGHT;
    maxBottom = Math.max(maxBottom, n.position.y + h);
  }

  const startY = maxBottom + UNPOSITIONED_GAP * 3;
  let cursorX = 0;

  const repositioned = unpositioned.map((n) => {
    const w = (n.style?.width as number | undefined) ?? UNPOSITIONED_NODE_WIDTH;
    const node = { ...n, position: { x: cursorX, y: startY } };
    cursorX += w + UNPOSITIONED_GAP;
    return node;
  });

  return [...positioned, ...repositioned];
}

/**
 * Extracts the flowchart direction from a Mermaid source string.
 * Returns a normalized direction key ('TB', 'LR', 'RL', 'BT') or undefined.
 */
function extractMermaidDirectionFromSource(source: string): LayoutOptions['direction'] | undefined {
  const match = source.match(/^\s*(?:flowchart|graph)\s+(LR|RL|TB|BT|TD)\b/im);
  if (!match) return undefined;
  const raw = match[1].toUpperCase();
  // TD is an alias for TB (top-down = top-bottom)
  return (raw === 'TD' ? 'TB' : raw) as LayoutOptions['direction'];
}

async function composeImportLayout(
  nodes: FlowNode[],
  edges: FlowEdge[],
  options: ComposeDiagramForDisplayOptions
): Promise<LayoutResult> {
  let extractionFailureReason: string | undefined;
  // When the official flowchart import has a partial node match we fall through to
  // extractMermaidLayout rather than immediately going to ELK.  Track the best
  // layoutMode to report so we use 'mermaid_partial' rather than 'elk_fallback'.
  let bestPartialLayoutMode: LayoutResult['layoutMode'] = 'elk_fallback';
  // When the official importer has leaf matches but section mismatches, both the official
  // graph AND the SVG extraction path will produce incorrect child positions for the same
  // structural reason. Skip SVG extraction and go straight to ELK in that case.
  const skipSvgExtraction = false;

  // Extract direction from the Mermaid source if the caller didn't provide one.
  // This ensures LR/RL/BT diagrams fall back to ELK with the correct orientation.
  const sourceDirection = options.mermaidSource
    ? extractMermaidDirectionFromSource(options.mermaidSource)
    : undefined;
  let effectiveOptions: ComposeDiagramForDisplayOptions = sourceDirection && !options.direction
    ? { ...options, direction: sourceDirection }
    : options;

  if (options.mermaidSource) {
    if (options.diagramType === 'flowchart') {
      try {
        const { buildOfficialFlowchartImportGraph } = await import(
          '@/services/mermaid/officialFlowchartImport'
        );
        const officialGraph = await buildOfficialFlowchartImportGraph(options.mermaidSource, nodes);
        if (officialGraph) {
          const exactNodeAndSectionMatch = hasExactMermaidNodeAndSectionMatch(officialGraph);
          const exactEdgeMatch = hasExactMermaidEdgeMatch(officialGraph);
          const hasMatchedLeafNodes = officialGraph.matchedLeafNodeCount > 0;

          if (exactNodeAndSectionMatch && exactEdgeMatch) {
            return {
              nodes: spreadUnpositionedLeafNodes(autoFitSectionsToChildren(officialGraph.nodes)),
              edges: officialGraph.edges,
              svgExtracted: true,
              layoutMode: 'mermaid_exact',
            };
          }

          if (exactNodeAndSectionMatch) {
            return {
              nodes: spreadUnpositionedLeafNodes(autoFitSectionsToChildren(officialGraph.nodes)),
              edges: officialGraph.edges,
              svgExtracted: true,
              layoutMode: exactEdgeMatch ? 'mermaid_exact' : 'mermaid_preserved_partial',
              layoutFallbackReason: exactEdgeMatch ? undefined : officialGraph.reason,
            };
          }

          if (hasMatchedLeafNodes) {
            // Leaf node positions are reliable from the SVG extraction even when section
            // boundaries are only partially matched. Unmatched sections default to {0,0}
            // but their children's absolute positions are preserved, so React Flow renders
            // them at the correct canvas location. Use the official graph directly.
            return {
              nodes: spreadUnpositionedLeafNodes(autoFitSectionsToChildren(officialGraph.nodes)),
              edges: officialGraph.edges,
              svgExtracted: true,
              layoutMode: 'mermaid_partial',
              layoutFallbackReason:
                officialGraph.reason
                ?? `matched ${officialGraph.matchedLeafNodeCount}/${officialGraph.totalLeafNodeCount} official flowchart nodes, ${officialGraph.matchedSectionCount}/${officialGraph.totalSectionCount} official flowchart sections, and ${officialGraph.matchedEdgeGeometryCount}/${officialGraph.totalEdgeCount} official flowchart edge routes`,
            };
          }

          // Promote direction from the official DB (more authoritative than regex).
          if (officialGraph.direction && !options.direction) {
            effectiveOptions = { ...effectiveOptions, direction: officialGraph.direction as LayoutOptions['direction'] };
          }

          extractionFailureReason =
            officialGraph.reason
            ?? `matched ${officialGraph.matchedLeafNodeCount}/${officialGraph.totalLeafNodeCount} official flowchart nodes`;
          bestPartialLayoutMode = 'mermaid_partial';
        }
      } catch (error) {
        extractionFailureReason = error instanceof Error ? error.message : String(error);
      }
    }

    if (!skipSvgExtraction) {
    try {
      const { extractMermaidLayout } = await import('@/services/mermaid/extractLayoutFromSvg');
      const extracted = await extractMermaidLayout(options.mermaidSource, nodes);
      if (extracted) {
        const result = applyExtractedLayout(nodes, edges, extracted);
        const exactNodeAndSectionMatch = hasExactMermaidNodeAndSectionMatch(extracted);
        const exactEdgeMatch = result.matchedEdgeCount === edges.length;

        if (exactNodeAndSectionMatch && exactEdgeMatch) {
          return {
            nodes: spreadUnpositionedLeafNodes(autoFitSectionsToChildren(result.nodes)),
            edges: result.edges,
            svgExtracted: true,
            layoutMode: 'mermaid_exact',
          };
        }

        if (exactNodeAndSectionMatch) {
          return {
            nodes: spreadUnpositionedLeafNodes(autoFitSectionsToChildren(result.nodes)),
            edges: result.edges,
            svgExtracted: true,
            layoutMode: exactEdgeMatch ? 'mermaid_exact' : 'mermaid_preserved_partial',
            layoutFallbackReason: exactEdgeMatch
              ? undefined
              : extracted.reason
                ?? `matched ${result.matchedEdgeCount}/${edges.length} edges while preserving Mermaid node geometry`,
          };
        }

        // We do NOT return for structurally partial node imports anymore.
        // If exactNodeAndSectionMatch is false, some nodes or sections are missing geometry.
        // Because default parsed positions are {x: 0, y: 0}, unmatched nodes will stack
        // at the origin. We must fall through to ELK to layout the entire diagram holistically.
        bestPartialLayoutMode = 'mermaid_partial';
        extractionFailureReason =
          extracted.reason
          ?? `matched ${extracted.matchedLeafNodeCount}/${extracted.totalLeafNodeCount} nodes and ${extracted.matchedSectionCount}/${extracted.totalSectionCount} sections`;
      }
    } catch (error) {
      extractionFailureReason = error instanceof Error ? error.message : String(error);
    }
    } // end if (!skipSvgExtraction)
  }

  return getImportFallback(
    nodes,
    edges,
    effectiveOptions,
    bestPartialLayoutMode,
    options.mermaidSource
      ? extractionFailureReason ?? 'Mermaid SVG extraction unavailable'
      : undefined
  );
}

export async function composeDiagramForDisplay(
  nodes: FlowNode[],
  edges: FlowEdge[],
  options: ComposeDiagramForDisplayOptions = {}
): Promise<LayoutResult> {
  if (nodes.length === 0) {
    return { nodes, edges };
  }

  if (isMindmapDisplayTarget(nodes, options.diagramType)) {
    return relayoutAllMindmapComponents(nodes, edges);
  }

  if (options.diagramType === 'sequence') {
    return {
      ...relayoutSequenceDiagram(nodes, edges),
      layoutMode: options.source === 'import' ? 'elk_fallback' : undefined,
      layoutFallbackReason:
        options.source === 'import'
          ? 'Sequence diagrams use the dedicated sequence layout engine'
          : undefined,
    };
  }

  if (options.source === 'import') {
    return composeImportLayout(nodes, edges, options);
  }

  const { getElkLayout } = await import('@/services/elkLayout');
  const layouted = await getElkLayout(nodes, edges, {
    direction: options.direction ?? 'TB',
    algorithm: options.algorithm,
    spacing: options.spacing ?? 'normal',
    contentDensity: options.contentDensity,
    diagramType: options.diagramType,
    source: options.source,
  });

  return {
    nodes: autoFitSectionsToChildren(layouted.nodes),
    edges: layouted.edges,
  };
}
