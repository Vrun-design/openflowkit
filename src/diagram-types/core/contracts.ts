import type { DiagramType, FlowEdge, FlowNode } from '@/lib/types';
import type { MermaidImportDiagnostic, MermaidImportStatus } from '@/services/mermaid/importContracts';

export interface DiagramParseResult {
  nodes: FlowNode[];
  edges: FlowEdge[];
  error?: string;
  diagnostics?: string[];
  structuredDiagnostics?: MermaidImportDiagnostic[];
  importState?: MermaidImportStatus;
}

export interface DiagramPlugin {
  id: DiagramType;
  displayName: string;
  parseMermaid: (input: string) => DiagramParseResult;
}
