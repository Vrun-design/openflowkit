import { describe, expect, it } from 'vitest';
import { autoSequence } from './sequence';
import { animEdge, animNode, animPage } from './testFixtures';

describe('autoSequence', () => {
  it('orders a chain roots-first with each connector in its target step', () => {
    const page = animPage(
      [animNode('a', 0, 0), animNode('b', 0, 100), animNode('c', 0, 200)],
      [animEdge('ab', 'a', 'b'), animEdge('bc', 'b', 'c')],
    );
    const timeline = autoSequence(page);
    expect(timeline.preset).toBe('build');
    expect(timeline.steps.map((step) => step.nodeIds)).toEqual([['a'], ['b'], ['c']]);
    expect(timeline.steps[1]?.connectorIds).toEqual(['ab']);
    expect(timeline.steps[2]?.connectorIds).toEqual(['bc']);
    expect(timeline.durationMs).toBe(3 * 1700);
  });

  it('puts unconnected nodes last and breaks cycles by position', () => {
    const page = animPage(
      [animNode('a', 0, 0), animNode('b', 0, 100), animNode('c', 0, 200), animNode('lone', 500, 0)],
      [animEdge('ab', 'a', 'b'), animEdge('bc', 'b', 'c'), animEdge('ca', 'c', 'a')],
    );
    const order = autoSequence(page).steps.map((step) => step.nodeIds[0]);
    // Cycle broken by position (topmost first), the unconnected node last.
    expect(order).toEqual(['a', 'b', 'c', 'lone']);
  });

  it('steps containers before their children', () => {
    const page = animPage([
      animNode('kid', 50, 150, { parentId: 'box' }),
      animNode('box', 0, 100, { kind: 'group' }),
      animNode('top', 0, 0),
    ]);
    const order = autoSequence(page).steps.map((step) => step.nodeIds[0]);
    expect(order.indexOf('box')).toBeLessThan(order.indexOf('kid'));
  });

  it('joins a connector with no bound target to its source step', () => {
    const page = animPage(
      [animNode('a', 0, 0), animNode('b', 200, 0)],
      [animEdge('free', 'a', null)],
    );
    const timeline = autoSequence(page);
    expect(timeline.steps[0]?.connectorIds).toEqual(['free']);
  });

  it('returns no steps for an empty page and one step for connectors alone', () => {
    expect(autoSequence(animPage([])).steps).toEqual([]);
    const lone = autoSequence(animPage([], [animEdge('free', null, null)]));
    expect(lone.steps).toHaveLength(1);
    expect(lone.steps[0]?.connectorIds).toEqual(['free']);
  });

  it('gives every step a camera over its own nodes', () => {
    const page = animPage([animNode('a', 10, 20)]);
    const camera = autoSequence(page).steps[0]?.camera;
    expect(camera).toMatchObject({ x: 10, y: 20, width: 100, height: 50 });
  });
});
