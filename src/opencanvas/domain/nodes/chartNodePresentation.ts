import type { SceneNode } from '../document/types';
import type { Bounds2d, Point2d, Size2d } from '../geometry/types';
import { createBounds2d } from '../geometry/bounds';
import { paletteSwatch, type PaletteKey } from './nodePalette';

// Charts are data, not geometry: this module turns `content` into a
// renderer-neutral scene of marks, axes and labels that the Pixi renderer, the
// SVG export and the data panel all read. Pure TypeScript, no rendering.

export type ChartKind =
  | 'bar' | 'line' | 'area' | 'scatter' | 'pie' | 'donut' | 'radar' | 'heatmap' | 'table';

export const CHART_KINDS: readonly ChartKind[] = [
  'bar', 'line', 'area', 'scatter', 'pie', 'donut', 'radar', 'heatmap', 'table',
];

/** Series colours in order, so a palette swap re-tints every chart at once. */
export const CHART_SERIES_KEYS: readonly PaletteKey[] = [
  'blue', 'red', 'emerald', 'amber', 'violet', 'cyan', 'pink', 'yellow',
];

export interface ChartData {
  readonly categories: readonly string[];
  readonly series: readonly { readonly name: string; readonly values: readonly number[] }[];
}

export interface ChartMark {
  readonly kind: 'bar' | 'line' | 'area' | 'point' | 'slice' | 'cell';
  /** Local node coordinates; a line has its full polyline. */
  readonly points: readonly Point2d[];
  readonly seriesIndex: number;
  readonly color: string;
  readonly opacity: number;
  readonly value?: number;
  readonly label?: string;
}

export interface ChartLabel {
  readonly at: Point2d;
  readonly text: string;
  readonly anchor: 'start' | 'middle' | 'end';
  readonly role: 'title' | 'axis' | 'tick' | 'value' | 'cell';
}

export interface ChartPresentation {
  readonly chart: ChartKind;
  readonly data: ChartData;
  readonly marks: readonly ChartMark[];
  /** Axis/baseline/spoke lines. */
  readonly rules: readonly (readonly Point2d[])[];
  readonly labels: readonly ChartLabel[];
  readonly legend: readonly { readonly color: string; readonly label: string }[];
  /** Table layout for the `table` chart kind. */
  readonly table?: {
    readonly columns: readonly number[];
    readonly rows: readonly number[];
    readonly headerHeight: number;
  };
  /** Quadrant axis captions, when a quadrant chart carries them. */
  readonly quadrants?: {
    readonly xLabels: readonly [string, string];
    readonly yLabels: readonly [string, string];
    readonly titles: readonly [string, string, string, string];
  };
}

export const DEFAULT_CHART_DATA: ChartData = {
  categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
  series: [{ name: 'Revenue', values: [12, 19, 9, 22, 17] }],
};

export function chartSeriesColor(index: number): string {
  return paletteSwatch(CHART_SERIES_KEYS[index % CHART_SERIES_KEYS.length]!, 'solid').fill;
}

/** Nice ticks covering 0..max: the smallest 1/2/5 × 10ⁿ step that reaches max. */
export function niceTicks(max: number, count = 4): number[] {
  if (!Number.isFinite(max) || max <= 0) return [0];
  const rawStep = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const step = ([1, 2, 5, 10].find((candidate) => candidate >= normalized) ?? 10) * magnitude;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = 0; value < top - 1e-9; value += step) ticks.push(Number(value.toFixed(6)));
  ticks.push(Number(top.toFixed(6)));
  return ticks;
}

const AXIS_LEFT = 44;
const AXIS_BOTTOM = 30;
const PADDING = { top: 16, right: 16 };
const LEGEND_ROW = 18;

export function chartContent(node: SceneNode): { chart: ChartKind; data: ChartData; options: Record<string, unknown> } {
  const raw = node.content.chart;
  const chart = typeof raw === 'string' && (CHART_KINDS as readonly string[]).includes(raw)
    ? raw as ChartKind : 'bar';
  const categories = Array.isArray(node.content.categories)
    ? node.content.categories.filter((value): value is string => typeof value === 'string')
    : DEFAULT_CHART_DATA.categories;
  const series = Array.isArray(node.content.series)
    ? node.content.series.flatMap((entry) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
        const record = entry as Record<string, unknown>;
        const values = Array.isArray(record.values)
          ? record.values.map((value) => (typeof value === 'number' && Number.isFinite(value) ? value : 0))
          : [];
        // A series with no values is malformed data, not an empty chart.
        if (values.length === 0) return [];
        return [{ name: typeof record.name === 'string' ? record.name : 'Series', values }];
      })
    : DEFAULT_CHART_DATA.series;
  const options = node.content.options && typeof node.content.options === 'object'
    && !Array.isArray(node.content.options) ? node.content.options as Record<string, unknown> : {};
  return { chart, data: { categories, series }, options };
}

