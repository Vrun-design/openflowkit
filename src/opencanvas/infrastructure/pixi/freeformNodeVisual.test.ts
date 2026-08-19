import { describe, expect, it } from 'vitest';
import { createPixiSpikePage } from './spikeFixture';
import { projectFreeformNodeVisual } from './freeformNodeVisual';

describe('Pixi freeform node visual adapter', () => {
  it('projects text, image, and annotation through distinct visual contracts', () => {
    const visuals = createPixiSpikePage(8).nodes.slice(5, 8).map(projectFreeformNodeVisual);
    expect(visuals.map((visual) => visual?.kind)).toEqual(['text', 'image', 'annotation']);
    expect(visuals[0]).toMatchObject({ kind: 'text', hasBackground: true });
    expect(visuals[1]).toMatchObject({
      kind: 'image',
      presentation: { sourceUrl: expect.stringMatching(/^data:image\//) },
    });
    expect(visuals[2]).toMatchObject({ kind: 'annotation', presentation: { colorKey: 'yellow' } });
  });
});
