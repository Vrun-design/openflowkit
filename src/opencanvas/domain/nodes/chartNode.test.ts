import { describe, expect, it } from 'vitest';
import { createTestDocument } from '../../testing/builders/documentBuilder';
import { chartDataOf, chartKindOf, createChartNode, DEFAULT_CHART_SIZE } from './chartNode';

const page = () => createTestDocument({ nodes: [] }).pages[0];

describe('createChartNode', () => {
  it('copies the data so later edits cannot mutate the caller', () => {
    const data = { categories: ['a'], series: [{ name: 'S', values: [1] }] };
    const node = createChartNode(page(), { id: 'c1', at: { x: 5, y: 6 }, chart: 'bar', data, title: 'T' });
    expect(node.kind).toBe('chart');
    expect(node.size).toEqual(DEFAULT_CHART_SIZE);
    expect(node.content.title).toBe('T');
    data.series[0]!.values[0] = 99;
    expect(chartDataOf(node).series[0]!.values).toEqual([1]);
  });

  it('falls back to the default data and kind', () => {
    const node = createChartNode(page(), { id: 'c2', at: { x: 0, y: 0 }, chart: 'pie' });
    expect(chartDataOf(node).series.length).toBeGreaterThan(0);
    expect(chartKindOf({ ...node, content: {} })).toBe('bar');
  });
});
