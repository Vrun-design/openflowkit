import type { FlowEdge, FlowNode } from '@/lib/types';
import { toOpenFlowDSL } from '@/services/openFlowDSLExporter';

export function serializeCanvasContextForAI(
  nodes: FlowNode[],
  edges: FlowEdge[],
  selectedNodeIds?: string[]
): string {
  if (nodes.length === 0) return '';

  const dsl = toOpenFlowDSL(nodes, edges);
  let context = `# Current diagram — preserve node IDs for unchanged nodes\n${dsl}`;

  if (selectedNodeIds && selectedNodeIds.length > 0) {
    context += `\n# Focused nodes: [${selectedNodeIds.join(', ')}]`;
  }

  return context;
}
