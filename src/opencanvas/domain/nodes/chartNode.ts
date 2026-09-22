import type { SceneNode, ScenePage } from '../document/types';
import type { Point2d, Size2d } from '../geometry/types';
import type { JsonObject } from '../document/json';
import { nextNodeZIndex } from './shapeNode';
import {
  DEFAULT_CHART_DATA, type ChartKind, type ChartData, type QuadrantData,
} from './chartNodePresentation';

export const DEFAULT_CHART_SIZE: Size2d = { width: 720, height: 440 };

export interface CreateChartNodeOptions {
  readonly id: string;
  readonly at: Point2d;
  readonly chart: ChartKind;
  readonly size?: Size2d;
  readonly data?: ChartData;
  /** Quadrant charts carry points instead of series. */
  readonly quadrant?: QuadrantData;
  readonly title?: string;
  readonly options?: JsonObject;
  readonly appearance?: JsonObject;
}

export function createChartNode(page: ScenePage, options: CreateChartNodeOptions): SceneNode {
  const data = options.data ?? DEFAULT_CHART_DATA;
  return {
    id: options.id,
    kind: 'chart',
    parentId: null,
    layerId: page.layers[0]?.id ?? 'default',
    zIndex: nextNodeZIndex(page),
    transform: { translation: { ...options.at }, rotationRadians: 0, scale: { x: 1, y: 1 } },
    size: { ...(options.size ?? DEFAULT_CHART_SIZE) },
    content: {
      chart: options.chart,
      ...(options.quadrant ? {
        xLabels: [...options.quadrant.xLabels],
        yLabels: [...options.quadrant.yLabels],
        quadrants: [...options.quadrant.quadrants],
        points: options.quadrant.points.map((point) => ({ ...point })),
      } : {
        categories: [...data.categories],
        series: data.series.map((series) => ({ name: series.name, values: [...series.values] })),
      }),
      ...(options.title ? { title: options.title } : {}),
      ...(options.options ? { options: options.options } : {}),
    },
    appearance: { fill: '#ffffff', stroke: '#e2e8f0', strokeWidth: 1, ...options.appearance },
    ports: [],
    metadata: {},
    extensions: {},
  };
}

/** A chart node's data, as plain JSON for the data panel to edit. */
export function chartDataOf(node: SceneNode): ChartData {
  const categories = Array.isArray(node.content.categories)
    ? node.content.categories.map((value) => String(value))
    : [];
  const series = Array.isArray(node.content.series)
    ? node.content.series.flatMap((entry) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
        const record = entry as Record<string, unknown>;
        const values = Array.isArray(record.values)
          ? record.values.map((value) => (typeof value === 'number' && Number.isFinite(value) ? value : 0))
          : [];
        return [{ name: String(record.name ?? 'Series'), values }];
      })
    : [];
  return { categories, series };
}

export function chartKindOf(node: SceneNode): ChartKind {
  const value = node.content.chart;
  return typeof value === 'string' ? (value as ChartKind) : 'bar';
}
