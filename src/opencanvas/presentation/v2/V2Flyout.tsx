import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { Icon, IconButton, Popover, Tooltip } from '../design-system';
import type { ToolOption, ToolSection } from './v2ToolCatalog';

// A rail button with a corner triangle that opens a grid of variants. The
// button keeps one icon and a click always opens the grid (Miro): the pick is
// one visible step, never a hidden second click. The tool's letter re-arms the
// last pick without the grid. Picking arms the variant and closes. A flyout
// with `sections` (More) shows a heading over each group of cells.
export function FlyoutButton<T extends string>(props: {
  readonly label: string;
  readonly shortcut?: string;
  readonly icon: ReactNode;
  readonly selected: boolean;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly options: readonly ToolOption<T>[] | readonly ToolSection<T>[];
  /** Nothing picked yet (More): focus lands on the first cell. */
  readonly selectedId: T | null;
  readonly onPick: (id: T) => void;
  /** Narrow grids (connectors) read better at half width. */
  readonly columns?: number;
}): React.JSX.Element {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const headingId = useId();
  const sections: readonly ToolSection<T>[] = isSectioned(props.options)
    ? props.options : [{ title: '', options: props.options }];
  const options = sections.flatMap((section) => section.options);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowRight') return;
    event.preventDefault();
    props.onOpenChange(true);
  };

  // The grid is a listbox: arrows move by cell, Home/End to the ends. Focus is
  // managed (not a tab stop per cell) so the Popover's focus return stays intact.
  // Up/Down go by position, so they cross into a section with a short last row.
  const moveFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    const cells = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]'));
    const index = cells.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    const next = event.key === 'ArrowRight' ? cells[index + 1]
      : event.key === 'ArrowLeft' ? cells[index - 1]
        : event.key === 'ArrowDown' || event.key === 'ArrowUp' ? verticalNeighbour(cells, cells[index]!, event.key === 'ArrowDown')
          : event.key === 'Home' ? cells[0]
            : event.key === 'End' ? cells[cells.length - 1]
              : undefined;
    if (!next) {
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') event.preventDefault();
      return;
    }
    event.preventDefault();
    next.focus();
  };

  const autofocusId = props.open
    ? (options.some((option) => option.id === props.selectedId) ? props.selectedId : options[0]?.id ?? null)
    : null;
  const cell = (option: ToolOption<T>) => (
    <Tooltip key={option.id} content={option.label} shortcut={option.shortcut}>
      <button
        type="button"
        role="option"
        aria-selected={option.id === props.selectedId}
        aria-label={option.label}
        className="ofk-v2-flyout-cell"
        data-selected={option.id === props.selectedId || undefined}
        {...(autofocusId === option.id ? { 'data-autofocus': '' } : {})}
        tabIndex={-1}
        onClick={() => {
          props.onPick(option.id);
          props.onOpenChange(false);
        }}
      >
        <Icon icon={option.icon} />
      </button>
    </Tooltip>
  );
  const grid = (cells: readonly ToolOption<T>[]) => (
    <div className="ofk-v2-flyout-grid" style={{ gridTemplateColumns: `repeat(${props.columns ?? 4}, 1fr)` }}>
      {cells.map(cell)}
    </div>
  );
  return (
    <>
      <Tooltip content={props.label} shortcut={props.shortcut}>
        <IconButton
          ref={anchorRef}
          variant="quiet"
          label={props.label}
          icon={props.icon}
          selected={props.selected}
          data-flyout=""
          aria-haspopup="dialog"
          aria-expanded={props.open}
          onKeyDown={onKeyDown}
          onClick={() => props.onOpenChange(!props.open)}
        />
      </Tooltip>
      <Popover role="dialog" aria-label={`${props.label} options`} open={props.open}
        anchorRef={anchorRef} onClose={() => props.onOpenChange(false)} placement="right-start"
        gap={12} className="ofk-v2-flyout" onKeyDown={moveFocus}
        onPointerDown={(event) => event.stopPropagation()}>
        <div role="listbox" aria-label={props.label} tabIndex={-1}>
          {sections.map((section, index) => section.title ? (
            <div key={section.title} role="group" aria-labelledby={`${headingId}-${index}`} className="ofk-v2-flyout-section">
              <div id={`${headingId}-${index}`} className="ofk-v2-flyout-heading">{section.title}</div>
              {grid(section.options)}
            </div>
          ) : <div key={index}>{grid(section.options)}</div>)}
        </div>
      </Popover>
    </>
  );
}

function isSectioned<T extends string>(
  options: readonly ToolOption<T>[] | readonly ToolSection<T>[]
): options is readonly ToolSection<T>[] {
  return options.length > 0 && 'options' in options[0]!;
}

/** The nearest cell in the next row up or down, by horizontal centre. */
function verticalNeighbour(cells: readonly HTMLButtonElement[], from: HTMLButtonElement, down: boolean): HTMLButtonElement | undefined {
  const origin = from.getBoundingClientRect();
  const centre = (rect: DOMRect) => rect.left + rect.width / 2;
  const rows = cells
    .map((cell) => ({ cell, rect: cell.getBoundingClientRect() }))
    .filter(({ rect }) => (down ? rect.top > origin.top + 1 : rect.top < origin.top - 1));
  if (rows.length === 0) return undefined;
  const rowTop = down ? Math.min(...rows.map(({ rect }) => rect.top)) : Math.max(...rows.map(({ rect }) => rect.top));
  return rows
    .filter(({ rect }) => Math.abs(rect.top - rowTop) <= 1)
    .sort((a, b) => Math.abs(centre(a.rect) - centre(origin)) - Math.abs(centre(b.rect) - centre(origin)))[0]?.cell;
}
