import type { ScenePage } from '../../opencanvas/domain/document/types';
import { createChartNode, DEFAULT_CHART_SIZE, chartDataOf, chartKindOf } from '../../opencanvas/domain/nodes/chartNode';
import {
  CHART_KINDS, DEFAULT_QUADRANT, quadrantContent, type ChartKind, type QuadrantData,
} from '../../opencanvas/domain/nodes/chartNodePresentation';
import type { DslDiagnostic } from '../ast';
import { tokenDiagnostic } from '../diagnostics';
import type { DslSegment } from '../segments';
import type { DslFrameScene } from '../sceneMeta';
import { quote } from '../text';
import type { Family, FamilyContext, FamilyScene } from './types';

// The `chart` family: one chart node per diagram. `chart bar` … `chart quadrant`,
// then one statement per series (`Revenue: Jan 12, Feb 19`) or per quadrant
// point (`Feature A [0.32, 0.78]`). Round-trips byte for byte.

/** A family compiles before any page exists; the node only needs a layer list. */
const SCRATCH_PAGE: ScenePage = {
  id: 'dsl', name: 'dsl', diagramKind: 'chart',
  layers: [{ id: 'default', name: 'Layer 1', visible: true, locked: false }],
  nodes: [], connectors: [], metadata: {}, extensions: {},
};

function chartKindOfHeader(header: readonly string[], diagnostics: DslDiagnostic[]): ChartKind {
  const word = header[0]?.toLowerCase();
  if (!word) return 'bar';
  if ((CHART_KINDS as readonly string[]).includes(word)) return word as ChartKind;
  diagnostics.push({
    code: 'W131', severity: 'warning', line: 1, col: 1, endCol: 1,
    message: `Unknown chart kind "${header[0]}"`,
    hint: CHART_KINDS.join(', '), source: 'parse',
  });
  return 'bar';
}

/** `Jan 12, Feb 19` → one category per pair. */
function parseSeries(
  value: string, diagnostics: DslDiagnostic[], line: number
): { categories: string[]; values: number[] } {
  const categories: string[] = [];
  const values: number[] = [];
  for (const part of value.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^(.*?)\s+(-?\d+(?:\.\d+)?)$/);
    if (!match) {
      diagnostics.push({
        code: 'W131', severity: 'warning', line, col: 1, endCol: 1, source: 'parse',
        message: `Series value "${trimmed}" is not "Category number"`,
        hint: 'Jan 12, Feb 19',
      });
      continue;
    }
    categories.push(match[1]!.trim());
    values.push(Number(match[2]));
  }
  return { categories, values };
}

function parsePointPair(value: string): [number, number] | null {
  const match = value.trim().match(/^\[?\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]?$/);
  if (!match) return null;
  const pair: [number, number] = [Number(match[1]), Number(match[2])];
  return pair.every((entry) => Number.isFinite(entry)) ? pair : null;
}

function pairOf(value: string, fallback: readonly [string, string]): [string, string] {
  const parts = value.split(',').map((part) => part.trim()).filter(Boolean);
  return parts.length >= 2 ? [parts[0]!, parts[1]!] : [fallback[0], fallback[1]];
}

function quadOf(value: string, fallback: readonly [string, string, string, string]): [string, string, string, string] {
  const parts = value.split(',').map((part) => part.trim()).filter(Boolean);
  return parts.length >= 4
    ? [parts[0]!, parts[1]!, parts[2]!, parts[3]!]
    : [fallback[0], fallback[1], fallback[2], fallback[3]];
}

function segmentText(segment: DslSegment): string {
  return segment.tokens.map((token) => token.value).join(' ').trim();
}

function trimNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(4)));
}

