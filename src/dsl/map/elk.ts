import type { AggEdge, MapModel, MapNode } from './types';
import { edgeText } from './view';

// The map as an ELK graph and back. Structural types only: elkjs itself is the caller's
// (a worker in the app, the real library in elk.test.ts), so this module stays pure.

export interface ElkPoint { x: number; y: number }
export interface ElkLabel { text: string; width: number; height: number; x?: number; y?: number }
export interface ElkEdge {
  id: string;
  sources: string[];
  targets: string[];
  labels?: ElkLabel[];
  sections?: { startPoint: ElkPoint; endPoint: ElkPoint; bendPoints?: ElkPoint[] }[];
}
export interface ElkNode {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  layoutOptions?: Record<string, string>;
  children?: ElkNode[];
  edges?: ElkEdge[];
}

export interface LaidRect { x: number; y: number; width: number; height: number; open: boolean }
export interface LaidEdge { key: string; points: ElkPoint[]; label?: ElkLabel }
export interface Laid { rects: Map<string, LaidRect>; edges: LaidEdge[]; size: { width: number; height: number } }

const EDGE = 'e:';

// An open box draws its title band on top (52 with its margin) and its kind tag ("[Service]") bottom-left, 10px type
// whose line starts 22px above the bottom edge (PixiContainerRenderer.createLabel); the children keep clear of both.
export const OPEN_BOX_PADDING = { top: 52, left: 16, bottom: 32, right: 16 } as const;

/**
 * One ELK node per visible box; each open box carries the arrows between its own children
 * (ELK routes them inside it). `considerModelOrder` plus model order keeps unchanged boxes in place
 * when another one opens. Edge coordinates come back in ROOT space (verified on elkjs 0.11.0).
 */
export function toElkGraph(
  model: MapModel,
  expanded: ReadonlySet<string>,
  edges: readonly AggEdge[],
  sizeOf: (node: MapNode) => { width: number; height: number },
  measure: (text: string) => number,
): ElkNode {
  const byParent = new Map<string, ElkEdge[]>();
  for (const e of edges) {
    const text = edgeText(e);
    const list = byParent.get(e.parent) ?? byParent.set(e.parent, []).get(e.parent)!;
    list.push({ id: EDGE + e.key, sources: [e.from], targets: [e.to], labels: [{ text, width: measure(text) + 12, height: 16 }] });
  }
  const node = (id: string): ElkNode => {
    const n = model.nodes[id];
    if (!expanded.has(id) || !n.children.length) return { id, ...sizeOf(n) };
    return {
      id,
      layoutOptions: { 'elk.padding': `[top=${OPEN_BOX_PADDING.top},left=${OPEN_BOX_PADDING.left},bottom=${OPEN_BOX_PADDING.bottom},right=${OPEN_BOX_PADDING.right}]`, 'elk.nodeSize.constraints': 'MINIMUM_SIZE', 'elk.nodeSize.minimum': '(260,90)' },
      children: n.children.map(node),
      edges: byParent.get(id) ?? [],
    };
  };
  return {
    id: model.root,
    layoutOptions: {
      'elk.algorithm': 'layered', 'elk.direction': 'DOWN', 'elk.edgeRouting': 'ORTHOGONAL',
      'elk.json.edgeCoords': 'ROOT', 'elk.edgeLabels.placement': 'CENTER',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      // Brandes-Koepf otherwise picks the most compact of four alignments, and a box that widens on open flips which
      // one wins, so whole columns swap sides (C4 stability: worst tau 0.29 → 0.82, same crossings, edges +4%).
      'elk.layered.nodePlacement.bk.fixedAlignment': 'LEFTDOWN',
      'elk.spacing.nodeNode': '28', 'elk.layered.spacing.nodeNodeBetweenLayers': '56',
      'elk.spacing.edgeNode': '16', 'elk.spacing.edgeEdge': '10', 'elk.padding': '[top=20,left=20,bottom=20,right=20]',
    },
    children: model.nodes[model.root].children.map(node),
    edges: byParent.get(model.root) ?? [],
  };
}

/** Absolute rectangles per box id (ELK gives child coordinates relative to the parent) and arrow polylines per edge key. */
export function fromElkLayout(result: ElkNode): Laid {
  const rects = new Map<string, LaidRect>();
  const edges: LaidEdge[] = [];
  const walk = (n: ElkNode, ox: number, oy: number) => {
    for (const e of n.edges ?? []) {
      const s = e.sections?.[0];
      edges.push({ key: e.id.slice(EDGE.length), points: s ? [s.startPoint, ...(s.bendPoints ?? []), s.endPoint] : [], label: e.labels?.[0] });
    }
    for (const c of n.children ?? []) {
      const x = ox + (c.x ?? 0);
      const y = oy + (c.y ?? 0);
      rects.set(c.id, { x, y, width: c.width ?? 0, height: c.height ?? 0, open: !!c.children?.length });
      walk(c, x, y);
    }
  };
  walk(result, 0, 0);
  return { rects, edges, size: { width: result.width ?? 0, height: result.height ?? 0 } };
}
