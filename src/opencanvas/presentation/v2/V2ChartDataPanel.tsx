import { useMemo, useState, type KeyboardEvent } from 'react';
import type { DocumentCommand } from '../../domain/commands/types';
import type { JsonObject } from '../../domain/document/json';
import type { SceneNode } from '../../domain/document/types';
import { chartDataOf } from '../../domain/nodes/chartNode';
import { quadrantContent, type QuadrantData } from '../../domain/nodes/chartNodePresentation';
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
  const quadrant = useMemo(() => quadrantContent(node), [node]);
  const [cell, setCell] = useState<Cell | null>(null);
  const [invalid, setInvalid] = useState<Cell | null>(null);
  // Inputs are controlled by the document but commit on blur: typing does not
  // spam history, and a canvas drag still updates what the panel shows.
  const [draft, setDraft] = useState<Record<string, string>>({});
  const valueOf = (key: string, fallback: string): string => draft[key] ?? fallback;
  const commitDraft = (key: string, commit: (value: string) => void) => {
    const pending = draft[key];
    setDraft((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    if (pending !== undefined) commit(pending);
  };
  const isQuadrant = quadrant !== null;

  const writeContent = (patch: JsonObject, label: string): void => {
    commit({
      kind: 'set-node',
      id: `chart-data:${node.id}`,
      label,
      pageId,
      before: node,
      after: { ...node, content: { ...node.content, ...patch } },
    });
  };

  const write = (next: ChartData): void => {
    writeContent({
      categories: [...next.categories],
      series: next.series.map((series) => ({ name: series.name, values: [...series.values] })),
    }, 'Edit chart data');
  };

  const writeQuadrant = (next: QuadrantData): void => {
    writeContent({ points: next.points.map((point) => ({ ...point })) }, 'Edit quadrant points');
  };

  const setPoint = (index: number, patch: Partial<QuadrantData['points'][number]>): void => {
    if (!quadrant) return;
    writeQuadrant({ ...quadrant,
      points: quadrant.points.map((point, at) => (at === index ? { ...point, ...patch } : point)) });
  };

  const addPoint = (): void => {
    if (!quadrant) return;
    writeQuadrant({ ...quadrant, points: [...quadrant.points,
      { label: `Point ${quadrant.points.length + 1}`, x: 0.5, y: 0.5 }] });
  };

  const removePoint = (index: number): void => {
    if (!quadrant || quadrant.points.length <= 1) return;
    writeQuadrant({ ...quadrant, points: quadrant.points.filter((_, at) => at !== index) });
  };

  const numberIn = (raw: string, fallback: number): number => {
    const value = Number(raw);
    return raw.trim() !== '' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
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
        {isQuadrant && quadrant ? (
          <table className="ofk-chart-table">
            <thead>
              <tr>
                <th scope="col"><span className="sr-only">Point</span><span aria-hidden="true">–</span></th>
                <th scope="col">x</th>
                <th scope="col">y</th>
                <th scope="col"><span className="sr-only">Remove</span></th>
              </tr>
            </thead>
            <tbody>
              {quadrant.points.map((point, index) => (
                <tr key={`point-${index}`}>
                  <th scope="row">
                    <input aria-label={`Point ${index + 1} label`}
                      value={valueOf(`label:${index}`, point.label)}
                      onChange={(event) => setDraft((current) => ({ ...current, [`label:${index}`]: event.target.value }))}
                      onBlur={() => commitDraft(`label:${index}`, (value) => setPoint(index, { label: value }))} />
                  </th>
                  <td>
                    <input aria-label={`Point ${index + 1} x`} type="number" step="0.01" min="0" max="1"
                      value={valueOf(`x:${index}`, String(point.x))}
                      onChange={(event) => setDraft((current) => ({ ...current, [`x:${index}`]: event.target.value }))}
                      onBlur={() => commitDraft(`x:${index}`, (value) => setPoint(index, { x: numberIn(value, point.x) }))} />
                  </td>
                  <td>
                    <input aria-label={`Point ${index + 1} y`} type="number" step="0.01" min="0" max="1"
                      value={valueOf(`y:${index}`, String(point.y))}
                      onChange={(event) => setDraft((current) => ({ ...current, [`y:${index}`]: event.target.value }))}
                      onBlur={() => commitDraft(`y:${index}`, (value) => setPoint(index, { y: numberIn(value, point.y) }))} />
                  </td>
                  <td>
                    <IconButton variant="quiet" label={`Remove point ${index + 1}`}
                      icon={<Icon icon={IconX} />} disabled={quadrant.points.length <= 1}
                      onClick={() => removePoint(index)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
        <table className="ofk-chart-table">
          <thead>
            <tr>
              <th scope="col"><span className="sr-only">Category</span><span aria-hidden="true">–</span></th>
              {data.series.map((series, row) => (
                <th scope="col" key={`head-${row}`}>
                  <span className="ofk-chart-head-cell">
                    <input aria-label={`Series ${row + 1} name`}
                      value={valueOf(`series:${row}`, series.name)}
                      onChange={(event) => setDraft((current) => ({ ...current, [`series:${row}`]: event.target.value }))}
                      onBlur={() => commitDraft(`series:${row}`, (value) => setSeriesName(row, value))} />
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
                    <input aria-label={`Category ${row + 1}`}
                      value={valueOf(`category:${row}`, category)}
                      onChange={(event) => setDraft((current) => ({ ...current, [`category:${row}`]: event.target.value }))}
                      onBlur={() => commitDraft(`category:${row}`, (value) => setCategory(row, value))} />
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
                      value={valueOf(`cell:${row}:${column}`, String(series.values[row] ?? 0))}
                      onFocus={() => setCell({ row: column, column: row })}
                      onKeyDown={(event) => onCellKeyDown(event, row, column)}
                      onPaste={onPaste}
                      onChange={(event) => setDraft((current) => ({ ...current, [`cell:${row}:${column}`]: event.target.value }))}
                      onBlur={() => commitDraft(`cell:${row}:${column}`, (value) => setValue(column, row, value))}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
      <footer className="ofk-chart-panel-foot">
        {isQuadrant ? (
          <Button variant="secondary" onClick={addPoint}><Icon icon={IconPlus} /> Point</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={addRow}><Icon icon={IconPlus} /> Row</Button>
            <Button variant="secondary" onClick={addSeries}><Icon icon={IconPlus} /> Series</Button>
          </>
        )}
      </footer>
      <p className="sr-only" aria-live="polite">
        {cell ? `Editing ${data.series[cell.row]?.name ?? ''} ${data.categories[cell.column] ?? ''}` : ''}
      </p>
    </Panel>
  );
}
