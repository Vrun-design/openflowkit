import { useCallback } from 'react';
import { toPng } from 'html-to-image';
import {
  useCinematicExportActions,
  useCinematicExportJobState,
} from '@/context/CinematicExportContext';
import { useTheme } from '@/context/ThemeContext';
import { buildExportFileName } from '@/lib/exportFileName';
import { createLogger } from '@/lib/logger';
import type { FlowEdge, FlowNode } from '@/lib/types';
import {
  getAnimatedExportFileExtension,
  selectSupportedVideoMimeType,
} from '@/services/animatedExport';
import {
  type CinematicExportRequest,
} from '@/services/export/cinematicExport';
import { buildCinematicBuildPlan } from '@/services/export/cinematicBuildPlan';
import {
  buildCinematicTimeline,
  getCinematicExportPreset,
  resolveCinematicRenderState,
} from '@/services/export/cinematicRenderState';
import {
  paintCinematicExportBackground,
  resolveCinematicExportTheme,
} from '@/services/export/cinematicExportTheme';
import {
  createDownload,
  createExportOptions,
  decodeSingleFrameWithSignal,
  encodeVideoFromFrames,
  waitForExportRender,
} from './flow-export/exportCapture';
import { resolveFlowExportViewport } from './flowExportViewport';

const logger = createLogger({ scope: 'useCinematicExport' });
const PREPARING_PROGRESS = 4;
const CAPTURING_PROGRESS_START = 8;
const CAPTURING_PROGRESS_END = 72;
const ENCODING_PROGRESS_START = 76;
const ENCODING_PROGRESS_END = 96;
const FINALIZING_PROGRESS = 98;
const RESET_DELAY_MS = 250;

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

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function buildFrameTimes(totalDurationMs: number, frameDurationMs: number): number[] {
  const frameTimes: number[] = [];
  for (let timeMs = 0; timeMs < totalDurationMs; timeMs += frameDurationMs) {
    frameTimes.push(timeMs);
  }
  return frameTimes;
}

function buildExportRequest(
  request: CinematicExportRequest,
  resolvedTheme: ReturnType<typeof useTheme>['resolvedTheme']
): CinematicExportRequest {
  return {
    ...request,
    themeMode: request.themeMode ?? resolvedTheme,
  };
}

function getProgressPercent(
  completedFrames: number,
  totalFrames: number,
  start: number,
  end: number
): number {
  if (totalFrames <= 0) {
    return end;
  }

  const progress = completedFrames / totalFrames;
  return Math.round(start + (end - start) * progress);
}

