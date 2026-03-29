import { useCallback, useRef } from 'react';
import { createLogger } from '@/lib/logger';
import { useReactFlow } from '@/lib/reactflowCompat';
import { toJpeg } from 'html-to-image';
import { useFlowStore } from '../store';
import { useCanvasActions, useCanvasState } from '@/store/canvasHooks';
import { useActiveTabId, useTabActions } from '@/store/tabHooks';
import { useViewSettings } from '@/store/viewHooks';
import { useToast } from '../components/ui/ToastContext';
import { resolveFlowExportViewport } from './flowExportViewport';
import { notifyOperationOutcome } from '@/services/operationFeedback';
import { createPdfFromJpeg } from '@/services/export/pdfDocument';
import { buildExportFileName } from '@/lib/exportFileName';
import { createDownload, createExportOptions } from './flow-export/exportCapture';
import {
  buildDiagramDocumentJson,
  importDiagramDocumentJson,
} from './flow-export/diagramDocumentTransfer';
import { useStaticExport } from './useStaticExport';
import { useCinematicExport } from './useCinematicExport';

const logger = createLogger({ scope: 'useFlowExport' });

interface AnimatedPlaybackControls {
  stopPlayback: () => void;
}

export const useFlowExport = (
  recordHistory: () => void,
  reactFlowWrapper: React.RefObject<HTMLDivElement>,
  animatedPlayback: AnimatedPlaybackControls
) => {
  const tabs = useFlowStore((state) => state.tabs);
  const { nodes, edges } = useCanvasState();
  const { setNodes, setEdges } = useCanvasActions();
  const viewSettings = useViewSettings();
  const activeTabId = useActiveTabId();
  const { updateTab } = useTabActions();
  const { fitView } = useReactFlow();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const exportBaseName = activeTab?.name;

  const { handleExport, handleCopyImage, handleSvgExport, handleCopySvg } = useStaticExport(
    nodes,
    reactFlowWrapper,
    addToast,
    exportBaseName
  );
  const { handleCinematicExport } = useCinematicExport({
    nodes,
    edges,
    reactFlowWrapper,
    animatedPlayback,
    addToast,
    exportBaseName,
  });

  const handlePdfExport = useCallback(() => {
    const { viewport: flowViewport, message } = resolveFlowExportViewport(reactFlowWrapper.current);
    if (!flowViewport) {
      addToast(message ?? 'The canvas viewport could not be found.', 'error');
      return;
    }

    reactFlowWrapper.current.classList.add('exporting');
    addToast('Preparing PDF download…', 'info');

    setTimeout(() => {
      const { width, height, options } = createExportOptions(nodes, 'jpeg');

      toJpeg(flowViewport, options)
        .then((jpegDataUrl) => {
          const pdfBlob = createPdfFromJpeg({
            jpegDataUrl,
            width,
            height,
            title: 'OpenFlowKit Diagram',
          });
          createDownload(pdfBlob, buildExportFileName(exportBaseName, 'pdf'));
          addToast('Diagram exported as PDF!', 'success');
        })
        .catch((err) => {
          logger.error('PDF export failed.', { error: err });
          addToast('Failed to export PDF. Please try again.', 'error');
        })
        .finally(() => {
          reactFlowWrapper.current?.classList.remove('exporting');
        });
    }, 300);
  }, [nodes, reactFlowWrapper, addToast, exportBaseName]);

  // --- JSON Export ---
  const handleExportJSON = useCallback(() => {
    addToast('Preparing JSON download…', 'info');
    const documentJson = buildDiagramDocumentJson({
      nodes,
      edges,
      exportSerializationMode: viewSettings.exportSerializationMode,
      activeTab,
    });
    const blob = new Blob([documentJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = buildExportFileName(exportBaseName, 'json');
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    addToast('Diagram JSON downloaded!', 'success');
  }, [nodes, edges, viewSettings.exportSerializationMode, activeTab, addToast, exportBaseName]);

  const handleCopyJSON = useCallback(async () => {
    addToast('Preparing JSON copy…', 'info');
    const documentJson = buildDiagramDocumentJson({
      nodes,
      edges,
      exportSerializationMode: viewSettings.exportSerializationMode,
      activeTab,
    });

    try {
      await navigator.clipboard.writeText(documentJson);
      addToast('Diagram JSON copied to clipboard!', 'success');
    } catch (error) {
      logger.error('JSON clipboard export failed.', { error });
      addToast('Failed to copy JSON. Please try again.', 'error');
    }
  }, [nodes, edges, viewSettings.exportSerializationMode, activeTab, addToast]);

  // --- JSON Import ---
  const handleImportJSON = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const importStart = performance.now();
        void (async () => {
          const result = await importDiagramDocumentJson({
            json: ev.target?.result as string,
            importStart,
          });

          if (result.ok) {
            recordHistory();
            setNodes(result.nodes);
            setEdges(result.edges);
            updateTab(activeTabId, { diagramType: result.diagramType, playback: result.playback });
            result.warnings.forEach((message) => addToast(message, 'warning'));
            notifyOperationOutcome(addToast, result.outcome);
            setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 100);
            return;
          }

          notifyOperationOutcome(addToast, result.outcome);
        })();
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [recordHistory, setNodes, setEdges, fitView, addToast, activeTabId, updateTab]
  );

  return {
    fileInputRef,
    handleExport,
    handleCopyImage,
    handleSvgExport,
    handleCopySvg,
    handlePdfExport,
    handleCinematicExport,
    handleExportJSON,
    handleCopyJSON,
    handleImportJSON,
    onFileImport,
  };
};
