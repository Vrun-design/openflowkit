import React, { Suspense, lazy } from 'react';
import '@xyflow/react/dist/style.css';
import { FlowCanvas } from './FlowCanvas';

import { CinematicExportOverlay } from './CinematicExportOverlay';
import { FlowEditorChrome } from './flow-editor/FlowEditorChrome';
import { useFlowEditorScreenModel } from './flow-editor/useFlowEditorScreenModel';
import { ArchitectureLintProvider } from '@/context/ArchitectureLintContext';
import { useCinematicExportState } from '@/context/CinematicExportContext';
import { DiagramDiffProvider } from '@/context/DiagramDiffContext';
import { ShareEmbedModal } from '@/components/ShareEmbedModal';
import { ImportRecoveryDialog } from '@/components/ImportRecoveryDialog';
import { StoragePressureBanner } from '@/components/StoragePressureBanner';
import { MermaidDiagnosticsBanner } from '@/components/MermaidDiagnosticsBanner';
import { canRecoverMermaidSource as canRecoverMermaidSourceFromState } from '@/services/mermaid/recoveryPresentation';
import { resolveCinematicExportTheme } from '@/services/export/cinematicExportTheme';
import { useMermaidDiagnostics } from '@/store/selectionHooks';
import { useCanvasActions } from '@/store/canvasHooks';
import { useTabActions } from '@/store/tabHooks';
import { parseMermaidByType } from '@/services/mermaid/parseMermaidByType';
import { importMermaidToCanvas } from '@/services/mermaid/rendererFirstImport';
import { parseMermaidDirectives } from '@/services/mermaid/parseMermaidDirectives';
import { useFlowStore } from '@/store';
import { resolveLayoutDirection } from '@/components/flow-canvas/pasteHelpers';
import { buildMermaidDiagnosticsSnapshot } from '@/services/mermaid/diagnosticsSnapshot';
import { normalizeParseDiagnostics } from '@/services/mermaid/diagnosticFormatting';
import { useMermaidDiagnosticsActions } from '@/store/selectionHooks';

// Keep PixiJS out of the default editor bundle. The centralized rollout
// definition documents the flag; this compile-time gate lets Vite drop the
// lazy import entirely unless a build explicitly opts in.
const LazyOpenCanvasSurface =
  import.meta.env.VITE_OPEN_CANVAS_EDITOR_SURFACE_V1 === '1'
    ? lazy(async () => {
        const module = await import('@/opencanvas/presentation/OpenCanvasSurface');
        return { default: module.OpenCanvasSurface };
      })
    : null;

interface FlowEditorProps {
  onGoHome: () => void;
}

