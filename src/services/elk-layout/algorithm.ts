import type { FlowEdge, FlowNode } from '@/lib/types';
import type { LayoutOptions } from './types';

const LARGE_DIAGRAM_NODE_THRESHOLD = 48;
const LARGE_DIAGRAM_EDGE_THRESHOLD = 72;

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
