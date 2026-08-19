import { describe, expect, it } from 'vitest';
import { createPixiSpikePage } from './spikeFixture';
import { projectSequenceNodeVisual } from './sequenceNodeVisual';

describe('Pixi sequence node visual', () => {
  it('projects participants, notes, and fragments through shared theme colors', () => {
    const nodes = createPixiSpikePage(28).nodes;
    expect(projectSequenceNodeVisual(nodes[23])?.presentation.kind).toBe('sequence_participant');
    expect(projectSequenceNodeVisual(nodes[25])?.presentation.kind).toBe('sequence_note');
    expect(projectSequenceNodeVisual(nodes[26])?.presentation.kind).toBe('sequence_fragment');
    expect(projectSequenceNodeVisual(nodes[0])).toBeNull();
  });
});
