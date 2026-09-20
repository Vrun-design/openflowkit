import { foundation } from './design-system/tokens';
import type { CanvasCamera } from '../domain/camera/types';
import { cameraEquals, interpolateCamera } from '../domain/camera/transition';

export interface CameraFrameScheduler {
  readonly now: () => number;
  readonly request: (callback: FrameRequestCallback) => number;
  readonly cancel: (frameId: number) => void;
}

export interface CameraMotionOptions {
  readonly durationMs?: number;
  readonly reducedMotion?: boolean;
}

const DEFAULT_DURATION_MS = foundation.motion.navigation;

export function createBrowserCameraFrameScheduler(): CameraFrameScheduler {
  return {
    now: () => performance.now(),
    request: (callback) => requestAnimationFrame(callback),
    cancel: (frameId) => cancelAnimationFrame(frameId),
  };
}

export class CameraMotionController {
  private frameId: number | null = null;

  constructor(
    private readonly scheduler: CameraFrameScheduler = createBrowserCameraFrameScheduler()
  ) {}

  start(
    from: CanvasCamera,
    to: CanvasCamera,
    apply: (camera: CanvasCamera) => void,
    options: CameraMotionOptions = {}
  ): void {
    this.cancel();
    if (options.reducedMotion || cameraEquals(from, to)) {
      apply(to);
      return;
    }
    const durationMs = Math.max(1, options.durationMs ?? DEFAULT_DURATION_MS);
    const startedAt = this.scheduler.now();
    const tick = (timestamp: number): void => {
      const progress = Math.min(1, Math.max(0, (timestamp - startedAt) / durationMs));
      apply(interpolateCamera(from, to, progress));
      if (progress < 1) this.frameId = this.scheduler.request(tick);
      else this.frameId = null;
    };
    this.frameId = this.scheduler.request(tick);
  }

  cancel(): void {
    if (this.frameId === null) return;
    this.scheduler.cancel(this.frameId);
    this.frameId = null;
  }

  get running(): boolean {
    return this.frameId !== null;
  }
}
