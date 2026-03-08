import { createDefaultEdge } from '@/constants';
import { createId } from '@/lib/id';
import { parseOpenFlowDSL } from '@/lib/openFlowDSLParser';
import type { FlowEdge, FlowNode } from '@/lib/types';

export interface ParsedFlowResult {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export function parseDslOrThrow(dslText: string): ParsedFlowResult {
  const cleanDsl = dslText.replace(/```(yaml|flowmind|)?/g, '').replace(/```/g, '').trim();
  const parseResult = parseOpenFlowDSL(cleanDsl);
  if (parseResult.error) {
    throw new Error(parseResult.error);
  }
  return {
    nodes: parseResult.nodes as FlowNode[],
    edges: parseResult.edges,
  };
}

export function buildIdMap(parsedNodes: FlowNode[], existingNodes: FlowNode[]): Map<string, string> {
  const idMap = new Map<string, string>();
  parsedNodes.forEach((parsedNode) => {
    const existingNode = existingNodes.find((node) => (
      node.data.label?.toLowerCase() === parsedNode.data.label?.toLowerCase()
    ));
    idMap.set(parsedNode.id, existingNode ? existingNode.id : parsedNode.id);
  });
  return idMap;
}

export function toFinalNodes(parsedNodes: FlowNode[], idMap: Map<string, string>): FlowNode[] {
  return parsedNodes.map((node) => ({
    ...node,
    id: idMap.get(node.id) || node.id,
    type: node.type || 'process',
  }));
}

export function toFinalEdges(
  parsedEdges: FlowEdge[],
  idMap: Map<string, string>,
  globalEdgeOptions: {
    type: ReturnType<typeof createDefaultEdge>['type'];
    animated: boolean;
    strokeWidth: number;
    color?: string;
  }
): FlowEdge[] {
  return parsedEdges
    .map((edge) => {
      const sourceId = idMap.get(edge.source);
      const targetId = idMap.get(edge.target);

      if (!sourceId || !targetId) {
        console.warn(`Skipping edge with missing node: ${edge.source} -> ${edge.target}`);
        return null;
      }

      const defaultEdge = createDefaultEdge(sourceId, targetId);
      let edgeType = edge.type;
      if (edgeType === 'default' || !edgeType) {
        edgeType = globalEdgeOptions.type === 'default' ? undefined : globalEdgeOptions.type;
      }
      if ((edge.data as { styleType?: string } | undefined)?.styleType === 'curved') {
        edgeType = 'default';
      }

      return {
        ...defaultEdge,
        ...edge,
        id: createId(`e-${sourceId}-${targetId}`),
        source: sourceId,
        target: targetId,
        type: edgeType,
        animated: edge.animated || globalEdgeOptions.animated,
        style: {
          ...defaultEdge.style,
          ...edge.style,
          strokeWidth: globalEdgeOptions.strokeWidth,
          ...(globalEdgeOptions.color ? { stroke: globalEdgeOptions.color } : {}),
        },
      } as FlowEdge;
    })
    .filter((edge): edge is FlowEdge => edge !== null);
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Unknown error';
}
