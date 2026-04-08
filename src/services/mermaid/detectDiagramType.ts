import type { DiagramType } from '@/lib/types';

function getRelevantLine(line: string): string {
  return line.trim();
}

function mapHeaderToDiagramType(header: string): DiagramType | null {
  if (/^(?:flowchart|graph)$/i.test(header)) return 'flowchart';
  if (/^stateDiagram(?:-v2)?$/i.test(header)) return 'stateDiagram';
  if (/^classDiagram$/i.test(header)) return 'classDiagram';
  if (/^erDiagram$/i.test(header)) return 'erDiagram';
  if (/^mindmap$/i.test(header)) return 'mindmap';
  if (/^journey$/i.test(header)) return 'journey';
  if (/^architecture(?:-beta)?$/i.test(header)) return 'architecture';
  if (/^sequenceDiagram$/i.test(header)) return 'sequence';
  return null;
}

export function extractMermaidDiagramHeader(
  input: string
): { rawType?: string; diagramType?: DiagramType } {
  const lines = input.replace(/\r\n/g, '\n').split('\n');

  for (const rawLine of lines) {
    const line = getRelevantLine(rawLine);
    if (!line || line.startsWith('%%')) continue;

    const headerMatch = line.match(/^([A-Za-z][\w-]*)\b/);
    if (!headerMatch) {
      return {};
    }

    const rawType = headerMatch[1];
    const diagramType = mapHeaderToDiagramType(rawType) ?? undefined;
    if (diagramType) {
      return { rawType, diagramType };
    }

    const trailing = line.slice(headerMatch[0].length).trim();
    if (!trailing) {
      return { rawType };
    }

    return {};
  }

  return {};
}

export function detectMermaidDiagramType(input: string): DiagramType | null {
  return extractMermaidDiagramHeader(input).diagramType ?? null;
}
