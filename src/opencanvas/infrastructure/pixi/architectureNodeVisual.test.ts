import { describe, expect, it } from 'vitest';
import { createPixiSpikePage } from './spikeFixture';
import { projectArchitectureNodeVisual } from './architectureNodeVisual';

describe('Pixi architecture node visual adapter', () => {
  it('projects architecture cards and icon-first assets through shared theme colors', () => {
    const visuals = createPixiSpikePage(10).nodes.slice(8, 10).map(projectArchitectureNodeVisual);
    expect(visuals.map((visual) => visual?.presentation.kind)).toEqual([
      'architecture',
      'provider-icon',
    ]);
    expect(visuals[0]).toMatchObject({ presentation: { provider: 'aws' } });
    expect(visuals[1]).toMatchObject({ presentation: { provider: 'developer' } });
    expect(visuals.every((visual) => typeof visual?.stroke === 'number')).toBe(true);
  });
});
