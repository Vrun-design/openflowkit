import { useEffect, useRef, useState, type ReactNode } from 'react';
import { IconChevronDown } from '@tabler/icons-react';
import { Icon, Popover, Tooltip } from '../design-system';

// Shared building blocks for the style bar: a bar button that opens one
// popover, and the rows inside it. Every panel is one Popover; the bar keeps
// at most one open (V2ContextBar re-mounts on selection change).

interface StyleButtonProps {
  readonly label: string;
  readonly shortcut?: string;
  /** Small preview drawn in the button: a swatch, glyph or value. */
  readonly preview: ReactNode;
  readonly text?: string;
  readonly open: boolean;
  readonly onToggle: () => void;
  readonly onClose: () => void;
  readonly panelClassName?: string;
  readonly children: ReactNode;
}

export function StyleButton(props: StyleButtonProps): React.JSX.Element {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Tooltip content={props.label} shortcut={props.shortcut}>
        <button ref={ref} type="button" className="ofk-button ofk-style-button" data-variant="quiet"
          aria-label={props.label} aria-haspopup="dialog" aria-expanded={props.open} onClick={props.onToggle}>
          <span className="ofk-style-preview" aria-hidden="true">{props.preview}</span>
          {props.text ? <span className="ofk-style-text">{props.text}</span> : null}
          <Icon icon={IconChevronDown} />
        </button>
      </Tooltip>
      <Popover role="dialog" aria-label={props.label} open={props.open} anchorRef={ref} onClose={props.onClose}
        placement="bottom-start" className={`ofk-style-panel ${props.panelClassName ?? ''}`}
        onPointerDown={(event) => event.stopPropagation()}>
        {props.children}
      </Popover>
    </>
  );
}

export function PanelRow({ label, children }: { label?: string; children: ReactNode }): React.JSX.Element {
  return (
    <div className="ofk-style-row">
      {label ? <span className="ofk-caption ofk-style-row-label">{label}</span> : null}
      {children}
    </div>
  );
}

export interface SwatchOption {
  readonly id: string;
  readonly label: string;
  /** CSS colour, or 'transparent' for the slashed swatch. */
  readonly color: string;
  readonly border?: string;
}

/** Colour grid: one button per swatch, selected ring on the current value. */
export function SwatchGrid(props: {
  readonly label: string;
  readonly options: readonly SwatchOption[];
  readonly selected: string | null;
  readonly onPick: (id: string) => void;
  readonly trailing?: ReactNode;
}): React.JSX.Element {
  return (
    <div className="ofk-swatch-grid" role="radiogroup" aria-label={props.label}>
      {props.options.map((option) => (
        <button key={option.id} type="button" role="radio" aria-checked={props.selected === option.id}
          className="ofk-swatch-cell" title={option.label} aria-label={option.label}
          data-transparent={option.color === 'transparent' || undefined}
          style={option.color === 'transparent' ? undefined : { background: option.color, borderColor: option.border ?? option.color }}
          onClick={() => props.onPick(option.id)} />
      ))}
      {props.trailing}
    </div>
  );
}

/** Preset buttons for a numeric or enum value; `null` = mixed. */
export function ChoiceRow<T extends string | number>(props: {
  readonly label: string;
  readonly value: T | null;
  readonly options: readonly { readonly value: T; readonly label: ReactNode; readonly title?: string }[];
  readonly onChange: (value: T) => void;
}): React.JSX.Element {
  return (
    <div className="ofk-choice-row" role="radiogroup" aria-label={props.label}>
      {props.options.map((option) => (
        <button key={String(option.value)} type="button" role="radio" aria-checked={props.value === option.value}
          className="ofk-choice" title={option.title ?? String(option.label)} aria-label={option.title ?? String(option.value)}
          onClick={() => props.onChange(option.value)}>{option.label}</button>
      ))}
    </div>
  );
}

/** Toggle buttons that can be on together (bold, italic, ...). */
export function ToggleRow(props: {
  readonly label: string;
  readonly options: readonly { readonly id: string; readonly label: string; readonly icon: ReactNode; readonly on: boolean; readonly shortcut?: string }[];
  readonly onToggle: (id: string) => void;
}): React.JSX.Element {
  return (
    <div className="ofk-choice-row" role="group" aria-label={props.label}>
      {props.options.map((option) => (
        <Tooltip key={option.id} content={option.label} shortcut={option.shortcut}>
          <button type="button" aria-pressed={option.on} aria-label={option.label} className="ofk-choice"
            onClick={() => props.onToggle(option.id)}>{option.icon}</button>
        </Tooltip>
      ))}
    </div>
  );
}

/**
 * Live preview + single commit. `preview` pushes a draft to the renderer;
 * `apply` clears it and commits. Unmount clears any dangling preview.
 */
export function useStyleDraft<P>(onPreview: (patch: P | null) => void, onApply: (patch: P) => void) {
  const [draft, setDraft] = useState<P | null>(null);
  const previewRef = useRef(onPreview);
  useEffect(() => { previewRef.current = onPreview; }, [onPreview]);
  useEffect(() => () => previewRef.current(null), []);
  return {
    draft,
    preview(patch: P): void { setDraft(patch); onPreview(patch); },
    apply(patch: P): void { setDraft(null); onPreview(null); onApply(patch); },
    clear(): void { setDraft(null); onPreview(null); },
  };
}