export function FlowEditor({ onGoHome }: FlowEditorProps) {
  const cinematicExportState = useCinematicExportState();
  const mermaidDiagnostics = useMermaidDiagnostics();
  const { setNodes, setEdges } = useCanvasActions();
  const { updateTab } = useTabActions();
  const { setMermaidDiagnostics, clearMermaidDiagnostics } = useMermaidDiagnosticsActions();
  const {
    nodes,
    edges,
    pages,
    activePageId,
    viewSettings,
    diffBaseline,
    setDiffBaseline,
    recordHistory,
    isSelectMode,
    reactFlowWrapper,
    fileInputRef,
    handleImportJSON,
    onFileImport,
    importRecoveryState,
    dismissImportRecovery,
    repairCanonicalImport,
    downloadCanonicalRepairSource,
    shareViewerUrl,
    clearShareViewerUrl,
    collaborationEnabled,
    remotePresence,
    collaborationNodePositions,
    isLayouting,
    flowEditorController,
    t,
  } = useFlowEditorScreenModel({ onGoHome });
  const canvas = (
    <FlowCanvas
      recordHistory={recordHistory}
      isSelectMode={isSelectMode}
      onCanvasEntityIntent={flowEditorController.handleCanvasEntityIntent}
    />
  );
  const cinematicExportTheme = resolveCinematicExportTheme(cinematicExportState.backgroundMode);
  const mermaidRecoverySource = importRecoveryState?.report.source === 'mermaid'
    ? (importRecoveryState.report.originalSource ?? mermaidDiagnostics?.originalSource)
    : mermaidDiagnostics?.originalSource;
  const canRecoverMermaidSource = importRecoveryState?.report.source === 'mermaid'
    ? canRecoverMermaidSourceFromState({
        originalSource: mermaidRecoverySource,
        importState: importRecoveryState.report.importState,
        layoutMode: importRecoveryState.report.layoutMode,
      })
    : canRecoverMermaidSourceFromState({
        originalSource: mermaidRecoverySource,
        importState: mermaidDiagnostics?.importState,
        layoutMode: mermaidDiagnostics?.layoutMode,
      });
  const canRepairCanonicalImport = Boolean(importRecoveryState?.canonicalRepairAvailable);

  const handleConvertMermaidToEditable = React.useCallback(async () => {
    if (!mermaidRecoverySource) {
      return;
    }

    const parsed = parseMermaidByType(mermaidRecoverySource, {
      architectureStrictMode: viewSettings.architectureStrictMode,
    });
    const diagnostics = normalizeParseDiagnostics(parsed.diagnostics);

    if (parsed.error) {
      setMermaidDiagnostics(
        buildMermaidDiagnosticsSnapshot({
          source: 'import',
          diagramType: parsed.diagramType,
          importState: parsed.importState,
          originalSource: mermaidRecoverySource,
          diagnostics,
          error: parsed.error,
        })
      );
      return;
    }

    const editableImport = await importMermaidToCanvas({
      parsed,
      source: mermaidRecoverySource,
      importMode: 'native_editable',
      layout: {
        direction: resolveLayoutDirection(parsed),
        spacing: 'normal',
        contentDensity: 'balanced',
      },
    });

    recordHistory();
    setNodes(editableImport.nodes);
    setEdges(editableImport.edges);
    // Apply Mermaid directive config (frontmatter / %%{init}%% — currently the
    // flowchart curve is the only knob we honor). Mermaid's default curve is
    // 'basis'; we only override when the user wrote one explicitly.
    const directives = parseMermaidDirectives(mermaidRecoverySource ?? '');
    if (directives.flowchartCurve) {
      useFlowStore.getState().setGlobalEdgeOptions({ curve: directives.flowchartCurve });
    }
    if (parsed.diagramType) {
      updateTab(activePageId, { diagramType: parsed.diagramType });
    }

    if (diagnostics.length > 0 || editableImport.visualMode !== 'editable_exact') {
      setMermaidDiagnostics(
        buildMermaidDiagnosticsSnapshot({
          source: 'import',
          diagramType: parsed.diagramType,
          importState: parsed.importState,
          originalSource: mermaidRecoverySource,
          diagnostics,
          nodeCount: editableImport.nodes.length,
          edgeCount: editableImport.edges.length,
          layoutMode: editableImport.layoutMode,
          visualMode: editableImport.visualMode,
          layoutFallbackReason: editableImport.layoutFallbackReason,
        })
      );
    } else {
      clearMermaidDiagnostics();
    }
  }, [
    activePageId,
    clearMermaidDiagnostics,
    mermaidRecoverySource,
    recordHistory,
    setEdges,
    setMermaidDiagnostics,
    setNodes,
    updateTab,
    viewSettings.architectureStrictMode,
  ]);

  return (
    <DiagramDiffProvider
      nodes={nodes}
      edges={edges}
      baselineSnapshot={diffBaseline}
      onStopCompare={() => setDiffBaseline(null)}
    >
      <ArchitectureLintProvider nodes={nodes} edges={edges} rulesJson={viewSettings.lintRules}>
        <div
          id="main-content"
          className="w-full h-screen flex flex-col relative transition-colors duration-150"
          ref={reactFlowWrapper}
          style={{
            background: cinematicExportState.active
              ? cinematicExportTheme.surfaceBackground
              : 'var(--brand-background)',
          }}
        >
          <CinematicExportOverlay />
          {flowEditorController.storagePressure ? (
            <div className="pointer-events-none absolute right-4 top-16 z-50">
              <StoragePressureBanner state={flowEditorController.storagePressure} />
            </div>
          ) : null}
          {mermaidDiagnostics ? (
            <div className="pointer-events-none absolute left-4 right-4 top-16 z-40 flex justify-center">
              <div className="pointer-events-auto w-full max-w-2xl">
                <MermaidDiagnosticsBanner
                  snapshot={mermaidDiagnostics}
                  actionLabel={
                    mermaidDiagnostics.visualMode === 'renderer_exact' && canRecoverMermaidSource
                      ? 'Convert to editable diagram'
                      : canRecoverMermaidSource
                        ? 'Open Mermaid code'
                        : undefined
                  }
                  onAction={
                    mermaidDiagnostics.visualMode === 'renderer_exact' && canRecoverMermaidSource
                      ? handleConvertMermaidToEditable
                      : canRecoverMermaidSource
                        ? () => flowEditorController.openStudioCode('mermaid')
                        : undefined
                  }
                />
              </div>
            </div>
          ) : null}
          <FlowEditorChrome
            pages={pages}
            activePageId={activePageId}
            topNav={flowEditorController.chrome.topNav}
            canvas={
              LazyOpenCanvasSurface ? (
                <Suspense fallback={canvas}>
                  <LazyOpenCanvasSurface fallback={canvas} />
                </Suspense>
              ) : canvas
            }
            shouldRenderPanels={flowEditorController.shouldRenderPanels}
            panels={flowEditorController.panels}
            collaborationEnabled={collaborationEnabled}
            remotePresence={remotePresence}
            collaborationNodePositions={collaborationNodePositions}
            layoutMessage={t('flowEditor.applyingLayout')}
            isLayouting={isLayouting}
            playback={flowEditorController.chrome.playback}
            toolbar={flowEditorController.chrome.toolbar}
            emptyState={flowEditorController.chrome.emptyState}
          />

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={onFileImport}
            className="hidden"
            id="json-import-input"
          />
          {shareViewerUrl && (
            <ShareEmbedModal viewerUrl={shareViewerUrl} onClose={clearShareViewerUrl} />
          )}
          {importRecoveryState ? (
            <ImportRecoveryDialog
              fileName={importRecoveryState.fileName}
              report={importRecoveryState.report}
              onRetry={handleImportJSON}
              onClose={dismissImportRecovery}
              actionLabel={
                canRepairCanonicalImport
                  ? 'Repair canonical document'
                  : importRecoveryState.report.source === 'mermaid' && canRecoverMermaidSource
                  ? mermaidDiagnostics?.visualMode === 'renderer_exact'
                    ? 'Convert to editable diagram'
                    : 'Open Mermaid code'
                  : undefined
              }
              onAction={
                canRepairCanonicalImport
                  ? repairCanonicalImport
                  : importRecoveryState.report.source === 'mermaid' && canRecoverMermaidSource
                  ? mermaidDiagnostics?.visualMode === 'renderer_exact'
                    ? handleConvertMermaidToEditable
                    : () => flowEditorController.openStudioCode('mermaid')
                  : undefined
              }
              supportingActionLabel={
                canRepairCanonicalImport ? 'Download original' : undefined
              }
              onSupportingAction={
                canRepairCanonicalImport ? downloadCanonicalRepairSource : undefined
              }
            />
          ) : null}
        </div>
      </ArchitectureLintProvider>
    </DiagramDiffProvider>
  );
}
