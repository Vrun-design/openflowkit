import { useCallback, useRef } from 'react';
import { createLogger } from '@/lib/logger';
import { getCompatibleNodesBounds, useReactFlow } from '@/lib/reactflowCompat';
import { toPng, toJpeg, toSvg } from 'html-to-image';
import { useFlowStore } from '../store';
import { useCanvasActions, useCanvasState } from '@/store/canvasHooks';
import { useActiveTabId, useTabActions } from '@/store/tabHooks';
import { useViewSettings } from '@/store/viewHooks';
import { buildAnimatedExportPlan, getAnimatedExportFileExtension, selectSupportedVideoMimeType, type AnimatedExportKind } from '@/services/animatedExport';
import { buildRevealFrames } from '@/services/export/revealSequencer';
import { orderGraphForSerialization } from '@/services/canonicalSerialization';
import { createDiagramDocument, parseDiagramDocumentImport } from '@/services/diagramDocument';
import { composeDiagramForDisplay } from '@/services/composeDiagramForDisplay';
import { encodeGif } from '@/services/gifEncoder';
import { buildPlaybackSequence, buildPlaybackSequenceFromState } from '@/services/playback/contracts';
import {
  buildImportFidelityReport,
  mapErrorToIssue,
  mapWarningToIssue,
  persistLatestImportReport,
} from '@/services/importFidelity';
import { useToast } from '../components/ui/ToastContext';
import { resolveFlowExportViewport } from './flowExportViewport';
import { createImportReportOutcome, notifyOperationOutcome } from '@/services/operationFeedback';
import { createPdfFromJpeg } from '@/services/export/pdfDocument';

const logger = createLogger({ scope: 'useFlowExport' });

