import { describe, expect, it, vi } from 'vitest';
import { CameraMotionController, type CameraFrameScheduler } from './CameraMotionController';

function createScheduler() {
  let callback: FrameRequestCallback | null = null;
  let now = 0;
  const scheduler: CameraFrameScheduler = {
    now: () => now,
    request: vi.fn((next) => { callback = next; return 7; }),
    cancel: vi.fn(),
  };
  return {
    scheduler,
    advance(timestamp: number) {
      now = timestamp;
      const next = callback;
      callback = null;
      next?.(timestamp);
    },
  };
}

describe('CameraMotionController', () => {
  it('applies exact target after bounded animation', () => {
    const frames = createScheduler();
    const apply = vi.fn();
    const controller = new CameraMotionController(frames.scheduler);
    controller.start({ x: 0, y: 0, zoom: 1 }, { x: 40, y: 20, zoom: 2 }, apply, {
      durationMs: 100,
    });
    frames.advance(50);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(controller.running).toBe(true);
    frames.advance(100);
    expect(apply).toHaveBeenLastCalledWith({ x: 40, y: 20, zoom: 2 });
    expect(controller.running).toBe(false);
  });

  it('interrupts old frame before starting replacement motion', () => {
    const frames = createScheduler();
    const controller = new CameraMotionController(frames.scheduler);
    controller.start({ x: 0, y: 0, zoom: 1 }, { x: 1, y: 1, zoom: 2 }, vi.fn());
    controller.start({ x: 0, y: 0, zoom: 1 }, { x: 2, y: 2, zoom: 3 }, vi.fn());
    expect(frames.scheduler.cancel).toHaveBeenCalledWith(7);
  });

  it('applies reduced motion immediately without scheduling', () => {
    const frames = createScheduler();
    const apply = vi.fn();
    const target = { x: 4, y: 5, zoom: 1 };
    new CameraMotionController(frames.scheduler).start(
      { x: 0, y: 0, zoom: 2 }, target, apply, { reducedMotion: true }
    );
    expect(apply).toHaveBeenCalledWith(target);
    expect(frames.scheduler.request).not.toHaveBeenCalled();
  });
});
