import { describe, expect, it } from 'vitest';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { buildSetChartKindCommand } from './chartCommands';

const page = () => createTestDocument({
  nodes: [
    createTestNode('chart', { kind: 'chart', content: { chart: 'bar', series: [{ name: 'S', values: [1] }] } }),
    createTestNode('shape', { kind: 'process' }),
  ],
}).pages[0];

describe('buildSetChartKindCommand', () => {
  it('switches only chart nodes and keeps their data', () => {
    const command = buildSetChartKindCommand(page(), ['chart', 'shape'], 'donut')!;
    expect(command.kind).toBe('batch');
    const next = (command as unknown as { commands: { after: { content: Record<string, unknown> } }[] })
      .commands[0]!.after.content;
    expect(next.chart).toBe('donut');
    expect(next.series).toEqual([{ name: 'S', values: [1] }]);
  });

  it('is null when nothing changes or nothing is a chart', () => {
    expect(buildSetChartKindCommand(page(), ['chart'], 'bar')).toBeNull();
    expect(buildSetChartKindCommand(page(), ['shape'], 'pie')).toBeNull();
  });
});