export const chartFamily: Family = {
  name: 'chart',

  async compile(segments, context: FamilyContext): Promise<FamilyScene> {
    const kind = chartKindOfHeader(context.header, context.diagnostics);
    const series: { name: string; values: number[] }[] = [];
    let categories: string[] = [];
    const quadrantPoints: { label: string; x: number; y: number }[] = [];
    let quadrant: QuadrantData = { ...DEFAULT_QUADRANT, points: quadrantPoints };

    for (const segment of segments) {
      const text = segmentText(segment);
      if (!text) continue;
      if (text.startsWith('x:')) {
        quadrant = { ...quadrant, xLabels: pairOf(text.slice(2), quadrant.xLabels) };
        continue;
      }
      if (text.startsWith('y:')) {
        quadrant = { ...quadrant, yLabels: pairOf(text.slice(2), quadrant.yLabels) };
        continue;
      }
      if (text.startsWith('quadrants:')) {
        quadrant = { ...quadrant, quadrants: quadOf(text.slice('quadrants:'.length), quadrant.quadrants) };
        continue;
      }
      if (kind === 'quadrant' || text.endsWith(']')) {
        const pair = parsePointPair(text.replace(/^(.+?)\s*(\[.*\])$/, '$2'));
        const label = text.replace(/\s*\[.*\]\s*$/, '').trim();
        if (pair && label) {
          quadrantPoints.push({
            label,
            x: Math.min(1, Math.max(0, pair[0])),
            y: Math.min(1, Math.max(0, pair[1])),
          });
        } else {
          context.diagnostics.push(tokenDiagnostic('W131', 'warning',
            segment.tokens[0] ?? { value: '', line: segment.line, col: 1, endCol: 1, kind: 'word' },
            `Quadrant point "${label || text}" needs [x, y] in 0–1`, 'Feature A [0.32, 0.78]'));
        }
        continue;
      }
      const separator = text.indexOf(':');
      if (separator <= 0) {
        context.diagnostics.push({
          code: 'W131', severity: 'warning', line: segment.line, col: 1, endCol: 1, source: 'parse',
          message: `Chart line "${text}" is not "Name: Category value, …"`,
          hint: 'Revenue: Jan 12, Feb 19',
        });
        continue;
      }
      const parsed = parseSeries(text.slice(separator + 1), context.diagnostics, segment.line);
      if (parsed.values.length === 0) continue;
      if (categories.length === 0) categories = parsed.categories;
      series.push({ name: text.slice(0, separator).trim(), values: parsed.values });
    }

    const node = createChartNode(SCRATCH_PAGE, {
      // Stable across re-parses: the round-trip law compares ids, and the
      // frame's own identity already comes from the text hash.
      id: 'chart-1',
      at: { x: 0, y: 0 },
      chart: kind,
      size: DEFAULT_CHART_SIZE,
      ...(context.title ? { title: context.title } : {}),
      ...(kind === 'quadrant'
        ? { quadrant: {
            ...quadrant,
            points: quadrantPoints.length > 0 ? quadrantPoints : DEFAULT_QUADRANT.points,
          } }
        : { data: {
            categories: categories.length > 0 ? categories : ['A'],
            series: series.length > 0 ? series : [{ name: 'Series 1', values: [0] }],
          } }),
    });
    const placed = {
      ...node,
      metadata: { dsl: { line: 1, ...(context.title ? { title: context.title } : {}) } },
    };
    return {
      nodes: [placed],
      connectors: [],
      size: { ...placed.size },
      meta: { familyHeader: [kind] },
    };
  },

  serialize(scene: DslFrameScene): string[] {
    const node = scene.nodes[0];
    if (!node) return [];
    const kind = chartKindOf(node);
    const title = typeof node.content.title === 'string' ? node.content.title : undefined;
    const lines: string[] = [];
    if (title) lines.push(`title: ${quote(title)}`);
    if (kind === 'quadrant') {
      const quadrant = quadrantContent(node);
      if (!quadrant) return lines;
      lines.push(`x: ${quadrant.xLabels.join(', ')}`);
      lines.push(`y: ${quadrant.yLabels.join(', ')}`);
      lines.push(`quadrants: ${quadrant.quadrants.join(', ')}`);
      for (const point of quadrant.points) {
        lines.push(`${quote(point.label)} [${trimNumber(point.x)}, ${trimNumber(point.y)}]`);
      }
      return lines;
    }
    const data = chartDataOf(node);
    for (const series of data.series) {
      const pairs = data.categories.map((category, at) =>
        `${quote(category)} ${trimNumber(series.values[at] ?? 0)}`);
      lines.push(`${quote(series.name)}: ${pairs.join(', ')}`);
    }
    return lines;
  },
};
