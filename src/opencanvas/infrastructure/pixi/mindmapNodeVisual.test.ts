import { describe, expect, it } from 'vitest';
import { createPixiSpikePage } from './spikeFixture';
import { projectMindmapNodeVisual } from './mindmapNodeVisual';

describe('Pixi mindmap node visual adapter', () => {
  it('projects hierarchy topics through shared node colors', () => {
    const visuals = createPixiSpikePage(22).nodes.slice(18, 22).map(projectMindmapNodeVisual);
    expect(visuals.map((visual) => visual?.presentation.depth)).toEqual([0, 1, 1, 2]);
    expect(visuals.every((visual) => typeof visual?.stroke === 'number')).toBe(true);
  });
});
