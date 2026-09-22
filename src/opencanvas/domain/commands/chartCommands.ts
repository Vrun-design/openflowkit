import type { DocumentCommand } from './types';
import type { ScenePage } from '../document/types';
import type { ChartKind } from '../nodes/chartNodePresentation';
import { buildNodeStateMap } from '../scene/nodeState';

/** Switch the chart type on every selected chart; the data is untouched. */
export function buildSetChartKindCommand(
  page: ScenePage, ids: readonly string[], chart: ChartKind
): DocumentCommand | null {
  const selected = new Set(ids);
  const states = buildNodeStateMap(page);
  const commands: DocumentCommand[] = page.nodes
    .filter((node) => node.kind === 'chart' && selected.has(node.id)
      && !states.get(node.id)?.locked && node.content.chart !== chart)
    .map((before) => ({
      kind: 'set-node' as const, id: `chart-kind:${before.id}`, label: 'Change chart type',
      pageId: page.id, before, after: { ...before, content: { ...before.content, chart } },
    }));
  return commands.length ? { kind: 'batch', id: 'set-chart-kind', label: 'Change chart type', commands } : null;
}
