import {
  edgeScrollDelta,
  edgeScrollVelocity,
  hasEdgeScrollVelocity,
  type EdgeScrollOptions,
} from '../application/renderer/edgeScroll';
import type { Point2d, Size2d, Vector2d } from '../domain/geometry/types';
import {
  createBrowserCameraFrameScheduler,
  type CameraFrameScheduler,
} from './CameraMotionController';

interface EdgeScrollIntent {
  readonly pointer: Point2d;
  readonly viewport: Size2d;
  readonly apply: (delta: Vector2d) => void;
  readonly options: EdgeScrollOptions;
}

export class EdgeScrollController {
  private frameId: number | null = null;
  private previousFrameAt = 0;
  private intent: EdgeScrollIntent | null = null;

  constructor(
    private readonly scheduler: CameraFrameScheduler = createBrowserCameraFrameScheduler()
  ) {}

  update(
    pointer: Point2d,
    viewport: Size2d,
    apply: (delta: Vector2d) => void,
    options: EdgeScrollOptions = {}
  ): void {
    const velocity = edgeScrollVelocity(pointer, viewport, options);
    if (!hasEdgeScrollVelocity(velocity)) {
      this.cancel();
      return;
    }
    this.intent = { pointer, viewport, apply, options };
    if (this.frameId !== null) return;
    this.previousFrameAt = this.scheduler.now();
    this.frameId = this.scheduler.request(this.tick);
  }

  cancel(): void {
    if (this.frameId !== null) this.scheduler.cancel(this.frameId);
    this.frameId = null;
    this.intent = null;
  }

  get running(): boolean {
    return this.frameId !== null;
  }

  private readonly tick = (timestamp: number): void => {
    const intent = this.intent;
    if (!intent) {
      this.frameId = null;
      return;
    }
    const velocity = edgeScrollVelocity(intent.pointer, intent.viewport, intent.options);
    const delta = edgeScrollDelta(velocity, timestamp - this.previousFrameAt, intent.options);
    this.previousFrameAt = timestamp;
    intent.apply(delta);
    if (this.intent !== intent) return;
    this.frameId = this.scheduler.request(this.tick);
  };
}
