import { describe, expect, it } from 'vitest';
import { createPixiSpikePage } from './spikeFixture';
import { projectClassEntityNodeVisual } from './classEntityNodeVisual';

describe('Pixi class and entity visual adapter', () => {
  it('projects both structured data families through shared container colors', () => {
    const visuals = createPixiSpikePage(18).nodes.slice(16, 18).map(projectClassEntityNodeVisual);
    expect(visuals.map((visual) => visual?.presentation.kind)).toEqual(['class', 'er_entity']);
    expect(visuals.every((visual) => typeof visual?.stroke === 'number')).toBe(true);
  });
});
