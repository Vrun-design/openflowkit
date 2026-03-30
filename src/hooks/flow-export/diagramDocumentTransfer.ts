import { orderGraphForSerialization } from '@/services/canonicalSerialization';
import type { ExportSerializationMode } from '@/services/canonicalSerialization';
import { createDiagramDocument, parseDiagramDocumentImport } from '@/services/diagramDocument';
import { composeDiagramForDisplay } from '@/services/composeDiagramForDisplay';
import {
  buildImportFidelityReport,
  type ImportFidelityReport,
  mapErrorToIssue,
  mapWarningToIssue,
  persistLatestImportReport,
} from '@/services/importFidelity';
import { createImportReportOutcome, type OperationOutcome } from '@/services/operationFeedback';
import type { FlowEdge, FlowNode, PlaybackState, DiagramType } from '@/lib/types';

interface ActiveTabDocumentState {
  diagramType?: DiagramType;
  playback?: PlaybackState;
}

export function buildDiagramDocumentJson(params: {
  nodes: FlowNode[];
  edges: FlowEdge[];
  exportSerializationMode: ExportSerializationMode;
  activeTab?: ActiveTabDocumentState;
}): string {
  const { nodes, edges, exportSerializationMode, activeTab } = params;
  const { nodes: orderedNodes, edges: orderedEdges } = orderGraphForSerialization(
    nodes,
    edges,
    exportSerializationMode,
  );
  const document = createDiagramDocument(orderedNodes, orderedEdges, activeTab?.diagramType, {
    playback: activeTab?.playback,
    extendedDocumentModel: Boolean(activeTab?.playback),
  });

  return JSON.stringify(document, null, 2);
}

export async function importDiagramDocumentJson(params: {
  json: string;
  importStart: number;
}): Promise<
  | {
      ok: true;
      nodes: FlowNode[];
      edges: FlowEdge[];
      diagramType: DiagramType | undefined;
      playback: PlaybackState | undefined;
      warnings: string[];
      report: ImportFidelityReport;
      outcome: OperationOutcome;
    }
  | {
      ok: false;
      report: ImportFidelityReport;
      outcome: OperationOutcome;
    }
> {
  const { json, importStart } = params;

  try {
    const raw = JSON.parse(json);
    const parsed = parseDiagramDocumentImport(raw);
    const { nodes, edges } = await composeDiagramForDisplay(parsed.nodes, parsed.edges, {
      diagramType: parsed.diagramType,
    });
    const report = buildImportFidelityReport({
      source: 'json',
      nodeCount: nodes.length,
      edgeCount: edges.length,
      elapsedMs: Math.round(performance.now() - importStart),
      issues: parsed.warnings.map((warning) => mapWarningToIssue(warning)),
    });

    persistLatestImportReport(report);
    const outcome = createImportReportOutcome(report, 'Diagram loaded successfully!');

    return {
      ok: true,
      nodes,
      edges,
      diagramType: parsed.diagramType,
      playback: parsed.playback,
      warnings: parsed.warnings,
      report,
      outcome,
    };
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : 'Failed to parse JSON file. Please check the format.';
    const report = buildImportFidelityReport({
      source: 'json',
      nodeCount: 0,
      edgeCount: 0,
      elapsedMs: Math.round(performance.now() - importStart),
      issues: [mapErrorToIssue(errorMessage)],
    });

    persistLatestImportReport(report);
    const outcome = createImportReportOutcome(report, errorMessage);

    return {
      ok: false,
      report,
      outcome,
    };
  }
}
