import { createDefaultEdge } from '@/constants';
import { createId } from '@/lib/id';
import { LEGACY_DSL_CODE_FENCE_ALIASES } from '@/lib/legacyBranding';
import { createLogger } from '@/lib/logger';
import { parseOpenFlowDSL } from '@/lib/openFlowDSLParser';
import type { FlowEdge, FlowNode } from '@/lib/types';

const logger = createLogger({ scope: 'graphComposer' });

export interface ParsedFlowResult {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export function parseDslOrThrow(dslText: string): ParsedFlowResult {
  const codeFenceAliasPattern = ['yaml', 'openflow', ...LEGACY_DSL_CODE_FENCE_ALIASES].join('|');
  const cleanDsl = dslText
    .replace(new RegExp(`\`\`\`(${codeFenceAliasPattern}|)?`, 'g'), '')
    .replace(/```/g, '')
    .trim();
  const parseResult = parseOpenFlowDSL(cleanDsl);
  if (parseResult.error) {
    throw new Error(parseResult.error);
  }
  return {
    nodes: parseResult.nodes as FlowNode[],
    edges: parseResult.edges,
  };
}

export function buildIdMap(
  parsedNodes: FlowNode[],
  existingNodes: FlowNode[]
): Map<string, string> {
  const idMap = new Map<string, string>();
  const existingById = new Map(existingNodes.map((n) => [n.id, n]));

  parsedNodes.forEach((parsedNode) => {
    // Prefer exact ID match — the AI preserved the existing node ID
    if (existingById.has(parsedNode.id)) {
      idMap.set(parsedNode.id, parsedNode.id);
      return;
    }
    // Fall back to label match for AI responses that generated new IDs
    const byLabel = existingNodes.find(
      (n) => n.data.label?.toLowerCase() === parsedNode.data.label?.toLowerCase()
    );
    idMap.set(parsedNode.id, byLabel ? byLabel.id : parsedNode.id);
  });

  return idMap;
}

export function toFinalNodes(parsedNodes: FlowNode[], idMap: Map<string, string>): FlowNode[] {
  const seen = new Set<string>();
  const result: FlowNode[] = [];

  for (const node of parsedNodes) {
    const finalId = idMap.get(node.id) ?? node.id;
    if (seen.has(finalId)) {
      logger.warn('Duplicate node ID after ID mapping — skipping.', { finalId });
      continue;
    }
    seen.add(finalId);
    result.push({ ...node, id: finalId, type: node.type || 'process' });
  }

  return result;
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
        logger.warn('Skipping edge with missing node.', {
          sourceId: edge.source,
          targetId: edge.target,
        });
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
  if (error instanceof Error) {
    const message = error.message;

    if (
      message.includes('401') ||
      message.includes('invalid api key') ||
      message.includes('API key')
    ) {
      return 'Invalid or missing API key. Please check your AI settings.';
    }
    if (message.includes('403') || message.includes('Forbidden')) {
      return 'Access forbidden. Please check your API key permissions.';
    }
    if (message.includes('429') || message.includes('rate limit') || message.includes('quota')) {
      return 'Rate limit exceeded. Please wait a moment and try again.';
    }
    if (message.includes('500') || message.includes('internal server error')) {
      return 'AI provider server error. Please try again later.';
    }
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('Failed to fetch')
    ) {
      return 'Network error. Please check your internet connection.';
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'Request timed out. Please try again.';
    }
    if (message.includes('cursor') || message.includes('parse')) {
      return 'Failed to parse AI response. Please try a different prompt.';
    }
    if (message.includes('context length') || message.includes('token')) {
      return 'Prompt too long. Try simplifying your request.';
    }

    if (message) {
      return message;
    }
  }
  if (typeof error === 'string' && error) {
    return error;
  }
  return 'An unexpected error occurred. Please try again.';
}
