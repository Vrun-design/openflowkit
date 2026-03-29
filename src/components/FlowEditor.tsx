import React from 'react';
import '@xyflow/react/dist/style.css';
import { FlowCanvas } from './FlowCanvas';
import { FlowEditorChrome } from './flow-editor/FlowEditorChrome';
import { useFlowEditorScreenModel } from './flow-editor/useFlowEditorScreenModel';
import { ArchitectureLintProvider } from '@/context/ArchitectureLintContext';
import { useCinematicExportState } from '@/context/CinematicExportContext';
import { DiagramDiffProvider } from '@/context/DiagramDiffContext';
import { ShareEmbedModal } from '@/components/ShareEmbedModal';

const CINEMATIC_EXPORT_BACKGROUND =
  'radial-gradient(circle at top, rgba(59,130,246,0.14), transparent 42%), linear-gradient(180deg, #f8fbff 0%, #eef5ff 52%, #f8fafc 100%)';

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
    onFileImport,
    shareViewerUrl,
    clearShareViewerUrl,
    collaborationEnabled,
    remotePresence,
    collaborationNodePositions,
    isLayouting,
    flowEditorController,
    t,
  } = useFlowEditorScreenModel({ onGoHome });

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
              ? CINEMATIC_EXPORT_BACKGROUND
              : 'var(--brand-background)',
          }}
        >
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
        </div>
      </ArchitectureLintProvider>
    </DiagramDiffProvider>
  );
}
