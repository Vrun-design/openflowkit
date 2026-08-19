import type { FlowEdge, FlowNode } from '@/lib/types';
import type { SceneDocumentV1 } from '../../domain/document/types';
import { projectReactFlowGraphThroughOpenCanvas } from './bridge';
import type { ReactFlowProjectionContext } from './contracts';

const TRANSIENT_NODE_FIELDS = new Set(['selected', 'dragging', 'measured', 'positionAbsolute']);
const TRANSIENT_EDGE_FIELDS = new Set(['selected']);

export type OpenCanvasShadowFailureCode =
  | 'CANONICAL_PROJECTION_FAILED'
  | 'ROUND_TRIP_MISMATCH';

export type OpenCanvasShadowProjectionResult =
  | {
      readonly status: 'passed';
      readonly document: SceneDocumentV1;
      readonly nodeCount: number;
      readonly connectorCount: number;
      readonly durationMs: number;
    }
  | {
      readonly status: 'failed';
      readonly code: OpenCanvasShadowFailureCode;
      readonly nodeCount: number;
      readonly connectorCount: number;
      readonly durationMs: number;
    };

export interface OpenCanvasShadowProjectionOptions {
  readonly now?: () => number;
}

function semanticRecord(
  value: FlowNode | FlowEdge,
  transientFields: ReadonlySet<string>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !transientFields.has(key))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, semanticValue(entry)])
  );
}

function semanticValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(semanticValue);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, semanticValue(entry)])
    );
  }
  return value;
}

function semanticGraph(nodes: readonly FlowNode[], edges: readonly FlowEdge[]): unknown {
  return {
    nodes: nodes.map((node) => semanticRecord(node, TRANSIENT_NODE_FIELDS)),
    edges: edges.map((edge) => semanticRecord(edge, TRANSIENT_EDGE_FIELDS)),
  };
}

export function runOpenCanvasShadowProjection(
  graph: { readonly nodes: readonly FlowNode[]; readonly edges: readonly FlowEdge[] },
  context: ReactFlowProjectionContext,
  options: OpenCanvasShadowProjectionOptions = {}
): OpenCanvasShadowProjectionResult {
  const clock = options.now ?? performance.now.bind(performance);
  const startedAt = clock();

  try {
    const result = projectReactFlowGraphThroughOpenCanvas(graph, context, { enabled: true });
    const durationMs = Math.max(0, clock() - startedAt);

    if (
      !result.usedCanonicalDocument ||
      JSON.stringify(semanticGraph(graph.nodes, graph.edges)) !==
        JSON.stringify(semanticGraph(result.nodes, result.edges))
    ) {
      return {
        status: 'failed',
        code: 'ROUND_TRIP_MISMATCH',
        nodeCount: graph.nodes.length,
        connectorCount: graph.edges.length,
        durationMs,
      };
    }

    return {
      status: 'passed',
      document: result.document,
      nodeCount: graph.nodes.length,
      connectorCount: graph.edges.length,
      durationMs,
    };
  } catch {
    return {
      status: 'failed',
      code: 'CANONICAL_PROJECTION_FAILED',
      nodeCount: graph.nodes.length,
      connectorCount: graph.edges.length,
      durationMs: Math.max(0, clock() - startedAt),
    };
  }
}
