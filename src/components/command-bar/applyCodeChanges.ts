import type { ParseDiagnostic } from '@/lib/openFlowDSLParser';
import { createLogger } from '@/lib/logger';
import { parseOpenFlowDSL } from '@/lib/openFlowDSLParser';
import type { MermaidDiagnosticsSnapshot } from '@/store/types';
import { parseMermaidByType } from '@/services/mermaid/parseMermaidByType';
import { normalizeParseDiagnostics } from '@/services/mermaid/diagnosticFormatting';
import {
  buildImportFidelityReport,
  mapErrorToIssue,
  mapParserDiagnosticToIssue,
  persistLatestImportReport,
} from '@/services/importFidelity';
import { composeDiagramForDisplay } from '@/services/composeDiagramForDisplay';
import type { FlowEdge, FlowNode } from '@/lib/types';
import { createImportReportOutcome, notifyOperationOutcome } from '@/services/operationFeedback';

const logger = createLogger({ scope: 'applyCodeChanges' });

interface ApplyOptions {
  closeOnSuccess: boolean;
  source: 'manual' | 'live';
  liveRequestId?: number;
}

interface ApplyCodeChangesParams {
  mode: 'mermaid' | 'openflow';
  code: string;
  architectureStrictMode: boolean;
  onApply: (nodes: FlowNode[], edges: FlowEdge[]) => void;
  onClose: () => void;
  activeTabId: string;
  updateTab: (tabId: string, updates: Partial<{ diagramType: string }>) => void;
  setMermaidDiagnostics: (snapshot: MermaidDiagnosticsSnapshot | null) => void;
  clearMermaidDiagnostics: () => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  setError: (error: string | null) => void;
  setDiagnostics: (diagnostics: ParseDiagnostic[]) => void;
  setIsApplying: (value: boolean) => void;
  setLiveStatus: (status: 'idle' | 'typing' | 'applying' | 'synced' | 'error') => void;
  isLiveRequestStale: (requestId: number | undefined, source: ApplyOptions['source']) => boolean;
  options: ApplyOptions;
}

