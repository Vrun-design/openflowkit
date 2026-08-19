import { ROLLOUT_FLAGS } from '@/config/rolloutFlags';
import type {
  OpenCanvasBridgeResult,
  ReactFlowGraph,
  ReactFlowProjectionContext,
} from './contracts';
import { projectReactFlowToSceneDocument } from './fromReactFlow';
import { projectSceneDocumentToReactFlow } from './toReactFlow';

export interface OpenCanvasBridgeOptions {
  readonly enabled?: boolean;
}

export function projectReactFlowGraphThroughOpenCanvas(
  graph: ReactFlowGraph,
  context: ReactFlowProjectionContext,
  options: OpenCanvasBridgeOptions = {}
): OpenCanvasBridgeResult {
  const enabled = options.enabled ?? ROLLOUT_FLAGS.openCanvasDocumentV1;
  if (!enabled) {
    return {
      usedCanonicalDocument: false,
      nodes: graph.nodes,
      edges: graph.edges,
      document: null,
    };
  }

  const document = projectReactFlowToSceneDocument(graph, context);
  const projection = projectSceneDocumentToReactFlow(document, context.pageId);
  return {
    usedCanonicalDocument: true,
    nodes: projection.nodes,
    edges: projection.edges,
    document,
  };
}
