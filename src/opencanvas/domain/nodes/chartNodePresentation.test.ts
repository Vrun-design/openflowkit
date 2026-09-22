import { describe, expect, it } from 'vitest';
import type { JsonObject } from '../document/json';
import { createTestNode } from '../../testing/builders/documentBuilder';
import { CHART_KINDS, chartSeriesColor, niceTicks, resolveChartPresentation } from './chartNodePresentation';

const chartNode = (content: JsonObject, size = { width: 720, height: 440 }) =>
  createTestNode('chart-1', { kind: 'chart', size, content, transform: { translation: { x: 0, y: 0 }, rotationRadians: 0, scale: { x: 1, y: 1 } } });

const BAR_DATA = {
  chart: 'bar',
  categories: ['Jan', 'Feb', 'Mar'],
  series: [{ name: 'Revenue', values: [12, 19, 9] }, { name: 'Costs', values: [8, 9, 7] }],
};

describe('niceTicks', () => {
  it('steps in 1/2/5 × 10ⁿ and covers the maximum', () => {
    expect(niceTicks(22)).toEqual([0, 10, 20, 30]);
    expect(niceTicks(9)).toEqual([0, 5, 10]);
    expect(niceTicks(1)).toEqual([0, 0.5, 1]);
    expect(niceTicks(0)).toEqual([0]);
    expect(niceTicks(Number.NaN)).toEqual([0]);
  });
});

describe('resolveChartPresentation', () => {
  it('returns null for another kind', () => {
    expect(resolveChartPresentation(createTestNode('n', { kind: 'process' }))).toBeNull();
  });

  it('draws one bar per value inside the node box', () => {
    const presentation = resolveChartPresentation(chartNode(BAR_DATA))!;
    expect(presentation.chart).toBe('bar');
    expect(presentation.marks).toHaveLength(6);
    for (const mark of presentation.marks) {
      expect(mark.kind).toBe('bar');
      for (const point of mark.points) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(720);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(440);
      }
    }
    expect(presentation.marks[0]!.color).toBe(chartSeriesColor(0));
    expect(presentation.marks[3]!.color).toBe(chartSeriesColor(1));
  });

  it('keeps negative values inside the plot', () => {
    const presentation = resolveChartPresentation(chartNode({
      chart: 'line', categories: ['a', 'b'], series: [{ name: 'S', values: [-5, 10] }],
    }))!;
    const points = presentation.marks[0]!.points;
    expect(points.every((point) => point.y >= 0 && point.y <= 440)).toBe(true);
  });

  it('handles empty and single-row data without throwing', () => {
    for (const data of [
      { chart: 'bar', categories: [], series: [] },
      { chart: 'line', categories: ['only'], series: [{ name: 'S', values: [3] }] },
      { chart: 'pie', categories: [], series: [] },
      { chart: 'donut', categories: ['x'], series: [{ name: 'S', values: [0] }] },
    ]) {
      const presentation = resolveChartPresentation(chartNode(data))!;
      expect(presentation.marks.length).toBeGreaterThanOrEqual(0);
    }
  });

  it('sums pie slices to a full turn and labels each percent', () => {
    const presentation = resolveChartPresentation(chartNode({
      chart: 'pie', categories: ['a', 'b', 'c'], series: [{ name: 'Share', values: [1, 1, 2] }],
    }))!;
    const percents = presentation.labels.filter((label) => label.role === 'value').map((label) => label.text);
    expect(percents).toEqual(['25%', '25%', '50%']);
    expect(presentation.marks).toHaveLength(3);
  });

  it('draws a heatmap cell per value and a radar spoke per category', () => {
    const heat = resolveChartPresentation(chartNode({ ...BAR_DATA, chart: 'heatmap' }))!;
    expect(heat.marks.filter((mark) => mark.kind === 'cell')).toHaveLength(6);
    const radar = resolveChartPresentation(chartNode({
      chart: 'radar', categories: ['a', 'b', 'c'], series: [{ name: 'S', values: [1, 2, 3] }],
    }))!;
    expect(radar.marks[0]!.points).toHaveLength(3);
    expect(radar.rules.length).toBeGreaterThan(0);
  });

  it('lays a table out with a header row plus one row per series', () => {
    const presentation = resolveChartPresentation(chartNode({ ...BAR_DATA, chart: 'table' }))!;
    // Grid lines: header + 2 series → 4 row boundaries; 3 categories + label
    // column → 5 column boundaries.
    expect(presentation.table!.rows).toHaveLength(4);
    expect(presentation.table!.columns).toHaveLength(5);
    const cells = presentation.labels.filter((label) => label.role === 'cell');
    expect(cells).toHaveLength(6);
  });

  it('accepts every chart kind', () => {
    for (const chart of CHART_KINDS) {
      expect(resolveChartPresentation(chartNode({ ...BAR_DATA, chart }))!.chart).toBe(chart);
    }
  });

  it('ignores malformed content and falls back to defaults', () => {
    const presentation = resolveChartPresentation(chartNode({
      chart: 'nope', categories: 'x', series: [{ values: 'y' }, 5],
    }))!;
    expect(presentation.chart).toBe('bar');
    expect(presentation.data.series).toEqual([]);
  });

  it('puts the title above the plot', () => {
    const presentation = resolveChartPresentation(chartNode({ ...BAR_DATA, title: 'Monthly' }))!;
    expect(presentation.labels[0]).toMatchObject({ text: 'Monthly', role: 'title' });
  });
});