export function chartTitle(node: SceneNode): string {
  const title = node.content.title;
  return typeof title === 'string' ? title : '';
}

function plotBounds(size: Size2d, legendRows: number): Bounds2d {
  const left = AXIS_LEFT;
  const top = PADDING.top + (legendRows > 0 ? LEGEND_ROW : 0) + (legendRows > 1 ? LEGEND_ROW : 0);
  const width = Math.max(10, size.width - left - PADDING.right);
  const height = Math.max(10, size.height - top - AXIS_BOTTOM);
  return createBounds2d(left, top, width, height);
}

function cartesianPresentation(
  chart: 'bar' | 'line' | 'area' | 'scatter',
  data: ChartData,
  size: Size2d,
  legendRows: number
): ChartPresentation {
  const plot = plotBounds(size, legendRows);
  const values = data.series.flatMap((series) => series.values);
  const max = Math.max(0, ...values);
  const min = Math.min(0, ...values);
  const ticks = niceTicks(max - min || 1);
  const scaleMax = min + ticks[ticks.length - 1]!;
  const yOf = (value: number) =>
    plot.y + plot.height - ((value - min) / (scaleMax - min || 1)) * plot.height;
  const slot = plot.width / Math.max(1, data.categories.length);
  const xOf = (index: number) => plot.x + slot * (index + 0.5);
  const rules: Point2d[][] = [
    [{ x: plot.x, y: plot.y }, { x: plot.x, y: plot.y + plot.height }],
    [{ x: plot.x, y: plot.y + plot.height }, { x: plot.x + plot.width, y: plot.y + plot.height }],
  ];
  const labels: ChartLabel[] = [];
  for (const tick of ticks) {
    const y = yOf(tick);
    rules.push([{ x: plot.x, y }, { x: plot.x + plot.width, y }]);
    labels.push({ at: { x: plot.x - 6, y }, text: String(tick), anchor: 'end', role: 'tick' });
  }
  data.categories.forEach((category, index) => {
    labels.push({ at: { x: xOf(index), y: plot.y + plot.height + 16 }, text: category, anchor: 'middle', role: 'axis' });
  });
  const marks: ChartMark[] = [];
  const seriesWidth = slot / Math.max(1, data.series.length);
  data.series.forEach((series, seriesIndex) => {
    const color = chartSeriesColor(seriesIndex);
    if (chart === 'bar') {
      series.values.forEach((value, index) => {
        // A bar is two corners: top edge and baseline, min 1 px so 0 still shows.
        const zero = yOf(Math.max(min, 0));
        const top = Math.abs(yOf(value) - zero) < 1 ? zero - 1 : Math.min(yOf(value), zero);
        const width = Math.max(2, Math.min(48, seriesWidth - 6));
        const x = xOf(index) - (seriesWidth * data.series.length) / 2 + seriesWidth * seriesIndex + 3;
        marks.push({ kind: 'bar', points: [
          { x, y: top }, { x: x + Math.min(width, seriesWidth - 6 < 2 ? 2 : width), y: zero },
        ], seriesIndex, color, opacity: 1, value });
      });
    } else {
      const line = series.values.map((value, index) => ({ x: xOf(index), y: yOf(value) }));
      if (chart === 'line') marks.push({ kind: 'line', points: line, seriesIndex, color, opacity: 1 });
      if (chart === 'scatter') {
        series.values.forEach((value, index) => marks.push({
          kind: 'point', points: [{ x: xOf(index), y: yOf(value) }], seriesIndex, color, opacity: 1, value,
        }));
      }
      if (chart === 'area' && line.length > 0) {
        marks.push({ kind: 'area', points: [
          ...line, { x: line[line.length - 1]!.x, y: yOf(Math.max(min, 0)) },
          { x: line[0]!.x, y: yOf(Math.max(min, 0)) },
        ], seriesIndex, color, opacity: 0.9 });
      }
    }
  });
  return { chart, data, marks, rules, labels, legend: data.series.map((series, index) => ({ color: chartSeriesColor(index), label: series.name })) };
}

