import { useCallback } from 'react';
import { toPng } from 'html-to-image';
import { useCinematicExportActions } from '@/context/CinematicExportContext';
import { buildExportFileName } from '@/lib/exportFileName';
import { createLogger } from '@/lib/logger';
import type { FlowEdge, FlowNode } from '@/lib/types';
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
import {
  createDownload,
  createExportOptions,
  createStreamingGifEncoder,
  decodeSingleFrame,
  encodeVideoFromFrames,
  waitForExportRender,
  type CapturedFrame,
} from './flow-export/exportCapture';
import { resolveFlowExportViewport } from './flowExportViewport';

const logger = createLogger({ scope: 'useCinematicExport' });

interface AnimatedPlaybackControls {
  stopPlayback: () => void;
}

interface UseCinematicExportParams {
  nodes: FlowNode[];
  edges: FlowEdge[];
  reactFlowWrapper: React.RefObject<HTMLDivElement>;
  animatedPlayback: AnimatedPlaybackControls;
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  exportBaseName: string | undefined;
}

export function useCinematicExport({
  nodes,
  edges,
  reactFlowWrapper,
  animatedPlayback,
  addToast,
  exportBaseName,
}: UseCinematicExportParams): {
  handleCinematicExport: (kind: CinematicExportKind) => Promise<void>;
} {
  const { setRenderState, resetRenderState } = useCinematicExportActions();

  const handleCinematicExport = useCallback(
    async (kind: CinematicExportKind): Promise<void> => {
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

  return { handleCinematicExport };
}
