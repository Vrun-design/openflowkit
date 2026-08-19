import { describe, expect, it } from 'vitest';
import type { JsonObject } from '../document/json';
import type { SceneNode } from '../document/types';
import { createPixiSpikePage } from '../../infrastructure/pixi/spikeFixture';
import { resolveJourneyNodePresentation } from './journeyNodePresentation';

function node(kind: string, content: JsonObject): SceneNode {
  return { ...createPixiSpikePage(1).nodes[0], kind, content };
}

describe('journey node presentation', () => {
  it('prefers semantic journey fields and clamps the score', () => {
    expect(
      resolveJourneyNodePresentation(
        node('journey', {
          label: 'Legacy task',
          subLabel: 'Legacy actor',
          journeyTitle: 'Checkout',
          journeySection: 'Payment',
          journeyTask: 'Confirm order',
          journeyActor: 'Buyer',
          journeyScore: 7.2,
        })
      )
    ).toMatchObject({
      title: 'Checkout',
      section: 'Payment',
      task: 'Confirm order',
      actor: 'Buyer',
      score: 5,
    });
  });

  it('falls back through legacy labels without inventing a score', () => {
    expect(
      resolveJourneyNodePresentation(node('journey', { label: 'Browse', subLabel: 'Visitor' }))
    ).toMatchObject({ task: 'Browse', actor: 'Visitor', section: 'General' });
    expect(resolveJourneyNodePresentation(node('journey', {}))).not.toHaveProperty('score');
  });

  it('rejects unrelated families', () => {
    expect(resolveJourneyNodePresentation(node('process', {}))).toBeNull();
  });
});
