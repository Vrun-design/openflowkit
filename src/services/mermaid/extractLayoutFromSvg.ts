import type { FlowNode } from '@/lib/types';
import {
  getMermaidImportCandidateIds,
  isMermaidImportPointInsideBounds,
  mermaidImportSetsAreEqual,
  normalizeMermaidImportIdentifier,
} from './importGeometryUtils';
import { ensureMermaidMeasurementSupport } from './ensureMermaidMeasurementSupport';
import {
  normalizeRawGeometry,
  parseSvgPathPoints,
  type RawExtractedMermaidGeometry,
  type RawSvgEdgeLayout,
  type RawSvgNodeLayout,
} from './svgPathGeometry';

export { parseSvgPathPoints } from './svgPathGeometry';
export type { RawExtractedMermaidGeometry } from './svgPathGeometry';

/**
 * Extracts layout positions from a Mermaid.js SVG render.
 *
 * Mermaid renders the diagram into SVG first, with concrete node bounds and edge
 * paths. We use that SVG as the source of truth for import fidelity whenever we
 * can reconcile the rendered elements back to our parsed nodes reliably.
 *
 * We use Dagre (Mermaid's default) for the hidden render. ELK requires getBBox()
 * during its text measurement phase, which crashes inside Mermaid's internal code
 * even with a live DOM container. Dagre skips text measurement and renders reliably.
 * The extraction selectors handle both Dagre and ELK SVG output structures.
 */

export interface ExtractedNodeLayout {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rawId?: string;
  label?: string;
}

export interface ExtractedEdgeLayout {
  source: string;
  target: string;
  points: { x: number; y: number }[];
  path: string;
}

export interface ExtractedMermaidLayout {
  nodes: ExtractedNodeLayout[];
  clusters: ExtractedNodeLayout[];
  edges: ExtractedEdgeLayout[];
  matchedLeafNodeCount: number;
  totalLeafNodeCount: number;
  matchedSectionCount: number;
  totalSectionCount: number;
  reason?: string;
}

interface MermaidRenderRuntime {
  initialize: (config: {
    startOnLoad: boolean;
    securityLevel: 'loose';
    suppressErrorRendering: boolean;
    theme: string;
    htmlLabels?: boolean;
    flowchart?: {
      defaultRenderer?: 'dagre-d3' | 'dagre-wrapper' | 'elk';
      htmlLabels?: boolean;
      useMaxWidth?: boolean;
    };
  }) => void;
  render: (id: string, text: string, svgContainingElement?: Element) => Promise<{ svg: string }>;
}

let renderRuntimePromise: Promise<MermaidRenderRuntime | null> | null = null;
let renderCounter = 0;

const MERMAID_IMPORT_RENDER_CONFIG = {
  startOnLoad: false,
  securityLevel: 'loose' as const,
  suppressErrorRendering: true,
  theme: 'default',
  htmlLabels: false,
  flowchart: {
    defaultRenderer: 'dagre-wrapper' as const,
    htmlLabels: false,
    useMaxWidth: false,
  },
};

