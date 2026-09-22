import { describe, expect, it } from 'vitest';
import { easeOutCubic, frameAt, MIN_STEP_MS, NOTE_MS, scaleTimeline, STEP_MS, stepDuration, stepWindows } from './frame';
import { autoSequence } from './sequence';
import { animEdge, animNode, animPage } from './testFixtures';
import type { Timeline } from './types';

function buildTimeline(): Timeline {
  return autoSequence(animPage([animNode('a', 0, 0), animNode('b', 0, 100)]));
}

describe('frameAt', () => {
  it('starts empty and ends with everything shown for build', () => {
    const timeline = buildTimeline();
    const start = frameAt(timeline, 0);
    expect(start.nodes.a?.opacity).toBe(0);
    expect(start.nodes.a?.scale).toBe(0.92);
    expect(start.nodes.b?.opacity).toBe(0);
    const mid = frameAt(timeline, STEP_MS);
    expect(mid.nodes.a?.opacity).toBe(1);
    expect(mid.nodes.a?.scale).toBe(1);
    expect(mid.nodes.b?.opacity).toBe(0);
    expect(mid.activeStepIndex).toBe(1);
    const end = frameAt(timeline, timeline.durationMs);
    expect(end.nodes.a?.opacity).toBe(1);
    expect(end.nodes.b?.opacity).toBe(1);
    expect(end.connectors).toEqual({});
    expect(end.camera).toBeNull();
  });

  it('draws connectors on over their reveal window', () => {
    const timeline = autoSequence(animPage(
      [animNode('a', 0, 0), animNode('b', 0, 100)],
      [animEdge('ab', 'a', 'b')],
    ));
    expect(frameAt(timeline, STEP_MS - 1).connectors.ab?.drawProgress).toBe(0);
    const arrived = frameAt(timeline, STEP_MS + 480);
    expect(arrived.connectors.ab?.drawProgress).toBe(1);
  });

  it('dims every non-current step for walkthrough and glides the camera', () => {
    const timeline = { ...buildTimeline(), preset: 'walkthrough' as const };
    const frame = frameAt(timeline, STEP_MS + 320);
    expect(frame.nodes.b?.opacity).toBe(1);
    expect(frame.nodes.a?.opacity).toBe(0.25);
    expect(frameAt(timeline, STEP_MS + 400).camera).toEqual(timeline.steps[1]?.camera ?? null);
    expect(frameAt(timeline, STEP_MS + 200).camera).not.toEqual(timeline.steps[1]?.camera ?? null);
  });

  it('shows everything with a travelling dash phase for pulse', () => {
    const timeline = autoSequence(
      animPage([animNode('a', 0, 0), animNode('b', 0, 100)], [animEdge('ab', 'a', 'b')]),
      'pulse',
    );
    const first = frameAt(timeline, 0);
    expect(first.nodes.a).toMatchObject({ opacity: 1, scale: 1, drawProgress: 1 });
    expect(first.connectors.ab?.pulsePhase).toBeGreaterThanOrEqual(0);
    expect(first.connectors.ab?.pulsePhase).toBeLessThan(1);
    expect(frameAt(timeline, 600).connectors.ab?.pulsePhase)
      .not.toBe(first.connectors.ab?.pulsePhase);
    expect(first.camera).toBeNull();
  });

  it('holds notes longer and wraps when looping', () => {
    const timeline: Timeline = {
      steps: [
        { nodeIds: ['a'], connectorIds: [] },
        { nodeIds: ['b'], connectorIds: [], note: 'why', holdMs: 2 * STEP_MS },
      ],
      preset: 'build', loop: true, durationMs: 3 * STEP_MS,
    };
    const windows = stepWindows(timeline);
    expect(windows[1]).toEqual({ start: STEP_MS, end: 3 * STEP_MS });
    expect(frameAt(timeline, 3 * STEP_MS + 100).timeMs).toBe(100);
    expect(stepDuration({ note: 'why' })).toBe(NOTE_MS);
  });

  it('clamps past the end without looping and handles the empty timeline', () => {
    const timeline = buildTimeline();
    expect(frameAt(timeline, 10 ** 9).timeMs).toBe(timeline.durationMs);
    const empty = frameAt({ steps: [], preset: 'build', loop: false, durationMs: 0 }, 500);
    expect(empty).toMatchObject({ activeStepIndex: -1, camera: null, durationMs: 0 });
  });

  it('eases monotonically from 0 to 1', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });

  it('scales the clip to a target duration and floors short steps', () => {
    const timeline = buildTimeline();
    const halved = scaleTimeline(timeline, STEP_MS);
    expect(halved.durationMs).toBe(2 * 850);
    expect(scaleTimeline(timeline, 10).steps.every((step) => step.holdMs === MIN_STEP_MS)).toBe(true);
    expect(scaleTimeline(timeline, 0)).toBe(timeline);
  });

  it('frames 500 nodes in under 5 ms', () => {
    const nodes = Array.from({ length: 500 }, (_, index) => animNode(`n${index}`, index, index * 60));
    const edges = nodes.slice(1).map((node, index) => animEdge(`e${index}`, `n${index}`, node.id));
    const timeline = autoSequence(animPage(nodes, edges));
    const start = performance.now();
    for (let frame = 0; frame < 450; frame += 50) frameAt(timeline, frame * 40);
    const elapsed = (performance.now() - start) / 9;
    expect(elapsed).toBeLessThan(5);
  });
});
