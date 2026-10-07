import type { ElkNode } from 'elkjs/lib/elk.bundled.js';
import type { LayoutGraph, LayoutInsets, LayoutNodeInput, LayoutPort, LayoutResult } from '../../dsl/layout';
import { getElkInstance, type ElkLayoutEngine } from '../elk-layout/runtime';

const DIRECTION = { down: 'DOWN', right: 'RIGHT', left: 'LEFT', up: 'UP' } as const;

function insets(padding: LayoutInsets): string {
  return `[top=${padding.top},left=${padding.left},bottom=${padding.bottom},right=${padding.right}]`;
}

/**
 * Edges that close a cycle, found depth-first from each node in declaration order
 * (dagre's acyclic pass, so Mermaid's). ELK's own cycle breaking compares model order
 * per hierarchy level, so an edge into a group's first child counts as backward and a
 * flow's entry chain lands at the bottom.
 */
export function backEdges(graph: LayoutGraph): ReadonlySet<string> {
  const outgoing = new Map<string, LayoutGraph['edges'][number][]>();
  for (const edge of graph.edges) outgoing.set(edge.sourceId, [...(outgoing.get(edge.sourceId) ?? []), edge]);
  const back = new Set<string>();
  const done = new Set<string>();
  const onPath = new Set<string>();
  // ponytail: recursive, so a single chain deeper than ~5k nodes would overflow; go iterative if one shows up.
  const visit = (id: string) => {
    done.add(id);
    onPath.add(id);
    for (const edge of outgoing.get(id) ?? []) {
      if (onPath.has(edge.targetId)) back.add(edge.id);
      else if (!done.has(edge.targetId)) visit(edge.targetId);
    }
    onPath.delete(id);
  };
  for (const node of graph.nodes) if (!done.has(node.id)) visit(node.id);
  return back;
}

function toElkGraph(graph: LayoutGraph): ElkNode {
  const back = backEdges(graph);
  const childrenByParent = new Map<string, LayoutNodeInput[]>();
  for (const node of graph.nodes) {
    const parent = node.parentId ?? graph.rootId;
    childrenByParent.set(parent, [...(childrenByParent.get(parent) ?? []), node]);
  }
  const build = (input: LayoutNodeInput): ElkNode => {
    const children = childrenByParent.get(input.id) ?? [];
    if (children.length === 0) {
      const minimum = input.minSize;
      return {
        id: input.id, width: minimum?.width ?? input.size.width, height: minimum?.height ?? input.size.height,
      };
    }
    const minimum = input.minSize ?? { width: 180, height: 132 };
    return {
      id: input.id,
      layoutOptions: {
        'elk.padding': insets(graph.groupPadding),
        ...(input.direction ? { 'elk.direction': DIRECTION[input.direction] } : {}),
        'elk.nodeSize.constraints': 'MINIMUM_SIZE',
        'elk.nodeSize.minimum': `(${minimum.width},${minimum.height})`,
      },
      children: children.map(build),
    };
  };
  return {
    id: graph.rootId,
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': DIRECTION[graph.direction],
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.padding': insets(graph.rootPadding),
      'elk.spacing.nodeNode': '48',
      'elk.layered.spacing.nodeNodeBetweenLayers': '64',
      'elk.layered.spacing.edgeNodeBetweenLayers': '20',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      'elk.randomSeed': '1337',
    },
    children: (childrenByParent.get(graph.rootId) ?? []).map(build),
    // Edges sit on the root; INCLUDE_CHILDREN lets ELK route across group borders.
    // Only positions come back, so a reversed back edge changes ranks and nothing else.
    // A sized label gets its own slot between layers, so ranks open up wherever text must fit.
    edges: graph.edges.map((edge) => ({
      id: edge.id,
      ...(back.has(edge.id) ? { sources: [edge.targetId], targets: [edge.sourceId] } : { sources: [edge.sourceId], targets: [edge.targetId] }),
      // ELK skips a label without text; the size is what it lays out.
      ...(edge.label ? { labels: [{ id: `${edge.id}:label`, text: ' ', width: edge.label.width, height: edge.label.height }] } : {}),
    })),
  };
}

function collect(node: ElkNode, result: { positions: Record<string, { x: number; y: number }>; sizes: Record<string, { width: number; height: number }> }): void {
  for (const child of node.children ?? []) {
    result.positions[child.id] = { x: Math.round(child.x ?? 0), y: Math.round(child.y ?? 0) };
    if ((child.children ?? []).length > 0) {
      result.sizes[child.id] = { width: Math.round(child.width ?? 0), height: Math.round(child.height ?? 0) };
      collect(child, result);
    }
  }
}

export function createElkLayoutPort(getEngine: () => Promise<ElkLayoutEngine> = getElkInstance): LayoutPort {
  return {
    async run(graph, signal): Promise<LayoutResult> {
      if (signal?.aborted) throw new DOMException('Layout cancelled', 'AbortError');
      const engine = await getEngine();
      const work = engine.layout(toElkGraph(graph)).then((laid): LayoutResult => {
        const collected = { positions: {}, sizes: {} } as {
          positions: Record<string, { x: number; y: number }>;
          sizes: Record<string, { width: number; height: number }>;
        };
        collect(laid, collected);
        return {
          positions: collected.positions,
          sizes: { ...collected.sizes, [graph.rootId]: { width: Math.round(laid.width ?? 0), height: Math.round(laid.height ?? 0) } },
        };
      });
      if (!signal) return work;
      return Promise.race([
        work,
        new Promise<never>((_, reject) => signal.addEventListener('abort', () => reject(new DOMException('Layout cancelled', 'AbortError')), { once: true })),
      ]);
    },
  };
}

export type { ElkLayoutEngine };
export const elkDslLayoutPort = createElkLayoutPort();