function canExtractLayout(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

async function getMermaidRenderRuntime(): Promise<MermaidRenderRuntime | null> {
  if (!canExtractLayout()) return null;

  if (!renderRuntimePromise) {
    renderRuntimePromise = import('mermaid')
      .then((module) => {
        return module.default as MermaidRenderRuntime;
      })
      .catch(() => null);
  }

  const runtime = await renderRuntimePromise;
  if (runtime) {
    runtime.initialize(MERMAID_IMPORT_RENDER_CONFIG);
  }

  return runtime;
}

function parseTranslate(transform: string | null): { x: number; y: number } | null {
  if (!transform) return null;
  const match = transform.match(/translate\(\s*([+-]?\d*\.?\d+)\s*(?:,\s*([+-]?\d*\.?\d+))?\s*\)/);
  if (!match) return null;
  return {
    x: parseFloat(match[1]),
    y: typeof match[2] === 'string' ? parseFloat(match[2]) : 0,
  };
}

function getAbsoluteTranslation(el: Element): { x: number; y: number } {
  let x = 0;
  let y = 0;
  let current: Element | null = el;

  while (current && current.tagName !== 'svg') {
    const translated = parseTranslate(current.getAttribute('transform'));
    if (translated) {
      x += translated.x;
      y += translated.y;
    }
    current = current.parentElement;
  }

  return { x, y };
}

function getElementText(group: Element): string | undefined {
  const textContent = [
    ...group.querySelectorAll('text, foreignObject span, foreignObject div, foreignObject p'),
  ]
    .map((el) => el.textContent?.trim() ?? '')
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return textContent || undefined;
}

/**
 * Gets bounds for an SVG group element using shape attribute parsing and accumulated transforms.
 *
 * We intentionally skip getBBox() here: our ensureMermaidMeasurementSupport shim patches
 * getBBox() on SVG prototypes to return text-estimated dimensions in element-local space
 * (x=0, y=0 with width/height derived from text content). Using those values for layout
 * extraction would place every node at the origin, corrupting edge-endpoint reconciliation.
 * The shape-attribute + transform-accumulation approach correctly produces SVG root-space
 * coordinates and is reliable across both browser and jsdom environments.
 */
function buildBoundsFromElement(group: Element): Omit<RawSvgNodeLayout, 'rawId' | 'label'> | null {
  // Parse shape attributes + accumulated transforms.
  const translation = getAbsoluteTranslation(group);
  const shapeEl =
    group.querySelector('rect') ??
    group.querySelector('circle') ??
    group.querySelector('ellipse') ??
    group.querySelector('polygon') ??
    group.querySelector('path');

  if (!shapeEl) return null;

  let width = 0;
  let height = 0;
  let x = translation.x;
  let y = translation.y;
  const tagName = shapeEl.tagName.toLowerCase();

  if (tagName === 'rect') {
    width = parseFloat(shapeEl.getAttribute('width') ?? '0');
    height = parseFloat(shapeEl.getAttribute('height') ?? '0');
    x = translation.x + parseFloat(shapeEl.getAttribute('x') ?? '0');
    y = translation.y + parseFloat(shapeEl.getAttribute('y') ?? '0');
  } else if (tagName === 'circle') {
    const r = parseFloat(shapeEl.getAttribute('r') ?? '0');
    width = r * 2;
    height = r * 2;
    x = translation.x - r;
    y = translation.y - r;
  } else if (tagName === 'ellipse') {
    const rx = parseFloat(shapeEl.getAttribute('rx') ?? '0');
    const ry = parseFloat(shapeEl.getAttribute('ry') ?? '0');
    width = rx * 2;
    height = ry * 2;
    x = translation.x - rx;
    y = translation.y - ry;
  } else {
    // Unsupported shape type (polygon, path) — cannot determine bounds from attributes alone.
    return null;
  }

  return { x, y, width, height };
}

/**
 * Extracts raw node positions from a Mermaid SVG.
 *
 * Mermaid v11 uses two different rendering pipelines:
 * - Dagre path: nodes are <g class="node ..."> with id="flowchart-ID-N"
 * - ELK path:   nodes are <g data-id="ID" class="..."> (no "node" in class)
 *
 * We query both selectors and prefer data-id when present (it is the raw node ID,
 * needing no transformation to match our parsed node IDs).
 */
function extractRawNodesFromSvg(svgRoot: ParentNode): RawSvgNodeLayout[] {
  const results: RawSvgNodeLayout[] = [];
  const seen = new Set<Element>();

  // g.node → Dagre pipeline. g[data-id] → ELK pipeline.
  // Exclude cluster containers (subgraphs) from node list.
  for (const group of svgRoot.querySelectorAll('g.node, g[data-id]')) {
    if (seen.has(group)) continue;
    seen.add(group);

    if (group.classList.contains('cluster')) continue;

    const bounds = buildBoundsFromElement(group);
    if (!bounds) continue;

    // data-id holds the raw Mermaid node ID in the ELK pipeline — use it directly.
    // Fall back to the element id attribute (Dagre pipeline).
    const dataId = group.getAttribute('data-id');
    const rawId = (dataId || group.id) || undefined;

    results.push({ rawId, label: getElementText(group), ...bounds });
  }

  return results;
}

/**
 * Extracts subgraph (cluster) bounds from a Mermaid SVG.
 * Clusters use class="cluster ..." in both Dagre and ELK pipelines.
 */
function extractRawClustersFromSvg(svgRoot: ParentNode): RawSvgNodeLayout[] {
  const results: RawSvgNodeLayout[] = [];

  for (const group of svgRoot.querySelectorAll('g.cluster')) {
    const bounds = buildBoundsFromElement(group);
    if (!bounds) continue;

    const dataId = group.getAttribute('data-id');
    const rawId = (dataId || group.id) || undefined;

    results.push({ rawId, label: getElementText(group), ...bounds });
  }

  return results;
}

function buildCandidateLookup(
  nodes: FlowNode[],
  options: { allowLabelMatching: boolean }
): Map<string, string[]> {
  const lookup = new Map<string, string[]>();

  for (const node of nodes) {
    const candidates = new Set<string>();
    candidates.add(node.id);

    const normalizedId = normalizeMermaidImportIdentifier(node.id);
    if (normalizedId) candidates.add(normalizedId);

    if (options.allowLabelMatching) {
      const label = normalizeMermaidImportIdentifier(String(node.data?.label ?? ''));
      if (label) candidates.add(label);
    }

    for (const candidate of candidates) {
      const existing = lookup.get(candidate) ?? [];
      existing.push(node.id);
      lookup.set(candidate, existing);
    }
  }

  return lookup;
}

function resolveNodeId(
  raw: RawSvgNodeLayout,
  lookup: Map<string, string[]>,
  usedIds: Set<string>,
  options: { allowLabelFallback: boolean }
): string | null {
  const candidates = new Set<string>();

  for (const rawCandidate of getMermaidImportCandidateIds(raw.rawId)) {
    candidates.add(rawCandidate);
    const normalized = normalizeMermaidImportIdentifier(rawCandidate);
    if (normalized) candidates.add(normalized);
  }

  if (options.allowLabelFallback) {
    const normalizedLabel = normalizeMermaidImportIdentifier(raw.label);
    if (normalizedLabel) candidates.add(normalizedLabel);
  }

  for (const candidate of candidates) {
    const matches = (lookup.get(candidate) ?? []).filter((id) => !usedIds.has(id));
    if (matches.length === 1) {
      usedIds.add(matches[0]);
      return matches[0];
    }
  }

  return null;
}

function reconcileRawNodes(
  rawNodes: RawSvgNodeLayout[],
  nodes: FlowNode[]
): { resolved: ExtractedNodeLayout[]; matchedCount: number; totalCount: number } {
  const leafNodes = nodes.filter((node) => node.type !== 'section');
  const lookup = buildCandidateLookup(leafNodes, { allowLabelMatching: false });
  const usedIds = new Set<string>();
  const resolved: ExtractedNodeLayout[] = [];

  for (const rawNode of rawNodes) {
    const resolvedId = resolveNodeId(rawNode, lookup, usedIds, { allowLabelFallback: false });
    if (!resolvedId) continue;

    resolved.push({
      id: resolvedId,
      rawId: rawNode.rawId,
      label: rawNode.label,
      x: rawNode.x,
      y: rawNode.y,
      width: rawNode.width,
      height: rawNode.height,
    });
  }

  return { resolved, matchedCount: resolved.length, totalCount: leafNodes.length };
}

// --- Spatial containment helpers for cluster reconciliation ---

function getSectionDescendantLeafIds(nodes: FlowNode[]): Map<string, Set<string>> {
  const childrenByParent = new Map<string, FlowNode[]>();
  for (const node of nodes) {
    if (!node.parentId) continue;
    const bucket = childrenByParent.get(node.parentId) ?? [];
    bucket.push(node);
    childrenByParent.set(node.parentId, bucket);
  }

  const cache = new Map<string, Set<string>>();

  function collect(sectionId: string): Set<string> {
    const cached = cache.get(sectionId);
    if (cached) return cached;

    const leafIds = new Set<string>();
    for (const child of childrenByParent.get(sectionId) ?? []) {
      if (child.type === 'section') {
        for (const id of collect(child.id)) leafIds.add(id);
      } else {
        leafIds.add(child.id);
      }
    }

    cache.set(sectionId, leafIds);
    return leafIds;
  }

  for (const node of nodes) {
    if (node.type === 'section') collect(node.id);
  }

  return cache;
}

function reconcileRawClusters(
  rawClusters: RawSvgNodeLayout[],
  nodes: FlowNode[],
  resolvedLeaves: ExtractedNodeLayout[]
): { resolved: ExtractedNodeLayout[]; matchedCount: number; totalCount: number } {
  const sectionNodes = nodes.filter((node) => node.type === 'section');
  const lookup = buildCandidateLookup(sectionNodes, { allowLabelMatching: true });
  const usedIds = new Set<string>();
  const resolvedById = new Map<string, ExtractedNodeLayout>();
  const usedClusterIndexes = new Set<number>();

  // Strategy 1 & 2: ID matching + label matching (existing logic)
  for (const [clusterIndex, rawCluster] of rawClusters.entries()) {
    const resolvedId = resolveNodeId(rawCluster, lookup, usedIds, { allowLabelFallback: true });
    if (!resolvedId) continue;

    resolvedById.set(resolvedId, {
      id: resolvedId,
      rawId: rawCluster.rawId,
      label: rawCluster.label,
      x: rawCluster.x,
      y: rawCluster.y,
      width: rawCluster.width,
      height: rawCluster.height,
    });
    usedClusterIndexes.add(clusterIndex);
  }

  // Strategy 3: Spatial containment — for sections still unmatched (e.g. Mermaid uses
  // numeric IDs like subGraph0 that don't correlate to any section name).
  // Find the cluster whose set of contained resolved leaf nodes exactly matches
  // the set of descendant leaf IDs for a given section.
  const unresolvedSections = sectionNodes.filter((node) => !resolvedById.has(node.id));
  if (unresolvedSections.length > 0 && resolvedLeaves.length > 0) {
    const descendantLeafIds = getSectionDescendantLeafIds(nodes);

    // Pre-compute which resolved leaf nodes fall inside each raw cluster.
    const rawClusterLeafIds = rawClusters.map((rawCluster) => {
      const leafIds = new Set<string>();
      for (const leaf of resolvedLeaves) {
        const center = { x: leaf.x + leaf.width / 2, y: leaf.y + leaf.height / 2 };
        if (isMermaidImportPointInsideBounds(center, rawCluster)) leafIds.add(leaf.id);
      }
      return leafIds;
    });

    for (const section of unresolvedSections) {
      const expectedLeafIds = descendantLeafIds.get(section.id);
      if (!expectedLeafIds || expectedLeafIds.size === 0) continue;

      // Find a cluster whose contained leaves exactly match this section's descendants.
      const matches = rawClusterLeafIds
        .map((leafIds, clusterIndex) => ({ clusterIndex, leafIds }))
        .filter(({ clusterIndex, leafIds }) =>
          !usedClusterIndexes.has(clusterIndex)
          && mermaidImportSetsAreEqual(leafIds, expectedLeafIds)
        );

      if (matches.length !== 1) continue;

      const rawCluster = rawClusters[matches[0].clusterIndex];
      resolvedById.set(section.id, {
        id: section.id,
        rawId: rawCluster.rawId,
        label: rawCluster.label,
        x: rawCluster.x,
        y: rawCluster.y,
        width: rawCluster.width,
        height: rawCluster.height,
      });
      usedClusterIndexes.add(matches[0].clusterIndex);
    }
  }

  return {
    resolved: sectionNodes
      .map((node) => resolvedById.get(node.id))
      .filter((node): node is ExtractedNodeLayout => Boolean(node)),
    matchedCount: resolvedById.size,
    totalCount: sectionNodes.length,
  };
}

/**
 * Extracts edge paths from a Mermaid SVG.
 *
 * Dagre pipeline: edges are <g class="edgePath"> containing <path class="path">
 * ELK pipeline:  edges are <path class="flowchart-link ..."> (direct path elements)
 */
function extractRawEdgesFromSvg(svgRoot: ParentNode): RawSvgEdgeLayout[] {
  const results: RawSvgEdgeLayout[] = [];
  const seen = new Set<Element>();

  const selector = [
    'g.edgePath path.path',
    'g.edge path.path',
    'g.edgePath path',
    'g.edge path',
    'path.flowchart-link',  // ELK pipeline
  ].join(', ');

  for (const pathEl of svgRoot.querySelectorAll(selector)) {
    if (seen.has(pathEl)) continue;
    seen.add(pathEl);

    const d = pathEl.getAttribute('d');
    if (!d) continue;

    const points = parseSvgPathPoints(d);
    if (points.length < 2) continue;

    results.push({
      rawId: pathEl.getAttribute('data-id') ?? pathEl.id ?? undefined,
      path: d,
      points,
    });
  }

  return results;
}

function getNodeCenter(node: ExtractedNodeLayout): { x: number; y: number } {
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}

function getDistanceToNodeBounds(
  point: { x: number; y: number },
  node: ExtractedNodeLayout
): number {
  const clampedX = Math.min(Math.max(point.x, node.x), node.x + node.width);
  const clampedY = Math.min(Math.max(point.y, node.y), node.y + node.height);
  const outside = Math.hypot(point.x - clampedX, point.y - clampedY);

  if (outside > 0) return outside;

  return Math.min(
    Math.abs(point.x - node.x),
    Math.abs(node.x + node.width - point.x),
    Math.abs(point.y - node.y),
    Math.abs(node.y + node.height - point.y)
  );
}

function nearestNodeId(
  point: { x: number; y: number },
  nodes: ExtractedNodeLayout[]
): string | null {
  // Maximum distance (px) we'll tolerate between a path endpoint and a node boundary.
  // If no node is within this radius the path likely belongs to a different coordinate space
  // and we skip the match rather than creating a garbage edge connection.
  const MAX_EDGE_SNAP_DISTANCE = 300;

  // If the point is inside any node, prefer the smallest containing node.
  const containing = nodes.filter((n) =>
    point.x >= n.x && point.x <= n.x + n.width &&
    point.y >= n.y && point.y <= n.y + n.height
  );
  if (containing.length > 0) {
    return containing
      .slice()
      .sort((a, b) => a.width * a.height - b.width * b.height)[0].id;
  }

  let bestId: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestCenterDistance = Number.POSITIVE_INFINITY;

  for (const node of nodes) {
    const distance = getDistanceToNodeBounds(point, node);
    const center = getNodeCenter(node);
    const centerDistance = Math.hypot(center.x - point.x, center.y - point.y);

    if (distance < bestDistance || (distance === bestDistance && centerDistance < bestCenterDistance)) {
      bestDistance = distance;
      bestCenterDistance = centerDistance;
      bestId = node.id;
    }
  }

  // Guard: reject matches that are too far away — they indicate a coordinate-space mismatch.
  if (bestDistance > MAX_EDGE_SNAP_DISTANCE) {
    return null;
  }

  return bestId;
}

function reconcileEdges(
  rawEdges: RawSvgEdgeLayout[],
  resolvedNodes: ExtractedNodeLayout[],
  resolvedClusters: ExtractedNodeLayout[]
): ExtractedEdgeLayout[] {
  const routingTargets = [...resolvedNodes, ...resolvedClusters];

  return rawEdges.flatMap((rawEdge) => {
    const source = nearestNodeId(rawEdge.points[0], routingTargets);
    const target = nearestNodeId(rawEdge.points[rawEdge.points.length - 1], routingTargets);
    if (!source || !target) return [];

    return [{ source, target, points: rawEdge.points, path: rawEdge.path }];
  });
}

export async function extractMermaidLayout(
  diagramText: string,
  nodes: FlowNode[]
): Promise<ExtractedMermaidLayout | null> {
  if (!canExtractLayout()) {
    throw new Error('Mermaid SVG extraction requires a browser DOM runtime.');
  }

  ensureMermaidMeasurementSupport();
  const mermaid = await getMermaidRenderRuntime();
  if (!mermaid) {
    throw new Error('Mermaid runtime failed to load for SVG extraction.');
  }

  const containerId = `mermaid-extract-${++renderCounter}`;
  const container = document.createElement('div');
  container.id = containerId;
  // Must be in the live DOM for getBBox() to return real coordinates when we
  // fall back to shape-attribute parsing. opacity:0 keeps it invisible but rendered.
  container.style.cssText = 'position:absolute;top:-9999px;left:-9999px;opacity:0;pointer-events:none;';
  document.body.appendChild(container);

  try {
    const { svg } = await mermaid.render(containerId, diagramText, container);
    if (!svg) {
      throw new Error('Mermaid render returned empty SVG output.');
    }

    container.innerHTML = svg;
    const svgRoot = container.querySelector('svg');
    if (!svgRoot) {
      throw new Error('Rendered Mermaid SVG was not attached to the extraction container.');
    }

    const normalized = normalizeRawGeometry(
      extractRawNodesFromSvg(svgRoot),
      extractRawClustersFromSvg(svgRoot),
      extractRawEdgesFromSvg(svgRoot)
    );

    const leafResolution = reconcileRawNodes(normalized.nodes, nodes);
    const clusterResolution = reconcileRawClusters(
      normalized.clusters,
      nodes,
      leafResolution.resolved
    );

    if (leafResolution.matchedCount === 0) {
      return null;
    }

    const edges = reconcileEdges(
      normalized.edges,
      leafResolution.resolved,
      clusterResolution.resolved
    );

    const issues: string[] = [];
    if (leafResolution.matchedCount < leafResolution.totalCount) {
      issues.push(`matched ${leafResolution.matchedCount}/${leafResolution.totalCount} leaf nodes`);
    }
    if (clusterResolution.totalCount > 0 && clusterResolution.matchedCount < clusterResolution.totalCount) {
      issues.push(`matched ${clusterResolution.matchedCount}/${clusterResolution.totalCount} sections`);
    }
    if (edges.length === 0) {
      issues.push('could not reconcile Mermaid edge geometry');
    }

    return {
      nodes: leafResolution.resolved,
      clusters: clusterResolution.resolved,
      edges,
      matchedLeafNodeCount: leafResolution.matchedCount,
      totalLeafNodeCount: leafResolution.totalCount,
      matchedSectionCount: clusterResolution.matchedCount,
      totalSectionCount: clusterResolution.totalCount,
      reason: issues.length > 0 ? issues.join('; ') : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Mermaid render/extraction failed: ${message}`);
  } finally {
    container.remove();
  }
}

export async function extractRawMermaidGeometry(
  diagramText: string
): Promise<RawExtractedMermaidGeometry> {
  if (!canExtractLayout()) {
    throw new Error('Mermaid SVG extraction requires a browser DOM runtime.');
  }

  ensureMermaidMeasurementSupport();
  const mermaid = await getMermaidRenderRuntime();
  if (!mermaid) {
    throw new Error('Mermaid runtime failed to load for SVG extraction.');
  }

  const containerId = `mermaid-extract-${++renderCounter}`;
  const container = document.createElement('div');
  container.id = containerId;
  container.style.cssText = 'position:absolute;top:-9999px;left:-9999px;opacity:0;pointer-events:none;';
  document.body.appendChild(container);

  try {
    const { svg } = await mermaid.render(containerId, diagramText, container);
    if (!svg) {
      throw new Error('Mermaid render returned empty SVG output.');
    }

    container.innerHTML = svg;
    const svgRoot = container.querySelector('svg');
    if (!svgRoot) {
      throw new Error('Rendered Mermaid SVG was not attached to the extraction container.');
    }

    return normalizeRawGeometry(
      extractRawNodesFromSvg(svgRoot),
      extractRawClustersFromSvg(svgRoot),
      extractRawEdgesFromSvg(svgRoot)
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Mermaid render/extraction failed: ${message}`);
  } finally {
    container.remove();
  }
}
