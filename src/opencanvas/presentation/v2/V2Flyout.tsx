import { useRef, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Icon, IconButton, Popover, Tooltip } from '../design-system';
import type { ToolOption } from './v2ToolCatalog';

const HOLD_MS = 350;

// A rail button with a corner triangle that opens a grid of variants. Click
// arms the last pick (tldraw/Figma); a click on the already-armed tool, a
// long-press or ArrowRight opens the grid. Picking arms the variant and closes.
export function FlyoutButton<T extends string>(props: {
  readonly label: string;
  readonly shortcut?: string;
  readonly icon: ReactNode;
  readonly selected: boolean;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly options: readonly ToolOption<T>[];
  readonly selectedId: T;
  readonly onPick: (id: T) => void;
  /** Narrow grids (connectors) read better at half width. */
  readonly columns?: number;
  /** Charts have no armed tool: every click opens the grid. */
  readonly openOnClick?: boolean;
}): React.JSX.Element {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const holdRef = useRef<number | null>(null);
  // When the press began: a click that follows its own long-press must not
  // toggle the grid shut again. Comparing timestamps self-heals a press that
  // ends off the button (no click, no stale flag).
  const pressedAtRef = useRef(0);

  const clearHold = () => {
    if (holdRef.current !== null) window.clearTimeout(holdRef.current);
    holdRef.current = null;
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    clearHold();
    pressedAtRef.current = Date.now();
    holdRef.current = window.setTimeout(() => props.onOpenChange(true), HOLD_MS);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowRight') return;
    event.preventDefault();
    props.onOpenChange(true);
  };

  // The grid is a listbox: arrows move by cell, Home/End to the ends. Focus is
  // managed (not a tab stop per cell) so the Popover's focus return stays intact.
  const moveFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    const options = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]')
    );
    const index = options.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    const columns = props.columns ?? 4;
    const next = event.key === 'ArrowRight' ? index + 1
      : event.key === 'ArrowLeft' ? index - 1
        : event.key === 'ArrowDown' ? index + columns
          : event.key === 'ArrowUp' ? index - columns
            : event.key === 'Home' ? 0
              : event.key === 'End' ? options.length - 1
                : -1;
    if (next < 0 || next >= options.length) {
      if (next >= options.length) event.preventDefault();
      return;
    }
    event.preventDefault();
    options[next]?.focus();
  };

  const autofocusId = props.open
    ? (props.options.some((option) => option.id === props.selectedId)
      ? props.selectedId
      : props.options[0]?.id ?? null)
    : null;
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
          onPointerDown={onPointerDown}
          onPointerUp={clearHold}
          onPointerLeave={clearHold}
          onKeyDown={onKeyDown}
          onClick={() => {
            clearHold();
            if (props.open && Date.now() - pressedAtRef.current >= HOLD_MS) return;
            if (props.open || props.selected || props.openOnClick) props.onOpenChange(!props.open);
            else props.onPick(props.selectedId);
          }}
        />
      </Tooltip>
      <Popover role="dialog" aria-label={`${props.label} options`} open={props.open}
        anchorRef={anchorRef} onClose={() => props.onOpenChange(false)} placement="right-start"
        gap={12} className="ofk-v2-flyout" onKeyDown={moveFocus}
        onPointerDown={(event) => event.stopPropagation()}>
        <div className="ofk-v2-flyout-grid" role="listbox" aria-label={props.label}
          tabIndex={-1}
          style={{ gridTemplateColumns: `repeat(${props.columns ?? 4}, 1fr)` }}>
          {props.options.map((option) => (
            <Tooltip key={option.id} content={option.label}>
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
          ))}
        </div>
      </Popover>
    </>
  );
}
