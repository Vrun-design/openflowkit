import { describe, expect, it } from 'vitest';
import { createPixiSpikePage } from './spikeFixture';
import { projectJourneyNodeVisual } from './journeyNodeVisual';

describe('Pixi journey node visual adapter', () => {
  it('projects journey content and semantic score color', () => {
    const visual = projectJourneyNodeVisual(createPixiSpikePage(23).nodes[22]);
    expect(visual?.presentation).toMatchObject({
      kind: 'journey',
      section: 'Payment',
      task: 'Confirm payment',
      actor: 'Buyer',
      score: 2,
    });
    expect(typeof visual?.scoreFill).toBe('number');
  });
});
