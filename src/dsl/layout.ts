import type { SceneConnector } from '../opencanvas/domain/document/types';
import type { Point2d, Size2d } from '../opencanvas/domain/geometry/types';
import { measurePortableText } from '../opencanvas/domain/text/measurement';
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
  /** The label's plate plus breathing room; the layout leaves it this much space. */
  label?: Size2d;
}

/** Label plates are 12px text wrapped at 140 (the canvas renderer's values), padded 5; room beside the text matters more than above it. */
const LABEL_ROOM = { padding: 5, marginX: 8, marginY: 4, wrap: 140, fontSize: 12 };

/** Layout edges for a family's connectors, each label measured so the layout makes room for it. */
export function layoutEdges(connectors: readonly SceneConnector[]): LayoutEdgeInput[] {
  return connectors.map((connector) => {
    const text = connector.labels.map((label) => label.text).filter(Boolean).join('\n');
    const measured = text ? measurePortableText(text, { fontSize: LABEL_ROOM.fontSize, fontWeight: 500, maxWidth: LABEL_ROOM.wrap, overflow: 'wrap' }) : null;
    const room = (extent: number, padding: number, margin: number) => Math.ceil(extent + padding + margin * 2);
    return {
      id: connector.id, sourceId: connector.source.nodeId!, targetId: connector.target.nodeId!,
      ...(measured ? { label: { width: room(measured.width, LABEL_ROOM.padding * 2, LABEL_ROOM.marginX), height: room(measured.height, LABEL_ROOM.padding, LABEL_ROOM.marginY) } } : {}),
    };
  });
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

/** A family's layout wish: its own nodes (containers included), no frame knowledge. */
export interface LayoutRequest {
  nodes: readonly LayoutNodeInput[];
  edges: readonly LayoutEdgeInput[];
  direction: DslDirection;
  rootPadding: LayoutInsets;
  groupPadding: LayoutInsets;
}

export interface LayoutOutcome {
  /** Parent-relative for nested nodes; root-relative for frame children. */
  positions: Readonly<Record<string, Point2d>>;
  sizes: Readonly<Record<string, Size2d>>;
  /** Frame content size: the synthetic root's box. */
  root: Size2d;
}

const ROOT_ID = '__root__';

/** Wraps a port with the frame root so families never see root ids or padding plumbing. */
export function layoutRunner(port: LayoutPort) {
  return async (request: LayoutRequest, signal?: AbortSignal): Promise<LayoutOutcome> => {
    const result = await port.run({
      rootId: ROOT_ID,
      rootPadding: request.rootPadding,
      groupPadding: request.groupPadding,
      nodes: request.nodes,
      edges: request.edges,
      direction: request.direction,
    }, signal);
    return { positions: result.positions, sizes: result.sizes, root: result.sizes[ROOT_ID] ?? { width: 0, height: 0 } };
  };
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
