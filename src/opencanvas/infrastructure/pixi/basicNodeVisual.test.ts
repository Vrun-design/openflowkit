import { describe, expect, it } from 'vitest';
import { createPixiSpikePage } from './spikeFixture';
import { projectBasicNodeVisual } from './basicNodeVisual';

describe('Pixi basic node visual adapter', () => {
  it('uses shared theme colors for all basic fixture families', () => {
    const visuals = createPixiSpikePage(5).nodes.map(projectBasicNodeVisual);
    expect(visuals.map((visual) => visual?.kind)).toEqual([
      'process',
      'start',
      'decision',
      'end',
      'custom',
    ]);
    expect(visuals.map((visual) => visual?.shape)).toEqual([
      'rounded',
      'capsule',
      'diamond',
      'capsule',
      'rounded',
    ]);
    expect(new Set(visuals.map((visual) => visual?.stroke)).size).toBe(4);
  });
});
