import type { NativeParseResult } from './importNativeParsers';
import { parseMermaidByType } from '@/services/mermaid/parseMermaidByType';
import { toOpenFlowDSL } from '@/services/openFlowDSLExporter';

export function parseMermaidToNative(input: string): NativeParseResult {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('No Mermaid content found.');

  const result = parseMermaidByType(trimmed);
  if (result.error) throw new Error(result.error);
  if (result.nodes.length === 0 && result.edges.length === 0) {
    throw new Error('No nodes or edges found. Check your Mermaid syntax.');
  }

  const dsl = toOpenFlowDSL(result.nodes, result.edges);
  const typeLabel = result.diagramType ?? 'diagram';
  return {
    dsl,
    nodeCount: result.nodes.length,
    edgeCount: result.edges.length,
    summary: `Mermaid ${typeLabel}: ${result.nodes.length} node${result.nodes.length === 1 ? '' : 's'}, ${result.edges.length} edge${result.edges.length === 1 ? '' : 's'}`,
  };
}
