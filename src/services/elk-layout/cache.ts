import type { FlowEdge, FlowNode } from '@/lib/types';
import type { LayoutOptions } from './types';

interface CacheEntry {
  nodes: FlowNode[];
  edges: FlowEdge[];
  timestamp: number;
}

const layoutCache = new Map<string, CacheEntry>();
const LAYOUT_CACHE_MAX = 20;
const LAYOUT_CACHE_TTL_MS = 60_000;

export function getLayoutCacheKey(
  nodes: FlowNode[],
  edges: FlowEdge[],
  options: LayoutOptions
): string {
  const nodeStr = nodes
    .map((node) => node.id)
    .sort()
    .join(',');
  const edgeStr = edges
    .map((edge) => `${edge.source}>${edge.target}`)
    .sort()
    .join(',');
  return `${nodeStr}|${edgeStr}|${options.direction ?? 'TB'}:${options.algorithm ?? 'layered'}:${options.spacing ?? 'normal'}:${options.diagramType ?? ''}`;
}

export function clearLayoutCache(): void {
  layoutCache.clear();
}

export function getCachedLayout(
  cacheKey: string
): { nodes: FlowNode[]; edges: FlowEdge[] } | null {
  const entry = layoutCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > LAYOUT_CACHE_TTL_MS) {
    layoutCache.delete(cacheKey);
    return null;
  }
  return { nodes: entry.nodes, edges: entry.edges };
}

export function setCachedLayout(cacheKey: string, nodes: FlowNode[], edges: FlowEdge[]): void {
  if (layoutCache.size >= LAYOUT_CACHE_MAX) {
    const firstKey = layoutCache.keys().next().value;
    if (firstKey !== undefined) layoutCache.delete(firstKey);
  }
  layoutCache.set(cacheKey, { nodes, edges, timestamp: Date.now() });
}
