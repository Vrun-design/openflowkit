import { useMemo, useState, type KeyboardEvent } from 'react';
import type { DocumentCommand } from '../../domain/commands/types';
import type { SceneNode } from '../../domain/document/types';
import { chartDataOf } from '../../domain/nodes/chartNode';
import type { ChartData } from '../../domain/nodes/chartNodePresentation';
import { Button, Icon, IconButton, Panel } from '../design-system';
import { IconPlus, IconX } from '@tabler/icons-react';

export interface V2ChartDataPanelProps {
  readonly node: SceneNode;
  readonly pageId: string;
  readonly commit: (command: DocumentCommand) => void;
  readonly onClose: () => void;
}

interface Cell {
  readonly row: number;
  readonly column: number;
}

// Chart data is data, so unlike a drag this panel *does* write the source
// (grammar §6.7): every commit is one set-node, so one undo step per edit.
export function V2ChartDataPanel({ node, pageId, commit, onClose }: V2ChartDataPanelProps): React.JSX.Element {
  const data = useMemo(() => chartDataOf(node), [node]);
  const [cell, setCell] = useState<Cell | null>(null);
  const [invalid, setInvalid] = useState<Cell | null>(null);
  // The quadrant chart kind lands in 6.9; until then only data charts here.
  const isQuadrant = node.content.chart === 'quadrant';

  const write = (next: ChartData): void => {
    commit({
      kind: 'set-node',
      id: `chart-data:${node.id}`,
      label: 'Edit chart data',
      pageId,
      before: node,
      after: {
        ...node,
        content: {
          ...node.content,
          categories: [...next.categories],
          series: next.series.map((series) => ({ name: series.name, values: [...series.values] })),
        },
      },
    });
  };

  const setValue = (row: number, column: number, raw: string): void => {
    const value = Number(raw.trim() === '' ? '0' : raw);
    const series = data.series.map((entry, index) => index === row
      ? { ...entry, values: entry.values.map((item, at) => (at === column ? value : item)) }
      : entry);
    if (!Number.isFinite(value)) {
      // Keep what the author typed on screen; the document keeps the old value.
      setInvalid({ row, column });
      return;
    }
    setInvalid(null);
    write({ ...data, series });
  };

  const setCategory = (column: number, label: string): void => {
    write({ ...data, categories: data.categories.map((item, at) => (at === column ? label : item)) });
  };

  const setSeriesName = (row: number, name: string): void => {
    write({ ...data, series: data.series.map((entry, index) => (index === row ? { ...entry, name } : entry)) });
  };

  const addRow = (): void => {
    write({ ...data, categories: [...data.categories, `Row ${data.categories.length + 1}`],
      series: data.series.map((entry) => ({ ...entry, values: [...entry.values, 0] })) });
  };

  const addSeries = (): void => {
    write({ ...data, series: [...data.series, {
      name: `Series ${data.series.length + 1}`,
      values: data.categories.map(() => 0),
    }] });
  };

  const removeRow = (row: number): void => {
    if (data.categories.length <= 1) return;
    write({ ...data,
      categories: data.categories.filter((_, index) => index !== row),
      series: data.series.map((entry) => ({ ...entry, values: entry.values.filter((_, index) => index !== row) })) });
  };

  const removeSeries = (row: number): void => {
    if (data.series.length <= 1) return;
    write({ ...data, series: data.series.filter((_, index) => index !== row) });
  };

  // Enter commits the value (blur) and moves down a row, like a spreadsheet.
  const onCellKeyDown = (event: KeyboardEvent<HTMLInputElement>, row: number, column: number): void => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const nextRow = row + 1 < data.categories.length ? row + 1 : row;
    const nextCell = { row: column, column: nextRow };
    setCell(nextCell);
    event.currentTarget.blur();
    const target = document.querySelector<HTMLInputElement>(`[data-chart-cell="${column}:${nextRow}"]`);
    target?.focus();
    target?.select();
  };

  const onPaste = (event: React.ClipboardEvent<HTMLInputElement>): void => {
    const text = event.clipboardData.getData('text/plain');
    if (!text.includes('\t') && !text.includes('\n')) return;
    event.preventDefault();
    const rows = text.trim().split(/\r?\n/).map((line) => line.split('\t').length > 1 ? line.split('\t') : line.split(','));
    if (rows.length === 0) return;
    const categories = rows.map((line) => line[0]?.trim() ?? '');
    const seriesCount = Math.max(1, ...rows.map((line) => Math.max(0, line.length - 1)));
    const series = Array.from({ length: seriesCount }, (_, seriesIndex) => ({
      name: data.series[seriesIndex]?.name ?? `Series ${seriesIndex + 1}`,
      values: rows.map((line) => Number(line[seriesIndex + 1] ?? '0') || 0),
    }));
    write({ categories, series });
  };

  return (
    <Panel className="ofk-chart-panel" title={isQuadrant ? 'Quadrant points' : 'Chart data'}
      onClose={onClose}>
      <div className="ofk-chart-panel-body">
        <table className="ofk-chart-table">
          <thead>
            <tr>
              <th scope="col"><span className="sr-only">Category</span><span aria-hidden="true">–</span></th>
              {data.series.map((series, row) => (
                <th scope="col" key={`head-${row}`}>
                  <span className="ofk-chart-head-cell">
                    <input aria-label={`Series ${row + 1} name`} value={series.name}
                      onChange={(event) => setSeriesName(row, event.target.value)} />
                    <IconButton variant="quiet" label={`Remove series ${row + 1}`}
                      icon={<Icon icon={IconX} />} disabled={data.series.length <= 1}
                      onClick={() => removeSeries(row)} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.categories.map((category, row) => (
              <tr key={`row-${row}`}>
                <th scope="row">
                  <span className="ofk-chart-head-cell">
                    <input aria-label={`Category ${row + 1}`} value={category}
                      onChange={(event) => setCategory(row, event.target.value)} />
                    <IconButton variant="quiet" label={`Remove row ${row + 1}`}
                      icon={<Icon icon={IconX} />} disabled={data.categories.length <= 1}
                      onClick={() => removeRow(row)} />
                  </span>
                </th>
                {data.series.map((series, column) => (
                  <td key={`cell-${row}-${column}`}>
                    <input
                      data-chart-cell={`${column}:${row}`}
                      aria-label={`${series.name} ${category}`}
                      aria-invalid={invalid?.row === column && invalid.column === row || undefined}
                      defaultValue={String(series.values[row] ?? 0)}
                      onFocus={() => setCell({ row: column, column: row })}
                      onKeyDown={(event) => onCellKeyDown(event, row, column)}
                      onPaste={onPaste}
                      onBlur={(event) => setValue(column, row, event.target.value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer className="ofk-chart-panel-foot">
        <Button variant="secondary" onClick={addRow}><Icon icon={IconPlus} /> Row</Button>
        <Button variant="secondary" onClick={addSeries}><Icon icon={IconPlus} /> Series</Button>
      </footer>
      <p className="sr-only" aria-live="polite">
        {cell ? `Editing ${data.series[cell.row]?.name ?? ''} ${data.categories[cell.column] ?? ''}` : ''}
      </p>
    </Panel>
  );
}
