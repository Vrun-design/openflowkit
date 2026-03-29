import { useCallback, useRef } from 'react';
import { createLogger } from '@/lib/logger';
import { useReactFlow } from '@/lib/reactflowCompat';
import { toPng, toJpeg, toSvg } from 'html-to-image';
import { useCinematicExportActions } from '@/context/CinematicExportContext';
import { useFlowStore } from '../store';
import { useCanvasActions, useCanvasState } from '@/store/canvasHooks';
import { useActiveTabId, useTabActions } from '@/store/tabHooks';
import { useViewSettings } from '@/store/viewHooks';
import {
  getAnimatedExportFileExtension,
  selectSupportedVideoMimeType,
} from '@/services/animatedExport';
import {
  buildCinematicBuildPlan,
  type CinematicExportKind,
} from '@/services/export/cinematicBuildPlan';
import {
  buildCinematicTimeline,
  getCinematicExportPreset,
  resolveCinematicRenderState,
} from '@/services/export/cinematicRenderState';
import {
  CINEMATIC_EXPORT_FALLBACK_COLOR,
  paintCinematicExportBackground,
} from '@/services/export/cinematicExportTheme';
import { useToast } from '../components/ui/ToastContext';
import { resolveFlowExportViewport } from './flowExportViewport';
import { notifyOperationOutcome } from '@/services/operationFeedback';
import { createPdfFromJpeg } from '@/services/export/pdfDocument';
import { buildExportFileName } from '@/lib/exportFileName';
import {
  copyDataUrlToClipboard,
  createDownload,
  createExportOptions,
  createStreamingGifEncoder,
  decodeSingleFrame,
  encodeVideoFromFrames,
  waitForExportRender,
  type CapturedFrame,
} from './flow-export/exportCapture';
import {
  buildDiagramDocumentJson,
  importDiagramDocumentJson,
} from './flow-export/diagramDocumentTransfer';

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
  const { setRenderState, resetRenderState } = useCinematicExportActions();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const exportBaseName = activeTab?.name;

  const handleExport = useCallback(
    (format: 'png' | 'jpeg' = 'png') => {
      const { viewport: flowViewport, message } = resolveFlowExportViewport(
        reactFlowWrapper.current
      );
      if (!flowViewport) {
        addToast(message ?? 'The canvas viewport could not be found.', 'error');
        return;
      }

      reactFlowWrapper.current.classList.add('exporting');
      addToast(`Preparing ${format.toUpperCase()} download…`, 'info');

      setTimeout(() => {
        const { options } = createExportOptions(nodes, format);

        const exportPromise =
          format === 'png' ? toPng(flowViewport, options) : toJpeg(flowViewport, options);

        exportPromise
          .then((dataUrl) => {
            const link = document.createElement('a');
            link.download = buildExportFileName(exportBaseName, format === 'jpeg' ? 'jpg' : 'png');
            link.href = dataUrl;
            link.click();
            addToast(`Diagram exported as ${format.toUpperCase()}!`, 'success');
          })
          .catch((err) => {
            logger.error('Export failed.', { error: err, format });
            addToast('Failed to export. Please try again.', 'error');
          })
          .finally(() => {
            reactFlowWrapper.current?.classList.remove('exporting');
          });
      }, 300);
    },
    [nodes, reactFlowWrapper, addToast, exportBaseName]
  );

  const handleCopyImage = useCallback(
    (format: 'png' | 'jpeg' = 'png') => {
      const { viewport: flowViewport, message } = resolveFlowExportViewport(
        reactFlowWrapper.current
      );
      if (!flowViewport) {
        addToast(message ?? 'The canvas viewport could not be found.', 'error');
        return;
      }

      reactFlowWrapper.current.classList.add('exporting');
      addToast(`Preparing ${format.toUpperCase()} copy…`, 'info');

      setTimeout(() => {
        const { options } = createExportOptions(nodes, format);
        const exportPromise =
          format === 'png' ? toPng(flowViewport, options) : toJpeg(flowViewport, options);

        exportPromise
          .then(async (dataUrl) => {
            await copyDataUrlToClipboard(dataUrl);
            addToast(`Diagram copied as ${format.toUpperCase()}!`, 'success');
          })
          .catch((err) => {
            logger.error('Clipboard image export failed.', { error: err, format });
            addToast('Failed to copy image. Please try again.', 'error');
          })
          .finally(() => {
            reactFlowWrapper.current?.classList.remove('exporting');
          });
      }, 300);
    },
    [nodes, reactFlowWrapper, addToast]
  );

  const handleSvgExport = useCallback(() => {
    const { viewport: flowViewport, message } = resolveFlowExportViewport(reactFlowWrapper.current);
    if (!flowViewport) {
      addToast(message ?? 'The canvas viewport could not be found.', 'error');
      return;
    }

    reactFlowWrapper.current.classList.add('exporting');
    addToast('Preparing SVG download…', 'info');

    setTimeout(() => {
      const { options } = createExportOptions(nodes, 'png');

      toSvg(flowViewport, { ...options, backgroundColor: null })
        .then((dataUrl) => {
          const link = document.createElement('a');
          link.download = buildExportFileName(exportBaseName, 'svg');
          link.href = dataUrl;
          link.click();
          addToast('Diagram exported as SVG!', 'success');
        })
        .catch((err) => {
          logger.error('SVG export failed.', { error: err });
          addToast('Failed to export SVG. Please try again.', 'error');
        })
        .finally(() => {
          reactFlowWrapper.current?.classList.remove('exporting');
        });
    }, 300);
  }, [nodes, reactFlowWrapper, addToast, exportBaseName]);

  const handleCopySvg = useCallback(() => {
    const { viewport: flowViewport, message } = resolveFlowExportViewport(reactFlowWrapper.current);
    if (!flowViewport) {
      addToast(message ?? 'The canvas viewport could not be found.', 'error');
      return;
    }

    reactFlowWrapper.current.classList.add('exporting');
    addToast('Preparing SVG copy…', 'info');

    setTimeout(() => {
      const { options } = createExportOptions(nodes, 'png');

      toSvg(flowViewport, { ...options, backgroundColor: null })
        .then(async (dataUrl) => {
          await copyDataUrlToClipboard(dataUrl);
          addToast('Diagram copied as SVG!', 'success');
        })
        .catch((err) => {
          logger.error('SVG clipboard export failed.', { error: err });
          addToast('Failed to copy SVG. Please try again.', 'error');
        })
        .finally(() => {
          reactFlowWrapper.current?.classList.remove('exporting');
        });
    }, 300);
  }, [nodes, reactFlowWrapper, addToast]);

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

  const handleCinematicExport = useCallback(
    async (kind: CinematicExportKind) => {
      if (!reactFlowWrapper.current) {
        addToast('Canvas viewport not found.', 'error');
        return;
      }

      const { viewport: flowViewport, message } = resolveFlowExportViewport(
        reactFlowWrapper.current
      );
      if (!flowViewport) {
        addToast(message ?? 'The canvas viewport could not be found.', 'error');
        return;
      }

      if (nodes.length === 0) {
        addToast('Add nodes before exporting a cinematic build animation.', 'error');
        return;
      }

      const plan = buildCinematicBuildPlan(nodes, edges);
      if (plan.segments.length === 0) {
        addToast('Could not build a cinematic export sequence.', 'error');
        return;
      }

      const preset = getCinematicExportPreset(kind);
      const timeline = buildCinematicTimeline(plan, preset);

      reactFlowWrapper.current.classList.add('exporting');
      addToast(
        kind === 'cinematic-gif' ? 'Rendering cinematic GIF…' : 'Rendering cinematic video…',
        'info'
      );

      try {
        const frameOptions = createExportOptions(nodes, 'png', {
          maxDimension: timeline.preset.maxDimension,
          pixelRatio: timeline.preset.pixelRatio,
        }).options;
        const { width, height } = createExportOptions(nodes, 'png', {
          maxDimension: timeline.preset.maxDimension,
          pixelRatio: timeline.preset.pixelRatio,
        });
        const frameDurationMs = Math.max(1, Math.round(1000 / timeline.preset.fps));

        animatedPlayback.stopPlayback();

        const captureFrame = async (): Promise<string> =>
          toPng(flowViewport, {
            ...frameOptions,
            backgroundColor: CINEMATIC_EXPORT_FALLBACK_COLOR,
            cacheBust: true,
          });

        if (kind === 'cinematic-gif') {
          const gifEncoder = createStreamingGifEncoder(
            width,
            height,
            paintCinematicExportBackground
          );

          for (let timeMs = 0; timeMs < timeline.totalDurationMs; timeMs += frameDurationMs) {
            setRenderState(resolveCinematicRenderState(timeline, edges, timeMs));
            await waitForExportRender(8);
            const dataUrl = await captureFrame();
            await gifEncoder.addFrame(dataUrl, frameDurationMs);
          }

          setRenderState(resolveCinematicRenderState(timeline, edges, timeline.totalDurationMs));
          await waitForExportRender(8);
          const finalDataUrl = await captureFrame();
          await gifEncoder.addFrame(
            finalDataUrl,
            Math.max(frameDurationMs, timeline.preset.finalHoldMs)
          );

          const blob = gifEncoder.finish();
          createDownload(
            blob,
            buildExportFileName(exportBaseName ?? 'openflowkit-cinematic-build', 'gif')
          );
          addToast('Cinematic build GIF exported.', 'success');
          return;
        }

        const mimeType = selectSupportedVideoMimeType(window.MediaRecorder);
        if (!mimeType) {
          throw new Error(
            'This browser does not support local video recording for cinematic export.'
          );
        }

        const decodedFrames: Array<{ frame: CapturedFrame; image: CanvasImageSource }> = [];

        for (let timeMs = 0; timeMs < timeline.totalDurationMs; timeMs += frameDurationMs) {
          setRenderState(resolveCinematicRenderState(timeline, edges, timeMs));
          await waitForExportRender(8);
          const dataUrl = await captureFrame();
          const image = await decodeSingleFrame(dataUrl);
          decodedFrames.push({ frame: { dataUrl, delayMs: frameDurationMs }, image });
        }

        setRenderState(resolveCinematicRenderState(timeline, edges, timeline.totalDurationMs));
        await waitForExportRender(8);
        const finalUrl = await captureFrame();
        const finalImage = await decodeSingleFrame(finalUrl);
        decodedFrames.push({
          frame: {
            dataUrl: finalUrl,
            delayMs: Math.max(frameDurationMs, timeline.preset.finalHoldMs),
          },
          image: finalImage,
        });

        const blob = await encodeVideoFromFrames({
          frames: decodedFrames,
          width,
          height,
          fps: timeline.preset.fps,
          mimeType,
          backgroundPainter: paintCinematicExportBackground,
        });
        const extension = getAnimatedExportFileExtension(mimeType);
        createDownload(
          blob,
          buildExportFileName(exportBaseName ?? 'openflowkit-cinematic-build', extension)
        );
        addToast(`Cinematic build ${extension.toUpperCase()} exported.`, 'success');
      } catch (error) {
        const exportMessage = error instanceof Error ? error.message : 'Cinematic export failed.';
        logger.error('Cinematic export failed.', { error, kind });
        addToast(exportMessage, 'error');
      } finally {
        resetRenderState();
        reactFlowWrapper.current?.classList.remove('exporting');
      }
    },
    [
      addToast,
      animatedPlayback,
      edges,
      exportBaseName,
      nodes,
      reactFlowWrapper,
      resetRenderState,
      setRenderState,
    ]
  );

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
