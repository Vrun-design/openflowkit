import { describe, expect, it, vi } from 'vitest';
import type { CameraFrameScheduler } from './CameraMotionController';
import { EdgeScrollController } from './EdgeScrollController';

function schedulerFixture(): {
  scheduler: CameraFrameScheduler;
  runFrame: (timestamp: number) => void;
  cancel: ReturnType<typeof vi.fn>;
} {
  let callback: FrameRequestCallback | null = null;
  let frameId = 0;
  const cancel = vi.fn();
  return {
    scheduler: {
      now: () => 0,
      request: (next) => {
        callback = next;
        frameId += 1;
        return frameId;
      },
      cancel,
    },
    runFrame: (timestamp) => {
      const next = callback;
      callback = null;
      next?.(timestamp);
    },
    cancel,
  };
}

describe('EdgeScrollController', () => {
  it('applies bounded frame deltas until canceled', () => {
    const fixture = schedulerFixture();
    const controller = new EdgeScrollController(fixture.scheduler);
    const apply = vi.fn();
    controller.update({ x: 800, y: 300 }, { width: 800, height: 600 }, apply);
    fixture.runFrame(16);
    fixture.runFrame(32);
    expect(apply).toHaveBeenNthCalledWith(1, { x: -11.52, y: 0 });
    expect(apply).toHaveBeenNthCalledWith(2, { x: -11.52, y: 0 });
    controller.cancel();
    expect(controller.running).toBe(false);
    expect(fixture.cancel).toHaveBeenCalled();
  });

  it('stays idle in the safe center and stops when pointer returns', () => {
    const fixture = schedulerFixture();
    const controller = new EdgeScrollController(fixture.scheduler);
    controller.update({ x: 400, y: 300 }, { width: 800, height: 600 }, vi.fn());
    expect(controller.running).toBe(false);
    controller.update({ x: 800, y: 300 }, { width: 800, height: 600 }, vi.fn());
    expect(controller.running).toBe(true);
    controller.update({ x: 400, y: 300 }, { width: 800, height: 600 }, vi.fn());
    expect(controller.running).toBe(false);
  });
});
