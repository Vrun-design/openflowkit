import React from 'react';
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
import { MermaidDiagnosticsBanner } from '@/components/MermaidDiagnosticsBanner';
import { resolveCinematicExportTheme } from '@/services/export/cinematicExportTheme';
import { useMermaidDiagnostics } from '@/store/selectionHooks';

interface FlowEditorProps {
  onGoHome: () => void;
}

export function FlowEditor({ onGoHome }: FlowEditorProps) {
  const cinematicExportState = useCinematicExportState();
  const mermaidDiagnostics = useMermaidDiagnostics();
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
    shareViewerUrl,
    clearShareViewerUrl,
    collaborationEnabled,
    remotePresence,
    collaborationNodePositions,
    isLayouting,
    flowEditorController,
    t,
  } = useFlowEditorScreenModel({ onGoHome });
  const cinematicExportTheme = resolveCinematicExportTheme(cinematicExportState.backgroundMode);
  const mermaidRecoverySource = importRecoveryState?.report.source === 'mermaid'
    ? (importRecoveryState.report.originalSource ?? mermaidDiagnostics?.originalSource)
    : mermaidDiagnostics?.originalSource;
  const canRecoverMermaidSource = Boolean(
    mermaidRecoverySource
    && (
      importRecoveryState?.report.source === 'mermaid'
        ? importRecoveryState.report.importState !== 'editable_full'
        : mermaidDiagnostics?.importState !== 'editable_full'
    )
  );

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
          {mermaidDiagnostics ? (
            <div className="pointer-events-none absolute left-4 right-4 top-16 z-40 flex justify-center">
              <div className="pointer-events-auto w-full max-w-2xl">
                <MermaidDiagnosticsBanner
                  snapshot={mermaidDiagnostics}
                  actionLabel={canRecoverMermaidSource ? 'Open Mermaid code' : undefined}
                  onAction={canRecoverMermaidSource ? () => flowEditorController.openStudioCode('mermaid') : undefined}
                />
              </div>
            </div>
          ) : null}
          <FlowEditorChrome
            pages={pages}
            activePageId={activePageId}
            topNav={flowEditorController.chrome.topNav}
            canvas={
              <FlowCanvas
                recordHistory={recordHistory}
                isSelectMode={isSelectMode}
                onCanvasEntityIntent={flowEditorController.handleCanvasEntityIntent}
              />
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
                importRecoveryState.report.source === 'mermaid' && canRecoverMermaidSource
                  ? 'Open Mermaid code'
                  : undefined
              }
              onAction={
                importRecoveryState.report.source === 'mermaid' && canRecoverMermaidSource
                  ? () => flowEditorController.openStudioCode('mermaid')
                  : undefined
              }
            />
          ) : null}
        </div>
      </ArchitectureLintProvider>
    </DiagramDiffProvider>
  );
}
