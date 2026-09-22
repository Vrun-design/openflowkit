import type { DiagramType } from '@/lib/types';
import { extractMermaidDiagramHeader } from './detectDiagramType';

// Header-only detection: the official Mermaid runtime is not loaded here (it
// needs a DOM and returns a different model), so `isValid` only says a
// recognisable header exists. `parseMermaidByType` uses this as its oracle.
export interface OfficialMermaidValidationResult {
  isValid: boolean;
  detectedType?: DiagramType;
  rawType?: string;
}

function mapOfficialType(rawType: string | undefined): DiagramType | undefined {
  if (!rawType) return undefined;

  const normalized = rawType.trim();
  if (normalized === 'flowchart-v2' || normalized === 'flowchart' || normalized === 'graph') {
    return 'flowchart';
  }
  if (normalized === 'stateDiagram' || normalized === 'stateDiagram-v2') {
    return 'stateDiagram';
  }
  if (normalized === 'classDiagram' || normalized === 'class') return 'classDiagram';
  if (normalized === 'erDiagram' || normalized === 'er') return 'erDiagram';
  if (normalized === 'mindmap') return 'mindmap';
  if (normalized === 'journey') return 'journey';
  if (normalized === 'architecture' || normalized === 'architecture-beta') return 'architecture';
  if (normalized === 'sequenceDiagram' || normalized === 'sequence') return 'sequence';
  return undefined;
}

export function detectMermaidWithOfficialParser(input: string): OfficialMermaidValidationResult {
  const header = extractMermaidDiagramHeader(input);
  return {
    isValid: Boolean(header.rawType),
    rawType: header.rawType,
    detectedType: header.diagramType ?? mapOfficialType(header.rawType),
  };
}