interface AnimatedPlaybackControls {
  jumpToStep: (stepIndex: number) => void;
  stopPlayback: () => void;
  playbackSpeed: number;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function createDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = fileName;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

function createExportOptions(
  nodes: ReturnType<typeof useCanvasState>['nodes'],
  format: 'png' | 'jpeg',
  config?: { maxDimension?: number; pixelRatio?: number }
) {
  const bounds = getCompatibleNodesBounds(nodes);
  const padding = 80;
  const rawWidth = (bounds.width || 800) + padding * 2;
  const rawHeight = (bounds.height || 600) + padding * 2;
  const longestSide = Math.max(rawWidth, rawHeight);
  const maxDimension = config?.maxDimension ?? longestSide;
  const scale = longestSide > maxDimension ? maxDimension / longestSide : 1;
  const width = Math.max(1, Math.round(rawWidth * scale));
  const height = Math.max(1, Math.round(rawHeight * scale));

  return {
    width,
    height,
    options: {
      backgroundColor: format === 'png' ? null : '#ffffff',
      width,
      height,
      style: {
        transform: `translate(${-bounds.x + padding}px, ${-bounds.y + padding}px) scale(${scale})`,
        width: `${rawWidth}px`,
        height: `${rawHeight}px`,
      },
      pixelRatio: config?.pixelRatio ?? 3,
      filter: (node: HTMLElement) => {
        if (node.classList) {
          if (
            node.classList.contains('react-flow__controls') ||
            node.classList.contains('react-flow__minimap') ||
            node.classList.contains('react-flow__attribution') ||
            node.classList.contains('react-flow__background')
          ) {
            return false;
          }
        }
        return true;
      },
    },
  };
}

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to decode exported frame.'));
    image.src = dataUrl;
  });
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

  const handleExport = useCallback((format: 'png' | 'jpeg' = 'png') => {
    const { viewport: flowViewport, message } = resolveFlowExportViewport(reactFlowWrapper.current);
    if (!flowViewport) {
      addToast(message ?? 'The canvas viewport could not be found.', 'error');
      return;
    }

    reactFlowWrapper.current.classList.add('exporting');

    setTimeout(() => {
      const { options } = createExportOptions(nodes, format);

      const exportPromise = format === 'png' ? toPng(flowViewport, options) : toJpeg(flowViewport, options);

      exportPromise
        .then((dataUrl) => {
          const link = document.createElement('a');
          link.download = `openflowkit-diagram.${format === 'jpeg' ? 'jpg' : 'png'}`;
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
  }, [nodes, reactFlowWrapper, addToast]);

  const handleSvgExport = useCallback(() => {
    const { viewport: flowViewport, message } = resolveFlowExportViewport(reactFlowWrapper.current);
    if (!flowViewport) {
      addToast(message ?? 'The canvas viewport could not be found.', 'error');
      return;
    }

    reactFlowWrapper.current.classList.add('exporting');

    setTimeout(() => {
      const { options } = createExportOptions(nodes, 'png');

      toSvg(flowViewport, { ...options, backgroundColor: null })
        .then((dataUrl) => {
          const link = document.createElement('a');
          link.download = 'openflowkit-diagram.svg';
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
  }, [nodes, reactFlowWrapper, addToast]);

  const handlePdfExport = useCallback(() => {
    const { viewport: flowViewport, message } = resolveFlowExportViewport(reactFlowWrapper.current);
    if (!flowViewport) {
      addToast(message ?? 'The canvas viewport could not be found.', 'error');
      return;
    }

    reactFlowWrapper.current.classList.add('exporting');

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
          createDownload(pdfBlob, 'openflowkit-diagram.pdf');
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
  }, [nodes, reactFlowWrapper, addToast]);

  const handleAnimatedExport = useCallback(async (kind: AnimatedExportKind) => {
    const { viewport: flowViewport, message } = resolveFlowExportViewport(reactFlowWrapper.current);
    if (!flowViewport) {
      addToast(message ?? 'Animated export is unavailable because the canvas viewport could not be found.', 'error');
      return;
    }

    if (nodes.length === 0) {
      addToast('Add nodes before exporting a playback animation.', 'error');
      return;
    }

    const sequence = activeTab?.playback
      ? buildPlaybackSequenceFromState(nodes, activeTab.playback, animatedPlayback.playbackSpeed)
      : buildPlaybackSequence(nodes, animatedPlayback.playbackSpeed);

    if (sequence.steps.length === 0) {
      addToast('Playback export needs at least one playback step.', 'error');
      return;
    }

    const { width, height } = createExportOptions(nodes, 'png');
    const plan = buildAnimatedExportPlan({
      kind,
      width,
      height,
      sequence,
    });

    if (kind === 'gif' && plan.estimatedBytes > 12_000_000) {
      addToast('GIF export may be large. Prefer video for longer playback.', 'warning');
    }

    reactFlowWrapper.current.classList.add('exporting');
    addToast(kind === 'gif' ? 'Preparing playback GIF…' : 'Preparing playback video…', 'info');

    try {
      const frameOptions = createExportOptions(nodes, 'png', {
        maxDimension: Math.max(plan.frameWidth, plan.frameHeight),
        pixelRatio: plan.preset.pixelRatio,
      }).options;

      const capturedFrames: Array<{ dataUrl: string; delayMs: number }> = [];
      animatedPlayback.stopPlayback();

      for (let index = 0; index < sequence.steps.length; index += 1) {
        animatedPlayback.jumpToStep(index);
        await wait(140);
        const dataUrl = await toPng(flowViewport, frameOptions);
        capturedFrames.push({
          dataUrl,
          delayMs: sequence.steps[index].durationMs,
        });
      }

      animatedPlayback.stopPlayback();

      if (kind === 'gif') {
        const canvas = document.createElement('canvas');
        canvas.width = plan.frameWidth;
        canvas.height = plan.frameHeight;
        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('Canvas 2D context is unavailable.');
        }

        const gifFrames = [];
        for (const frame of capturedFrames) {
          const image = await loadImage(frame.dataUrl);
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          gifFrames.push({
            imageData: context.getImageData(0, 0, canvas.width, canvas.height),
            delayMs: frame.delayMs,
          });
        }

        const blob = encodeGif(gifFrames);
        createDownload(blob, 'openflowkit-playback.gif');
        addToast('Playback GIF exported.', 'success');
        return;
      }

      const mimeType = selectSupportedVideoMimeType(window.MediaRecorder);
      if (!mimeType) {
        throw new Error('This browser does not support local video recording for playback export.');
      }

      const canvas = document.createElement('canvas');
      canvas.width = plan.frameWidth;
      canvas.height = plan.frameHeight;
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Canvas 2D context is unavailable.');
      }

      const stream = canvas.captureStream(plan.preset.fps);
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      const stopped = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      });

      recorder.start();
      const frameDurationMs = Math.max(1, Math.round(1000 / plan.preset.fps));

      for (const frame of capturedFrames) {
        const image = await loadImage(frame.dataUrl);
        const repeatCount = Math.max(1, Math.round(frame.delayMs / frameDurationMs));
        for (let repeatIndex = 0; repeatIndex < repeatCount; repeatIndex += 1) {
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          await wait(frameDurationMs);
        }
      }

      recorder.stop();
      const blob = await stopped;
      const extension = getAnimatedExportFileExtension(mimeType, 'video');
      createDownload(blob, `openflowkit-playback.${extension}`);
      addToast(`Playback ${extension.toUpperCase()} exported.`, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Animated export failed.';
      logger.error('Animated export failed.', { error, kind });
      addToast(message, 'error');
    } finally {
      animatedPlayback.stopPlayback();
      reactFlowWrapper.current?.classList.remove('exporting');
    }
  }, [activeTab, addToast, animatedPlayback, nodes, reactFlowWrapper]);

  // --- Cinematic Reveal Export ---
  const handleRevealExport = useCallback(async (kind: 'reveal-video' | 'reveal-gif') => {
    const { viewport: flowViewport, message } = resolveFlowExportViewport(reactFlowWrapper.current);
    if (!flowViewport) {
      addToast(message ?? 'Canvas viewport not found.', 'error');
      return;
    }
    if (nodes.length === 0) {
      addToast('Add nodes before exporting a reveal animation.', 'error');
      return;
    }

    const frames = buildRevealFrames(nodes, edges, { fade: true });
    if (frames.length === 0) {
      addToast('Could not build reveal sequence.', 'error');
      return;
    }

    const isGif = kind === 'reveal-gif';
    const { width, height } = createExportOptions(nodes, 'png');

    reactFlowWrapper.current!.classList.add('exporting');
    addToast(isGif ? 'Preparing reveal GIF…' : 'Preparing reveal video…', 'info');

    const originalNodeHidden = new Map(nodes.map((n) => [n.id, n.hidden]));
    const originalNodeStyle = new Map(nodes.map((n) => [n.id, n.style]));
    const originalEdgeHidden = new Map(edges.map((e) => [e.id, e.hidden]));

    try {
      const frameOptions = createExportOptions(nodes, 'png', { maxDimension: 1440, pixelRatio: 1.5 }).options;
      const capturedFrames: Array<{ dataUrl: string; delayMs: number }> = [];

      for (const frame of frames) {
        setNodes((prev) =>
          prev.map((n) => {
            if (!frame.visibleNodeIds.has(n.id)) return { ...n, hidden: true };
            const opacity = frame.fadingNodeIds.has(n.id) ? frame.fadeOpacity : 1;
            return { ...n, hidden: false, style: { ...n.style, opacity, transition: 'none' } };
          })
        );
        setEdges((prev) =>
          prev.map((e) => ({ ...e, hidden: !frame.visibleEdgeIds.has(e.id) }))
        );
        await wait(100);
        const dataUrl = await toPng(flowViewport, frameOptions);
        capturedFrames.push({ dataUrl, delayMs: frame.holdMs });
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable.');

      if (isGif) {
        const gifFrames = [];
        for (const f of capturedFrames) {
          const img = await loadImage(f.dataUrl);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          gifFrames.push({ imageData: ctx.getImageData(0, 0, canvas.width, canvas.height), delayMs: f.delayMs });
        }
        createDownload(encodeGif(gifFrames), 'openflowkit-reveal.gif');
        addToast('Reveal GIF exported.', 'success');
        return;
      }

      const mimeType = selectSupportedVideoMimeType(window.MediaRecorder);
      if (!mimeType) throw new Error('This browser does not support video recording.');

      const stream = canvas.captureStream(12);
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };
      const stopped = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      });

      recorder.start();
      const frameDurationMs = Math.max(1, Math.round(1000 / 12));
      for (const f of capturedFrames) {
        const img = await loadImage(f.dataUrl);
        const repeatCount = Math.max(1, Math.round(f.delayMs / frameDurationMs));
        for (let i = 0; i < repeatCount; i++) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          await wait(frameDurationMs);
        }
      }
      recorder.stop();
      const blob = await stopped;
      const ext = getAnimatedExportFileExtension(mimeType, 'video');
      createDownload(blob, `openflowkit-reveal.${ext}`);
      addToast(`Reveal ${ext.toUpperCase()} exported.`, 'success');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Reveal export failed.';
      logger.error('Reveal export failed.', { error, kind });
      addToast(msg, 'error');
    } finally {
      setNodes((prev) => prev.map((n) => ({ ...n, hidden: originalNodeHidden.get(n.id), style: originalNodeStyle.get(n.id) })));
      setEdges((prev) => prev.map((e) => ({ ...e, hidden: originalEdgeHidden.get(e.id) })));
      reactFlowWrapper.current?.classList.remove('exporting');
    }
  }, [nodes, edges, reactFlowWrapper, addToast, setNodes, setEdges]);

  // --- JSON Export ---
  const handleExportJSON = useCallback(() => {
    const { nodes: orderedNodes, edges: orderedEdges } = orderGraphForSerialization(
      nodes,
      edges,
      viewSettings.exportSerializationMode
    );
    // Use the outer `activeTab` derived from `tabs` — no inner redefinition needed.
    const doc = createDiagramDocument(orderedNodes, orderedEdges, activeTab?.diagramType, {
      playback: activeTab?.playback,
      extendedDocumentModel: Boolean(activeTab?.playback),
    });
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'openflowkit-diagram.json';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, viewSettings.exportSerializationMode, activeTab]);

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
          try {
            const raw = JSON.parse(ev.target?.result as string);
            const parsed = parseDiagramDocumentImport(raw);
            const { nodes: composedNodes, edges: composedEdges } = await composeDiagramForDisplay(
              parsed.nodes,
              parsed.edges,
              {
                diagramType: parsed.diagramType,
              }
            );
            recordHistory();
            setNodes(composedNodes);
            setEdges(composedEdges);
            updateTab(activeTabId, { diagramType: parsed.diagramType, playback: parsed.playback });
            parsed.warnings.forEach((message) => addToast(message, 'warning'));
            const report = buildImportFidelityReport({
              source: 'json',
              nodeCount: composedNodes.length,
              edgeCount: composedEdges.length,
              elapsedMs: Math.round(performance.now() - importStart),
              issues: parsed.warnings.map((warning) => mapWarningToIssue(warning)),
            });
            persistLatestImportReport(report);
            notifyOperationOutcome(addToast, createImportReportOutcome(report, 'Diagram loaded successfully!'));
            setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 100);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to parse JSON file. Please check the format.';
            const report = buildImportFidelityReport({
              source: 'json',
              nodeCount: 0,
              edgeCount: 0,
              elapsedMs: Math.round(performance.now() - importStart),
              issues: [mapErrorToIssue(message)],
            });
            persistLatestImportReport(report);
            notifyOperationOutcome(addToast, createImportReportOutcome(report, message));
          }
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
    handleSvgExport,
    handlePdfExport,
    handleAnimatedExport,
    handleRevealExport,
    handleExportJSON,
    handleImportJSON,
    onFileImport,
  };
};