export async function applyCodeChanges({
  mode,
  code,
  architectureStrictMode,
  onApply,
  onClose,
  activeTabId,
  updateTab,
  setMermaidDiagnostics,
  clearMermaidDiagnostics,
  addToast,
  setError,
  setDiagnostics,
  setIsApplying,
  setLiveStatus,
  isLiveRequestStale,
  options,
}: ApplyCodeChangesParams): Promise<boolean> {
  const importStart = performance.now();
  const res = mode === 'mermaid'
    ? parseMermaidByType(code, { architectureStrictMode })
    : parseOpenFlowDSL(code);

  if (res.error) {
    if (isLiveRequestStale(options.liveRequestId, options.source)) {
      return false;
    }
    const parserDiagnostics = 'diagnostics' in res
      ? normalizeParseDiagnostics(res.diagnostics)
      : [];
    if (mode === 'mermaid') {
      setMermaidDiagnostics({
        source: 'code',
        diagramType: 'diagramType' in res ? res.diagramType : undefined,
        diagnostics: parserDiagnostics,
        error: res.error,
        updatedAt: Date.now(),
      });
    }
    if (options.source === 'manual') {
      const issues = parserDiagnostics.map((diagnostic) => mapParserDiagnosticToIssue(diagnostic));
      if (issues.length === 0) {
        issues.push(mapErrorToIssue(res.error));
      }
      const report = buildImportFidelityReport({
        source: mode === 'mermaid' ? 'mermaid' : 'openflowdsl',
        nodeCount: 0,
        edgeCount: 0,
        elapsedMs: Math.round(performance.now() - importStart),
        issues,
      });
      persistLatestImportReport(report);
      notifyOperationOutcome(addToast, createImportReportOutcome(report, res.error));
    }
    setError(res.error);
    if ('diagnostics' in res) {
      setDiagnostics(normalizeParseDiagnostics(res.diagnostics));
    } else {
      setDiagnostics([]);
    }
    if (options.source === 'live') {
      setLiveStatus('error');
    }
    return false;
  }

  if (res.nodes.length > 0) {
    if (options.source === 'manual') {
      setIsApplying(true);
    } else {
      setLiveStatus('applying');
    }
    try {
      if (isLiveRequestStale(options.liveRequestId, options.source)) {
        return false;
      }
      if (mode === 'mermaid') {
        const parserDiagnostics = 'diagnostics' in res
          ? normalizeParseDiagnostics(res.diagnostics)
          : [];
        if (parserDiagnostics.length > 0) {
          setMermaidDiagnostics({
            source: 'code',
            diagramType: 'diagramType' in res ? res.diagramType : undefined,
            diagnostics: parserDiagnostics,
            updatedAt: Date.now(),
          });
        } else {
          clearMermaidDiagnostics();
        }
      }

      const direction = ('direction' in res && res.direction) ? res.direction : 'TB';

      const { nodes: layoutedNodes, edges: layoutedEdges } = await composeDiagramForDisplay(res.nodes, res.edges, {
        direction,
        algorithm: 'layered',
        spacing: 'normal',
        diagramType: mode === 'mermaid' && 'diagramType' in res ? res.diagramType : undefined,
      });
      if (isLiveRequestStale(options.liveRequestId, options.source)) {
        return false;
      }

      onApply(layoutedNodes, layoutedEdges);
      setError(null);
      setDiagnostics([]);
      if (mode === 'mermaid' && 'diagramType' in res && res.diagramType) {
        updateTab(activeTabId, { diagramType: res.diagramType });
      }
      if (options.source === 'manual') {
        const report = buildImportFidelityReport({
          source: mode === 'mermaid' ? 'mermaid' : 'openflowdsl',
          nodeCount: layoutedNodes.length,
          edgeCount: layoutedEdges.length,
          elapsedMs: Math.round(performance.now() - importStart),
          issues: [],
        });
        persistLatestImportReport(report);
        notifyOperationOutcome(addToast, createImportReportOutcome(report));
      } else {
        setLiveStatus('synced');
      }
    } catch (err) {
      logger.error('Layout failed; applying raw positions.', { error: err });
      if (isLiveRequestStale(options.liveRequestId, options.source)) {
        return false;
      }
      onApply(res.nodes, res.edges);
      setError(null);
      setDiagnostics([]);
      if (mode === 'mermaid' && 'diagramType' in res && res.diagramType) {
        updateTab(activeTabId, { diagramType: res.diagramType });
      }
      if (options.source === 'manual') {
        const report = buildImportFidelityReport({
          source: mode === 'mermaid' ? 'mermaid' : 'openflowdsl',
          nodeCount: res.nodes.length,
          edgeCount: res.edges.length,
          elapsedMs: Math.round(performance.now() - importStart),
          issues: [mapErrorToIssue('Layout fallback applied after import.')],
        });
        persistLatestImportReport(report);
        notifyOperationOutcome(addToast, createImportReportOutcome(report, 'Layout fallback applied after import.'));
      } else {
        setLiveStatus('synced');
      }
    } finally {
      if (options.source === 'manual') {
        setIsApplying(false);
      }
    }
  } else {
    if (isLiveRequestStale(options.liveRequestId, options.source)) {
      return false;
    }
    if (mode === 'mermaid') {
      const parserDiagnostics = 'diagnostics' in res
        ? normalizeParseDiagnostics(res.diagnostics)
        : [];
      if (parserDiagnostics.length > 0) {
        setMermaidDiagnostics({
          source: 'code',
          diagramType: 'diagramType' in res ? res.diagramType : undefined,
          diagnostics: parserDiagnostics,
          updatedAt: Date.now(),
        });
      } else {
        clearMermaidDiagnostics();
      }
    }

    onApply(res.nodes, res.edges);
    setError(null);
    setDiagnostics([]);
    if (mode === 'mermaid' && 'diagramType' in res && res.diagramType) {
      updateTab(activeTabId, { diagramType: res.diagramType });
    }
    if (options.source === 'manual') {
      const report = buildImportFidelityReport({
        source: mode === 'mermaid' ? 'mermaid' : 'openflowdsl',
        nodeCount: res.nodes.length,
        edgeCount: res.edges.length,
        elapsedMs: Math.round(performance.now() - importStart),
        issues: [],
      });
      persistLatestImportReport(report);
      notifyOperationOutcome(addToast, createImportReportOutcome(report));
    } else {
      setLiveStatus('synced');
    }
  }

  if (options.closeOnSuccess) {
    onClose();
  }

  return true;
}
