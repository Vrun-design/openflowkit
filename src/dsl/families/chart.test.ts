import { describe, expect, it } from 'vitest';
import { compile } from '../compile';
import { serialize } from '../serialize';

const QUADRANT = `%% ofk 1
chart quadrant
x: Cheap, Costly
y: Minor, Major
quadrants: Do now, Plan, Skip, Delegate
Search [0.2, 0.9]`;

describe('chart family', () => {
  it('titles once: the chart draws the title, so its frame shows no header', async () => {
    const chart = await compile('chart bar\ntitle: Revenue\nRevenue: Jan 12, Feb 19');
    expect(chart.nodes[0]!.content.title).toBe('Revenue');
    expect(chart.frame.content).toMatchObject({ label: 'Revenue', showHeader: false });
    expect((await compile('flowchart\ntitle: Flow\nA -> B')).frame.content.showHeader).toBeUndefined();
  });

  it('reads quadrant axis and region labels, and keeps them through a round trip', async () => {
    const result = await compile(QUADRANT);
    expect(result.diagnostics.filter(({ severity }) => severity !== 'info')).toEqual([]);
    expect(result.nodes[0]!.content).toMatchObject({
      xLabels: ['Cheap', 'Costly'],
      yLabels: ['Minor', 'Major'],
      quadrants: ['Do now', 'Plan', 'Skip', 'Delegate'],
      points: [{ label: 'Search', x: 0.2, y: 0.9 }],
    });
    const again = await compile(serialize(result));
    expect(again.nodes[0]!.content).toMatchObject({ xLabels: ['Cheap', 'Costly'], quadrants: ['Do now', 'Plan', 'Skip', 'Delegate'] });
  });
});
