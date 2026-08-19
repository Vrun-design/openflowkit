import { describe, expect, it } from 'vitest';
import { createPixiSpikePage } from './spikeFixture';
import { projectContainerNodeVisual } from './containerNodeVisual';

describe('Pixi container node visual adapter', () => {
  it('projects all three structural families through shared section colors', () => {
    const visuals = createPixiSpikePage(13).nodes.slice(10, 13).map(projectContainerNodeVisual);
    expect(visuals.map((visual) => visual?.presentation.kind)).toEqual([
      'group',
      'section',
      'swimlane',
    ]);
    expect(visuals.every((visual) => typeof visual?.stroke === 'number')).toBe(true);
    expect(visuals.every((visual) => (visual?.fill.alpha ?? 0) > 0)).toBe(true);
  });
});
