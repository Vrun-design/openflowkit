import { describe, expect, it, vi } from 'vitest';
import type { CameraFrameScheduler } from './CameraMotionController';
import { CameraInertiaController } from './CameraInertiaController';

function createScheduler() {
  let callback: FrameRequestCallback | null = null;
  const scheduler: CameraFrameScheduler = {
    now: () => 0,
    request: vi.fn((next) => { callback = next; return 9; }),
    cancel: vi.fn(),
  };
  return {
    scheduler,
    advance(timestamp: number) {
      const next = callback;
      callback = null;
      next?.(timestamp);
    },
  };
}

describe('CameraInertiaController', () => {
  it('integrates exponential decay independent of frame spacing', () => {
    const frames = createScheduler();
    const deltas: { x: number; y: number }[] = [];
    const controller = new CameraInertiaController(frames.scheduler);
    controller.start({ x: 1, y: 0 }, (delta) => deltas.push(delta), {
      decayPerMs: 0.01,
      maxDurationMs: 100,
      minSpeed: 0,
    });
    frames.advance(40);
    frames.advance(100);
    expect(deltas.reduce((sum, delta) => sum + delta.x, 0))
      .toBeCloseTo((1 - Math.exp(-1)) / 0.01);
    expect(controller.running).toBe(false);
  });

  it('cancels pending momentum exactly', () => {
    const frames = createScheduler();
    const controller = new CameraInertiaController(frames.scheduler);
    controller.start({ x: 1, y: 1 }, vi.fn());
    controller.cancel();
    expect(frames.scheduler.cancel).toHaveBeenCalledWith(9);
    expect(controller.running).toBe(false);
  });

  it('skips frames for reduced motion and negligible release speed', () => {
    const frames = createScheduler();
    const controller = new CameraInertiaController(frames.scheduler);
    controller.start({ x: 2, y: 0 }, vi.fn(), { reducedMotion: true });
    controller.start({ x: 0.001, y: 0 }, vi.fn());
    expect(frames.scheduler.request).not.toHaveBeenCalled();
  });
});
