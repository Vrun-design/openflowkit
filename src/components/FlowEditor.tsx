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
import { resolveCinematicExportTheme } from '@/services/export/cinematicExportTheme';

interface FlowEditorProps {
  onGoHome: () => void;
}

export function FlowEditor({ onGoHome }: FlowEditorProps) {
  const cinematicExportState = useCinematicExportState();
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
            />
          ) : null}
        </div>
      </ArchitectureLintProvider>
    </DiagramDiffProvider>
  );
}
