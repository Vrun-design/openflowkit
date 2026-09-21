import type { Point2d, Size2d } from '../opencanvas/domain/geometry/types';
import type { DslDirection } from './ast';

export interface LayoutInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface LayoutNodeInput {
  id: string;
  /** null = direct child of the frame root. */
  parentId: string | null;
  size: Size2d;
  /** Groups only: box the header band and label need at minimum. */
  minSize?: Size2d;
  /** Groups only: `group X [right]` direction override. */
  direction?: DslDirection;
}

export interface LayoutEdgeInput {
  id: string;
  sourceId: string;
  targetId: string;
}

export interface LayoutGraph {
  rootId: string;
  rootPadding: LayoutInsets;
  groupPadding: LayoutInsets;
  nodes: readonly LayoutNodeInput[];
  edges: readonly LayoutEdgeInput[];
  direction: DslDirection;
}

/** `positions` are parent-relative; `sizes` covers the root and every group. */
export interface LayoutResult {
  positions: Readonly<Record<string, Point2d>>;
  sizes: Readonly<Record<string, Size2d>>;
}

export interface LayoutPort {
  run(graph: LayoutGraph, signal?: AbortSignal): Promise<LayoutResult>;
}

const NODE_GAP = 48;

function horizontal(direction: DslDirection): boolean {
  return direction === 'right' || direction === 'left';
}

function inset(padding: LayoutInsets, direction: DslDirection): number {
  if (direction === 'down') return padding.top;
  if (direction === 'up') return padding.bottom;
  if (direction === 'right') return padding.left;
  return padding.right;
}

function trailing(padding: LayoutInsets, direction: DslDirection): number {
  if (direction === 'down') return padding.bottom;
  if (direction === 'up') return padding.top;
  if (direction === 'right') return padding.right;
  return padding.left;
}

function crossSize(padding: LayoutInsets, direction: DslDirection): number {
  return horizontal(direction) ? padding.top + padding.bottom : padding.left + padding.right;
}

/**
 * Deterministic, dependency-free fallback: every container flows its children
 * along the direction axis, deepest container first, so groups nest cleanly.
 * Production injects the ELK worker port; tests and `format()` use this one.
 */
export const deterministicLayout: LayoutPort = {
  async run(graph, signal) {
    if (signal?.aborted) throw new DOMException('Layout cancelled', 'AbortError');
    const order = new Map(graph.nodes.map((node, index) => [node.id, index]));
    const byId = new Map(graph.nodes.map((node) => [node.id, node]));
    const children = new Map<string, string[]>();
    for (const node of graph.nodes) children.set(node.parentId ?? graph.rootId, [...(children.get(node.parentId ?? graph.rootId) ?? []), node.id]);
    const positions: Record<string, Point2d> = {};
    const sizes: Record<string, Size2d> = {};

    const layoutContainer = (containerId: string, padding: LayoutInsets, direction: DslDirection) => {
      if (signal?.aborted) throw new DOMException('Layout cancelled', 'AbortError');
      const kids = [...(children.get(containerId) ?? [])].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
      if (direction === 'left' || direction === 'up') kids.reverse();
      for (const kid of kids) if ((children.get(kid) ?? []).length > 0) {
        const kidNode = byId.get(kid)!;
        layoutContainer(kid, graph.groupPadding, kidNode.direction ?? direction);
      }
      const along = horizontal(direction);
      let cursor = inset(padding, direction);
      let cross = 0;
      for (const kid of kids) {
        const size = sizes[kid] ?? byId.get(kid)?.size ?? { width: 0, height: 0 };
        positions[kid] = along ? { x: cursor, y: padding.top } : { x: padding.left, y: cursor };
        cursor += (along ? size.width : size.height) + NODE_GAP;
        cross = Math.max(cross, along ? size.height : size.width);
      }
      const extent = kids.length === 0 ? 0 : cursor - NODE_GAP + trailing(padding, direction);
      const minimum = byId.get(containerId)?.minSize;
      const width = Math.max(along ? extent : cross + crossSize(padding, direction), minimum?.width ?? 0);
      const height = Math.max(along ? cross + crossSize(padding, direction) : extent, minimum?.height ?? 0);
      sizes[containerId] = { width: Math.round(width), height: Math.round(height) };
    };
    layoutContainer(graph.rootId, graph.rootPadding, graph.direction);
    return { positions, sizes };
  },
};
