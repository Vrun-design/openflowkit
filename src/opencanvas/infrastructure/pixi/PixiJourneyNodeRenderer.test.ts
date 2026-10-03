import { Graphics, Text } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { createPixiSpikePage } from './spikeFixture';
import { PixiJourneyNodeRenderer } from './PixiJourneyNodeRenderer';

const IDENTITY = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };

function textRows(height: number): number[] {
  const journey = createPixiSpikePage(23).nodes[22];
  const result = new PixiJourneyNodeRenderer().drawNode({ ...journey, size: { width: 220, height } }, IDENTITY, new Graphics());
  return result!.label.children.filter((child) => child instanceof Text).map((text) => text.position.y);
}

describe('Pixi journey node renderer', () => {
  // v1 saved journey cards 95 px tall; the title used to land on the actor line.
  it('keeps every text row on its own line, at any card height', () => {
    for (const height of [95, 120, 140]) {
      const rows = textRows(height).sort((a, b) => a - b);
      const gaps = rows.slice(1).map((y, index) => y - rows[index]!);
      expect(Math.min(...gaps)).toBeGreaterThanOrEqual(10);
    }
  });
});
