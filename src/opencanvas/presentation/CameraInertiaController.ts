import type { Vector2d } from '../domain/geometry/types';
import {
  createBrowserCameraFrameScheduler,
  type CameraFrameScheduler,
} from './CameraMotionController';

export interface CameraInertiaOptions {
  readonly reducedMotion?: boolean;
  readonly decayPerMs?: number;
  readonly maxDurationMs?: number;
  readonly minSpeed?: number;
}

const DEFAULT_DECAY_PER_MS = 0.012;
const DEFAULT_MAX_DURATION_MS = 700;
const DEFAULT_MIN_SPEED = 0.015;
const MAX_START_SPEED = 3;

function clampVelocity(velocity: Vector2d): Vector2d {
  const speed = Math.hypot(velocity.x, velocity.y);
  if (speed <= MAX_START_SPEED) return velocity;
  const scale = MAX_START_SPEED / speed;
  return { x: velocity.x * scale, y: velocity.y * scale };
}

export class CameraInertiaController {
  private frameId: number | null = null;

  constructor(
    private readonly scheduler: CameraFrameScheduler = createBrowserCameraFrameScheduler()
  ) {}

  start(
    initialVelocity: Vector2d,
    applyDelta: (delta: Vector2d) => void,
    options: CameraInertiaOptions = {}
  ): void {
    this.cancel();
    const velocity = clampVelocity(initialVelocity);
    const minSpeed = options.minSpeed ?? DEFAULT_MIN_SPEED;
    if (options.reducedMotion || Math.hypot(velocity.x, velocity.y) < minSpeed) return;

    const decay = Math.max(Number.EPSILON, options.decayPerMs ?? DEFAULT_DECAY_PER_MS);
    const maxDuration = Math.max(1, options.maxDurationMs ?? DEFAULT_MAX_DURATION_MS);
    const startedAt = this.scheduler.now();
    let previous = { x: 0, y: 0 };
    const tick = (timestamp: number): void => {
      const elapsed = Math.min(maxDuration, Math.max(0, timestamp - startedAt));
      const distanceFactor = (1 - Math.exp(-decay * elapsed)) / decay;
      const current = {
        x: velocity.x * distanceFactor,
        y: velocity.y * distanceFactor,
      };
      applyDelta({ x: current.x - previous.x, y: current.y - previous.y });
      previous = current;
      const currentSpeed = Math.hypot(velocity.x, velocity.y) * Math.exp(-decay * elapsed);
      if (elapsed < maxDuration && currentSpeed >= minSpeed) {
        this.frameId = this.scheduler.request(tick);
      } else {
        this.frameId = null;
      }
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