function piePresentation(chart: 'pie' | 'donut', data: ChartData, size: Size2d, legendRows: number): ChartPresentation {
  const plot = plotBounds(size, legendRows);
  const radius = Math.max(10, Math.min(plot.width, plot.height) / 2 - 4);
  const cx = plot.x + plot.width / 2;
  const cy = plot.y + plot.height / 2;
  const first = data.series[0]?.values ?? [];
  const total = first.reduce((sum, value) => sum + Math.max(0, value), 0) || 1;
  const inner = chart === 'donut' ? radius * 0.55 : 0;
  const marks: ChartMark[] = [];
  const labels: ChartLabel[] = [];
  let angle = -Math.PI / 2;
  first.forEach((value, index) => {
    const sweep = (Math.max(0, value) / total) * Math.PI * 2;
    const pointCount = Math.max(3, Math.ceil((sweep / (Math.PI * 2)) * 48));
    const points: Point2d[] = [];
    for (let step = 0; step <= pointCount; step += 1) {
      const at = angle + (sweep * step) / pointCount;
      points.push({ x: cx + Math.cos(at) * radius, y: cy + Math.sin(at) * radius });
    }
    if (inner > 0) {
      for (let step = pointCount; step >= 0; step -= 1) {
        const at = angle + (sweep * step) / pointCount;
        points.push({ x: cx + Math.cos(at) * inner, y: cy + Math.sin(at) * inner });
      }
    }
    marks.push({ kind: 'slice', points, seriesIndex: index, color: chartSeriesColor(index), opacity: 1, value });
    const mid = angle + sweep / 2;
    const labelRadius = math_mid(inner, radius);
    labels.push({
      at: { x: cx + Math.cos(mid) * labelRadius, y: cy + Math.sin(mid) * labelRadius },
      text: `${Math.round((Math.max(0, value) / total) * 100)}%`,
      anchor: 'middle', role: 'value',
    });
    angle += sweep;
  });
  return {
    chart, data, marks, rules: [], labels,
    legend: (data.categories.length ? data.categories : first.map((_, index) => `#${index + 1}`))
      .map((label, index) => ({ color: chartSeriesColor(index), label })),
  };
}

function math_mid(inner: number, outer: number): number {
  return inner > 0 ? (inner + outer) / 2 : (outer * 2) / 3;
}

function heatmapPresentation(data: ChartData, size: Size2d, legendRows: number): ChartPresentation {
  const plot = plotBounds(size, legendRows);
  const rows = data.series.length;
  const columns = Math.max(1, data.categories.length);
  const cellWidth = plot.width / columns;
  const cellHeight = plot.height / Math.max(1, rows);
  const values = data.series.flatMap((series) => series.values);
  const max = Math.max(1, ...values);
  const marks: ChartMark[] = [];
  const labels: ChartLabel[] = [];
  data.series.forEach((series, row) => {
    series.values.forEach((value, column) => {
      marks.push({
        kind: 'cell', seriesIndex: row,
        points: [
          { x: plot.x + column * cellWidth, y: plot.y + row * cellHeight },
          { x: plot.x + (column + 1) * cellWidth, y: plot.y + (row + 1) * cellHeight },
        ],
        color: chartSeriesColor(row),
        opacity: Math.min(1, Math.max(0.12, Math.abs(value) / max)),
        value,
      });
      labels.push({
        at: { x: plot.x + (column + 0.5) * cellWidth, y: plot.y + (row + 0.5) * cellHeight },
        text: String(value), anchor: 'middle', role: 'cell',
      });
    });
    labels.push({
      at: { x: plot.x - 6, y: plot.y + (row + 0.5) * cellHeight },
      text: series.name, anchor: 'end', role: 'tick',
    });
  });
  data.categories.forEach((category, column) => {
    labels.push({
      at: { x: plot.x + (column + 0.5) * cellWidth, y: plot.y + plot.height + 16 },
      text: category, anchor: 'middle', role: 'axis',
    });
  });
  return {
    chart: 'heatmap', data, marks, rules: [],
    labels,
    legend: data.series.map((series, index) => ({ color: chartSeriesColor(index), label: series.name })),
  };
}

