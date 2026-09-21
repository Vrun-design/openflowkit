import type { ElkNode } from 'elkjs/lib/elk.bundled.js';
import type { LayoutGraph, LayoutInsets, LayoutNodeInput, LayoutPort, LayoutResult } from '../../dsl/layout';
import { getElkInstance, type ElkLayoutEngine } from '../elk-layout/runtime';

const DIRECTION = { down: 'DOWN', right: 'RIGHT', left: 'LEFT', up: 'UP' } as const;

function insets(padding: LayoutInsets): string {
  return `[top=${padding.top},left=${padding.left},bottom=${padding.bottom},right=${padding.right}]`;
}

function toElkGraph(graph: LayoutGraph): ElkNode {
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
      'elk.layered.spacing.nodeNodeBetweenLayers': '96',
      'elk.layered.spacing.edgeNodeBetweenLayers': '20',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      'elk.randomSeed': '1337',
    },
    children: (childrenByParent.get(graph.rootId) ?? []).map(build),
    // Edges sit on the root; INCLUDE_CHILDREN lets ELK route across group borders.
    edges: graph.edges.map((edge) => ({ id: edge.id, sources: [edge.sourceId], targets: [edge.targetId] })),
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
