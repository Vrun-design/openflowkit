import { describe, expect, it } from 'vitest';
import { cameraFitMatrix, interpolateBounds } from './camera';
import { cameraAt, GLIDE_MS, stepRuns, STEP_MS, timelineDuration } from './frame';
import { animNode, animPage } from './testFixtures';
import type { Timeline } from './types';

const VIEW_BOX = { x: 0, y: 0, width: 1000, height: 500 };

describe('cameraFitMatrix', () => {
  it('fits a box to the viewBox uniformly and centres it', () => {
    const matrix = cameraFitMatrix({ x: 0, y: 0, width: 500, height: 500 }, VIEW_BOX);
    expect(matrix).toEqual({ a: 1, b: 0, c: 0, d: 1, tx: 250, ty: 0 });
  });

  it('keeps the camera box aspect when the viewBox is wider', () => {
    const matrix = cameraFitMatrix({ x: 100, y: 100, width: 200, height: 200 }, VIEW_BOX);
    expect(matrix.a).toBe(2.5);
    expect(matrix.tx).toBe(1000 / 2 - 200 * 2.5 / 2 - 2.5 * 100);
    expect(matrix.ty).toBe(250 - 200 * 2.5 / 2 - 2.5 * 100);
  });

  it('falls back to the viewBox size when a camera box has none', () => {
    const matrix = cameraFitMatrix({ x: 10, y: 10, width: 0, height: 0 }, VIEW_BOX);
    expect(matrix).toEqual({ a: 1, b: 0, c: 0, d: 1, tx: -10, ty: -10 });
  });
});

describe('interpolateBounds', () => {
  it('mixes every edge', () => {
    expect(interpolateBounds({ x: 0, y: 0, width: 100, height: 50 }, { x: 200, y: 100, width: 300, height: 150 }, 0.5))
      .toEqual({ x: 100, y: 50, width: 200, height: 100 });
  });
});

describe('stepRuns', () => {
  it('collapses adjacent indexes and keeps gaps apart', () => {
    expect(stepRuns([0, 1, 2, 5, 7, 8])).toEqual([[0, 2], [5, 5], [7, 8]]);
    expect(stepRuns([])).toEqual([]);
  });
});

describe('cameraAt', () => {
  const page = animPage([animNode('a', 0, 0)]);
  const timeline: Timeline = {
    preset: 'walkthrough',
    loop: false,
    durationMs: 2 * STEP_MS,
    steps: [
      { nodeIds: ['a'], connectorIds: [], camera: { x: 0, y: 0, width: 100, height: 100 } },
      { nodeIds: [], connectorIds: [], camera: { x: 400, y: 400, width: 200, height: 200 } },
    ],
  };

  it('is null for presets that never move the camera', () => {
    expect(cameraAt({ ...timeline, preset: 'build' }, 0)).toBeNull();
    expect(cameraAt({ ...timeline, preset: 'pulse' }, 0)).toBeNull();
    void page;
  });

  it('holds the first step camera before the glide starts', () => {
    expect(cameraAt(timeline, 0)).toEqual({ x: 0, y: 0, width: 100, height: 100 });
  });

  it('glides into the next step camera over GLIDE_MS', () => {
    const mid = cameraAt(timeline, STEP_MS + GLIDE_MS / 2)!;
    expect(mid.x).toBeGreaterThan(0);
    expect(mid.x).toBeLessThan(400);
    expect(cameraAt(timeline, STEP_MS + GLIDE_MS)).toEqual({ x: 400, y: 400, width: 200, height: 200 });
  });

  it('holds the last camera when a step has none and wraps when looping', () => {
    const hold: Timeline = { ...timeline, steps: [timeline.steps[0]!, { nodeIds: ['a'], connectorIds: [] }] };
    expect(cameraAt(hold, STEP_MS + GLIDE_MS)).toEqual({ x: 0, y: 0, width: 100, height: 100 });
    const looped: Timeline = { ...timeline, loop: true, durationMs: timelineDuration(timeline) };
    expect(cameraAt(looped, timelineDuration(timeline) + 10)).toEqual(cameraAt(looped, 10));
  });
});