function radarPresentation(data: ChartData, size: Size2d, legendRows: number): ChartPresentation {
  const plot = plotBounds(size, legendRows);
  const radius = Math.max(10, Math.min(plot.width, plot.height) / 2 - 6);
  const cx = plot.x + plot.width / 2;
  const cy = plot.y + plot.height / 2;
  const axes = Math.max(3, data.categories.length);
  const max = Math.max(1, ...data.series.flatMap((series) => series.values));
  const spoke = (index: number, ratio: number): Point2d => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / axes;
    return { x: cx + Math.cos(angle) * radius * ratio, y: cy + Math.sin(angle) * radius * ratio };
  };
  const rules: Point2d[][] = [Array.from({ length: axes }, (_, index) => spoke(index, 1)), [spoke(0, 1), spoke(0, 0)]];
  const labels: ChartLabel[] = data.categories.map((category, index) => {
    const at = spoke(index, 1.12);
    return { at, text: category, anchor: 'middle', role: 'axis' };
  });
  const marks: ChartMark[] = data.series.map((series, seriesIndex) => ({
    kind: 'area' as const, seriesIndex, color: chartSeriesColor(seriesIndex), opacity: 0.55,
    points: series.values.map((value, index) => spoke(index, Math.max(0, Math.min(1, value / max)))),
  }));
  return {
    chart: 'radar', data, marks, rules, labels,
    legend: data.series.map((series, index) => ({ color: chartSeriesColor(index), label: series.name })),
  };
}

function tablePresentation(data: ChartData, size: Size2d): ChartPresentation {
  const rows = data.series.length + 1;
  const columns = data.categories.length + 1;
  const headerHeight = 26;
  const columnWidth = (size.width - 8) / Math.max(1, columns);
  const rowHeight = Math.max(18, (size.height - 8 - headerHeight) / Math.max(1, rows - 1));
  const columnsX = Array.from({ length: columns + 1 }, (_, index) => 4 + index * columnWidth);
  const rowsY = [4, 4 + headerHeight,
    ...Array.from({ length: rows - 1 }, (_, index) => 4 + headerHeight + (index + 1) * rowHeight)];
  const labels: ChartLabel[] = [{ at: { x: columnsX[0]! + 6, y: 4 + headerHeight / 2 }, text: '', anchor: 'start', role: 'axis' }];
  data.categories.forEach((category, index) => {
    labels.push({
      at: { x: columnsX[index + 1]! + columnWidth / 2, y: 4 + headerHeight / 2 },
      text: category, anchor: 'middle', role: 'axis',
    });
  });
  const marks: ChartMark[] = [];
  data.series.forEach((series, row) => {
    const y = rowsY[row + 1]! + rowHeight / 2;
    labels.push({ at: { x: columnsX[0]! + 6, y }, text: series.name, anchor: 'start', role: 'axis' });
    series.values.forEach((value, column) => {
      labels.push({
        at: { x: columnsX[column + 1]! + columnWidth / 2, y },
        text: typeof value === 'number' ? String(value) : '', anchor: 'middle', role: 'cell',
      });
    });
  });
  return {
    chart: 'table', data, marks, rules: [],
    labels,
    legend: data.series.map((series, index) => ({ color: chartSeriesColor(index), label: series.name })),
    table: { columns: columnsX, rows: rowsY, headerHeight },
  };
}

export function resolveChartPresentation(node: SceneNode): ChartPresentation | null {
  if (node.kind !== 'chart') return null;
  const { chart, data } = chartContent(node);
  const size = node.size;
  const legendRows = chart === 'table' || chart === 'pie' || chart === 'donut' ? 0 : data.series.length > 1 ? 2 : 1;
  const presentation = chart === 'pie' || chart === 'donut' ? piePresentation(chart, data, size, legendRows)
    : chart === 'heatmap' ? heatmapPresentation(data, size, legendRows)
      : chart === 'radar' ? radarPresentation(data, size, legendRows)
        : chart === 'table' ? tablePresentation(data, size)
          : cartesianPresentation(chart, data, size, legendRows);
  const title = chartTitle(node);
  if (!title) return presentation;
  return { ...presentation, labels: [{ at: { x: size.width / 2, y: 12 }, text: title, anchor: 'middle', role: 'title' }, ...presentation.labels] };
}