export function useCinematicExport({
  nodes,
  edges,
  reactFlowWrapper,
  animatedPlayback,
  addToast,
  exportBaseName,
}: UseCinematicExportParams): {
  handleCinematicExport: (request: CinematicExportRequest) => Promise<void>;
} {
  const { resolvedTheme } = useTheme();
  const jobState = useCinematicExportJobState();
  const {
    setRenderState,
    resetRenderState,
    setJobState,
    resetJobState,
    registerCancelHandler,
  } = useCinematicExportActions();

  const handleCinematicExport = useCallback(
    async (incomingRequest: CinematicExportRequest): Promise<void> => {
      if (jobState.status !== 'idle') {
        addToast('A cinematic export is already running.', 'info');
        return;
      }

      if (!reactFlowWrapper.current) {
        addToast('Canvas viewport not found.', 'error');
        return;
      }

      const request = buildExportRequest(incomingRequest, resolvedTheme);

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

      const preset = getCinematicExportPreset(request);
      const timeline = buildCinematicTimeline(plan, preset);
      const abortController = new AbortController();
      const exportTheme = resolveCinematicExportTheme(request.themeMode);

      if (request.resolution === '4k' && plan.segments.length > 80) {
        addToast(
          '4K cinematic export may take longer on larger diagrams. You can switch to 1080p for faster output.',
          'warning'
        );
      }

      reactFlowWrapper.current.classList.add('exporting');
      registerCancelHandler(() => abortController.abort());
      setJobState({
        status: 'preparing',
        progressPercent: PREPARING_PROGRESS,
        completedFrames: 0,
        totalFrames: 0,
        stageLabel: 'Preparing cinematic export…',
        canCancel: true,
        request,
      });

      try {
        const exportCapture = createExportOptions(nodes, 'png', {
          maxDimension: timeline.preset.maxDimension,
          pixelRatio: timeline.preset.pixelRatio,
        });
        const frameDurationMs = Math.max(1, Math.round(1000 / timeline.preset.fps));
        const frameTimes = buildFrameTimes(timeline.totalDurationMs, frameDurationMs);
        const totalCaptureFrames = frameTimes.length + 1;

        animatedPlayback.stopPlayback();

        const captureFrame = async (): Promise<string> =>
          toPng(flowViewport, {
            ...exportCapture.options,
            backgroundColor: exportTheme.fallbackColor,
            cacheBust: true,
          });

        const decodedFrames: Array<{
          frame: { dataUrl: string; delayMs: number };
          image: CanvasImageSource;
        }> = [];

        setJobState((current) => ({
          ...current,
          status: 'capturing',
          progressPercent: CAPTURING_PROGRESS_START,
          totalFrames: totalCaptureFrames,
          stageLabel: 'Capturing frames…',
        }));

        for (const [frameIndex, timeMs] of frameTimes.entries()) {
          setRenderState(resolveCinematicRenderState(timeline, edges, timeMs, request.themeMode));
          await waitForExportRender(8, abortController.signal);
          const dataUrl = await captureFrame();
          const image = await decodeSingleFrameWithSignal(dataUrl, abortController.signal);
          decodedFrames.push({ frame: { dataUrl, delayMs: frameDurationMs }, image });

          const completedFrames = frameIndex + 1;
          setJobState((current) => ({
            ...current,
            status: 'capturing',
            completedFrames,
            totalFrames: totalCaptureFrames,
            stageLabel: 'Capturing frames…',
            progressPercent: getProgressPercent(
              completedFrames,
              totalCaptureFrames,
              CAPTURING_PROGRESS_START,
              CAPTURING_PROGRESS_END
            ),
          }));
        }

        setRenderState(
          resolveCinematicRenderState(
            timeline,
            edges,
            timeline.totalDurationMs,
            request.themeMode
          )
        );
        await waitForExportRender(8, abortController.signal);
        const finalUrl = await captureFrame();
        const finalImage = await decodeSingleFrameWithSignal(finalUrl, abortController.signal);
        decodedFrames.push({
          frame: {
            dataUrl: finalUrl,
            delayMs: Math.max(frameDurationMs, timeline.preset.finalHoldMs),
          },
          image: finalImage,
        });

        setJobState((current) => ({
          ...current,
          status: 'encoding',
          completedFrames: 0,
          totalFrames: Math.max(1, decodedFrames.length),
          stageLabel: 'Encoding video…',
          progressPercent: ENCODING_PROGRESS_START,
        }));

        const mimeType = selectSupportedVideoMimeType(window.MediaRecorder);
        if (!mimeType) {
          throw new Error(
            'This browser does not support local video recording for cinematic export.'
          );
        }

        const blob = await encodeVideoFromFrames({
          frames: decodedFrames,
          width: exportCapture.width,
          height: exportCapture.height,
          fps: timeline.preset.fps,
          mimeType,
          signal: abortController.signal,
          backgroundPainter: (context, width, height) =>
            paintCinematicExportBackground(context, width, height, request.themeMode),
          onProgress: ({ completedFrames, totalFrames }) => {
            setJobState((current) => ({
              ...current,
              status: 'encoding',
              completedFrames,
              totalFrames,
              stageLabel: 'Encoding video…',
              progressPercent: getProgressPercent(
                completedFrames,
                totalFrames,
                ENCODING_PROGRESS_START,
                ENCODING_PROGRESS_END
              ),
            }));
          },
        });

        setJobState((current) => ({
          ...current,
          status: 'finalizing',
          progressPercent: FINALIZING_PROGRESS,
          stageLabel: 'Finalizing export…',
        }));

        const extension = getAnimatedExportFileExtension(mimeType);
        createDownload(
          blob,
          buildExportFileName(exportBaseName ?? 'openflowkit-cinematic-build', extension)
        );
        setJobState((current) => ({
          ...current,
          status: 'done',
          progressPercent: 100,
          canCancel: false,
          stageLabel: 'Export complete',
        }));
        addToast(`Cinematic build ${extension.toUpperCase()} exported.`, 'success');
      } catch (error) {
        if (isAbortError(error)) {
          setJobState((current) => ({
            ...current,
            status: 'cancelled',
            canCancel: false,
            stageLabel: 'Export cancelled',
          }));
          addToast('Cinematic export cancelled.', 'info');
          return;
        }

        const exportMessage = error instanceof Error ? error.message : 'Cinematic export failed.';
        logger.error('Cinematic export failed.', { error, request });
        setJobState((current) => ({
          ...current,
          status: 'error',
          canCancel: false,
          stageLabel: exportMessage,
        }));
        addToast(exportMessage, 'error');
      } finally {
        resetRenderState();
        registerCancelHandler(null);
        reactFlowWrapper.current?.classList.remove('exporting');
        window.setTimeout(() => {
          resetJobState();
        }, RESET_DELAY_MS);
      }
    },
    [
      addToast,
      animatedPlayback,
      edges,
      exportBaseName,
      jobState.status,
      nodes,
      reactFlowWrapper,
      registerCancelHandler,
      resetJobState,
      resetRenderState,
      resolvedTheme,
      setJobState,
      setRenderState,
    ]
  );

  return { handleCinematicExport };
}
