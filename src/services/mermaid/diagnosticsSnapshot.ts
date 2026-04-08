import type { DiagramType } from '@/lib/types';
import type { ParseDiagnostic } from '@/lib/openFlowDSLParser';
import type { MermaidDiagnosticsSnapshot } from '@/store/types';
import type { MermaidImportStatus } from './importContracts';
import {
  appendMermaidImportGuidance,
  getMermaidImportStateDetail,
  getMermaidImportStateLabel,
} from './importStatePresentation';

interface BuildMermaidDiagnosticsSnapshotParams {
  source: MermaidDiagnosticsSnapshot['source'];
  diagramType?: DiagramType;
  importState?: MermaidImportStatus;
  originalSource?: string;
  diagnostics: ParseDiagnostic[];
  error?: string;
  nodeCount?: number;
  edgeCount?: number;
}

export function buildMermaidDiagnosticsSnapshot(
  params: BuildMermaidDiagnosticsSnapshotParams
): MermaidDiagnosticsSnapshot {
  const statusLabel = getMermaidImportStateLabel(params.importState);
  const nodeCount = params.nodeCount ?? 0;
  const edgeCount = params.edgeCount ?? 0;

  return {
    source: params.source,
    diagramType: params.diagramType,
    importState: params.importState,
    statusLabel,
    statusDetail: getMermaidImportStateDetail({
      importState: params.importState,
      diagramType: params.diagramType,
      nodeCount,
      edgeCount,
    }),
    originalSource: params.originalSource,
    diagnostics: params.diagnostics,
    error: params.error
      ? appendMermaidImportGuidance({
          message: params.error,
          importState: params.importState,
          diagramType: params.diagramType,
        })
      : undefined,
    updatedAt: Date.now(),
  };
}
