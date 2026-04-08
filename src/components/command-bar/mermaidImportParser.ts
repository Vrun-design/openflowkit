import type { NativeParseResult } from './importNativeParsers';
import { parseMermaidByType } from '@/services/mermaid/parseMermaidByType';
import { summarizeMermaidImport } from '@/services/mermaid/importStatePresentation';
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
    summary: summarizeMermaidImport({
      diagramType: typeLabel,
      importState: result.importState,
      nodeCount: result.nodes.length,
      edgeCount: result.edges.length,
    }),
  };
}
