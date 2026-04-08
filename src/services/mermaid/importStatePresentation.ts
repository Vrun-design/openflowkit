import type { DiagramType } from '@/lib/types';
import type { MermaidImportStatus } from './importContracts';
import { getMermaidFamilySupportMatrixEntry } from './supportMatrix';

function formatGraphSummary(nodeCount: number, edgeCount: number): string {
  return `${nodeCount} nodes, ${edgeCount} edges`;
}

export function getMermaidImportStateLabel(
  importState: MermaidImportStatus | undefined
): string {
  switch (importState) {
    case 'editable_partial':
      return 'Ready with warnings';
    case 'unsupported_construct':
      return 'Unsupported Mermaid construct';
    case 'unsupported_family':
      return 'Unsupported Mermaid family';
    case 'invalid_source':
      return 'Needs fixes';
    case 'editable_full':
    default:
      return 'Ready to apply';
  }
}

export function getMermaidImportStateDetail(params: {
  importState: MermaidImportStatus | undefined;
  diagramType?: DiagramType;
  nodeCount: number;
  edgeCount: number;
}): string {
  const graphSummary = formatGraphSummary(params.nodeCount, params.edgeCount);
  const supportEntry = params.diagramType
    ? getMermaidFamilySupportMatrixEntry(params.diagramType)
    : undefined;

  switch (params.importState) {
    case 'editable_partial':
      return supportEntry?.partialConstructs.length
        ? `${graphSummary}, partial editability (${supportEntry.partialConstructs[0]})`
        : `${graphSummary}, partial editability`;
    case 'unsupported_construct':
      return supportEntry?.partialConstructs.length
        ? `${graphSummary}, unsupported construct fallback required (${supportEntry.partialConstructs[0]})`
        : `${graphSummary}, unsupported construct fallback required`;
    case 'unsupported_family':
      return `${graphSummary}, unsupported family fallback required`;
    case 'invalid_source':
      return 'Mermaid source needs fixes before it can be applied.';
    case 'editable_full':
    default:
      return graphSummary;
  }
}

export function getMermaidImportToastMessage(params: {
  importState: MermaidImportStatus | undefined;
  warningCount: number;
}): string | null {
  if (params.importState === 'editable_partial') {
    return `Imported with warnings: partial editability (${params.warningCount} diagnostic warning${params.warningCount === 1 ? '' : 's'}).`;
  }

  if (params.warningCount > 0) {
    return `Imported with ${params.warningCount} diagnostic warning${params.warningCount === 1 ? '' : 's'}.`;
  }

  return null;
}

export function getMermaidImportStateGuidance(
  importState: MermaidImportStatus | undefined,
  diagramType?: DiagramType
): string | undefined {
  const supportEntry = diagramType
    ? getMermaidFamilySupportMatrixEntry(diagramType)
    : undefined;

  switch (importState) {
    case 'editable_partial':
      return supportEntry?.partialConstructs.length
        ? `Review the diagnostics after apply; ${supportEntry.label} still has partial support around ${supportEntry.partialConstructs.slice(0, 2).join(' and ')}.`
        : 'Review the diagnostics after apply; some Mermaid constructs may not stay fully editable.';
    case 'unsupported_construct':
      return supportEntry?.partialConstructs.length
        ? `Keep working in Mermaid code or simplify the unsupported construct before applying. Current partial areas for ${supportEntry.label} include ${supportEntry.partialConstructs.slice(0, 2).join(' and ')}.`
        : 'Keep working in Mermaid code or simplify the unsupported construct before applying.';
    case 'unsupported_family':
      return 'This Mermaid family is not editable yet. Keep working in Mermaid code or switch to a supported family.';
    case 'invalid_source':
      return 'Fix the Mermaid syntax or header and retry.';
    default:
      return undefined;
  }
}

export function appendMermaidImportGuidance(params: {
  message: string;
  importState: MermaidImportStatus | undefined;
  diagramType?: DiagramType;
}): string {
  const guidance = getMermaidImportStateGuidance(params.importState, params.diagramType);
  if (!guidance || params.message.includes(guidance)) {
    return params.message;
  }

  return `${params.message} ${guidance}`;
}

export function summarizeMermaidImport(params: {
  diagramType?: string;
  importState?: MermaidImportStatus;
  nodeCount: number;
  edgeCount: number;
}): string {
  const typeLabel = params.diagramType ?? 'diagram';
  const label = getMermaidImportStateLabel(params.importState);
  const detail = getMermaidImportStateDetail({
    importState: params.importState,
    diagramType: params.diagramType as DiagramType | undefined,
    nodeCount: params.nodeCount,
    edgeCount: params.edgeCount,
  });

  return `Mermaid ${typeLabel}: ${label} (${detail})`;
}
