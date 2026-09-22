import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { IconAlertTriangle, IconCheck, IconChevronDown, IconChevronUp, IconMinus, IconPlus } from '@tabler/icons-react';
import { Button, IconButton } from './Button';
import { Icon } from './Icon';

/* Native inputs underneath every control: platform keyboard, AT and form semantics stay intact. */

interface LabelledProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Visually hide the label (icon-dense bars) while keeping it for AT. */
  hideLabel?: boolean;
}
export const Checkbox = forwardRef<HTMLInputElement, LabelledProps & { indeterminate?: boolean }>(
  function Checkbox({ label, hideLabel, indeterminate, className = '', ...props }, ref) {
    return (
      <label className={`ofk-check ${className}`} data-hide-label={hideLabel || undefined}>
        <input
          {...props}
          ref={(node) => {
            if (node) node.indeterminate = Boolean(indeterminate);
            if (typeof ref === 'function') ref(node);
            else if (ref) ref.current = node;
          }}
          type="checkbox"
        />
        <span className="ofk-check-box" aria-hidden="true">
          <Icon icon={indeterminate ? IconMinus : IconCheck} />
        </span>
        <span>{label}</span>
      </label>
    );
  }
);
export const Switch = forwardRef<HTMLInputElement, LabelledProps>(function Switch(
  { label, hideLabel, className = '', ...props },
  ref
) {
  return (
    <label className={`ofk-switch ${className}`} data-hide-label={hideLabel || undefined}>
      <input {...props} ref={ref} type="checkbox" role="switch" />
      <span className="ofk-switch-track" aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
});
export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  hideLabel?: boolean;
  /** Formatted readout beside the track, e.g. "2 px". */
  readout?: string;
}
export const Slider = forwardRef<HTMLInputElement, SliderProps>(function Slider(
  { label, hideLabel, readout, id, className = '', ...props },
  ref
) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <div className={`ofk-slider ${className}`} data-hide-label={hideLabel || undefined}>
      <label htmlFor={inputId}>{label}</label>
      <input {...props} ref={ref} id={inputId} type="range" />
      {readout && (
        <output htmlFor={inputId} className="ofk-numeric">
          {readout}
        </output>
      )}
    </div>
  );
});
export interface NumberFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange'
> {
  label: string;
  hideLabel?: boolean;
  /** `null` renders a mixed-value state for multi-selection; typing replaces it. */
  value: number | null;
  onChange: (value: number) => void;
  /** Fires once per committed edit (blur, Enter, stepper) for single-history commits. */
  onCommit?: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  /** Short leading glyph such as W, H, X, Y. */
  prefix?: string;
  mixedLabel?: string;
  /** Stacked arrows for inspector fields; none retains keyboard stepping. */
  stepper?: 'inline' | 'stacked' | 'none';
}
/** Numeric property input with steppers; arrow keys step, Shift steps ×10. Host clamps/commits. */
export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(function NumberField(
  {
    label,
    hideLabel,
    value,
    onChange,
    onCommit,
    step = 1,
    min,
    max,
    unit,
    prefix,
    mixedLabel = 'Mixed',
    stepper = 'inline',
    id,
    className = '',
    onBlur,
    onKeyDown,
    ...props
  },
  ref
) {
  const generated = useId();
  const inputId = id ?? generated;
  // Draft preserves in-progress typing ("1.", "", "-") while live-parsed values
  // flow to the host. Null means synced with `value`; no effect reset needed —
  // external value changes show through automatically when draft is null, and a
  // non-null draft preserves user intent until blur/Enter/Escape/stepper.
  const [draft, setDraft] = useState<string | null>(null);
  function clamp(n: number) {
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    return Number.isFinite(n) ? n : (min ?? 0);
  }
  function commit(n: number) {
    const next = clamp(n);
    onChange(next);
    onCommit?.(next);
  }
  function nudge(direction: 1 | -1, big = false) {
    setDraft(null);
    commit((value ?? 0) + direction * step * (big ? 10 : 1));
  }
  const shown = draft ?? (value === null ? '' : String(value));
  return (
    <div className={`ofk-number ${className}`} data-stepper={stepper} data-hide-label={hideLabel || undefined}>
      <label htmlFor={inputId}>{label}</label>
      <span className="ofk-number-control">
        {prefix && (
          <span className="ofk-number-prefix" aria-hidden="true">
            {prefix}
          </span>
        )}
        {stepper !== 'none' && <IconButton
          variant="quiet"
          label={`Decrease ${label}`}
          className="ofk-number-decrease"
          icon={<Icon icon={stepper === 'stacked' ? IconChevronDown : IconMinus} />}
          tabIndex={-1}
          disabled={props.disabled}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => nudge(-1)}
        />}
        <input
          {...props}
          ref={ref}
          id={inputId}
          type="text"
          inputMode="decimal"
          className="ofk-numeric"
          role="spinbutton"
          value={shown}
          placeholder={value === null ? mixedLabel : props.placeholder}
          aria-valuenow={value ?? undefined}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuetext={value === null ? mixedLabel : shown}
          onChange={(e) => {
            const text = e.target.value;
            setDraft(text);
            const n = Number.parseFloat(text);
            if (Number.isFinite(n)) onChange(clamp(n));
          }}
          onBlur={(e) => {
            onBlur?.(e);
            if (draft === null) return;
            const n = Number.parseFloat(draft);
            setDraft(null);
            if (Number.isFinite(n)) commit(n);
          }}
          onKeyDown={(e) => {
            onKeyDown?.(e);
            if (e.defaultPrevented) return;
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault();
              nudge(e.key === 'ArrowUp' ? 1 : -1, e.shiftKey);
            } else if (e.key === 'Enter' && draft !== null) {
              const n = Number.parseFloat(draft);
              setDraft(null);
              if (Number.isFinite(n)) commit(n);
              e.currentTarget.blur();
            } else if (e.key === 'Escape' && draft !== null) {
              e.preventDefault();
              setDraft(null);
              e.stopPropagation();
            }
          }}
        />
        {unit && <span className="ofk-number-unit">{unit}</span>}
        {stepper !== 'none' && <IconButton
          variant="quiet"
          label={`Increase ${label}`}
          className="ofk-number-increase"
          icon={<Icon icon={stepper === 'stacked' ? IconChevronUp : IconPlus} />}
          tabIndex={-1}
          disabled={props.disabled}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => nudge(1)}
        />}
      </span>
    </div>
  );
});
export interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: ReactNode; title?: string; disabled?: boolean }[];
}
/** Exclusive choice rendered as a radio group; arrows move selection, Tab leaves the group. */
export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: SegmentedProps<T>) {
  const name = useId();
  return (
    <div className="ofk-segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <label key={o.value} title={o.title} data-selected={o.value === value || undefined}>
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={o.value === value}
            disabled={o.disabled}
            onChange={() => onChange(o.value)}
          />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  );
}
/** Displays a color; the host opens its picker. Mixed values show a split swatch. */
export const ColorSwatch = forwardRef<
  HTMLButtonElement,
  { label: string; color: string | null; onClick?: () => void; disabled?: boolean }
>(function ColorSwatch({ label, color, onClick, disabled }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className="ofk-button ofk-swatch"
      aria-label={`${label}: ${color ?? 'mixed'}`}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <span
        aria-hidden="true"
        data-mixed={color === null || undefined}
        style={color ? { background: color } : undefined}
      />
    </button>
  );
});
export interface TabsProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  tabs: readonly { value: T; label: ReactNode; panel: ReactNode }[];
}
export function Tabs<T extends string>({ label, value, onChange, tabs }: TabsProps<T>) {
  const id = useId();
  return (
    <div className="ofk-tabs">
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={(e) => {
          const i = tabs.findIndex((t) => t.value === value);
          const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
          const next = rtl ? 'ArrowLeft' : 'ArrowRight',
            prev = rtl ? 'ArrowRight' : 'ArrowLeft';
          let target: number | undefined;
          if (e.key === next) target = (i + 1) % tabs.length;
          else if (e.key === prev) target = (i - 1 + tabs.length) % tabs.length;
          else if (e.key === 'Home') target = 0;
          else if (e.key === 'End') target = tabs.length - 1;
          if (target === undefined) return;
          e.preventDefault();
          onChange(tabs[target].value);
          (e.currentTarget.children[target] as HTMLElement)?.focus();
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            id={`${id}-tab-${t.value}`}
            aria-selected={t.value === value}
            aria-controls={`${id}-panel-${t.value}`}
            tabIndex={t.value === value ? 0 : -1}
            onClick={() => onChange(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div
          key={t.value}
          role="tabpanel"
          id={`${id}-panel-${t.value}`}
          aria-labelledby={`${id}-tab-${t.value}`}
          hidden={t.value !== value}
          tabIndex={0}
        >
          {t.panel}
        </div>
      ))}
    </div>
  );
}
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="ofk-empty">
      {icon && (
        <span className="ofk-empty-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <p className="ofk-empty-title">{title}</p>
      {description && <p className="ofk-caption">{description}</p>}
      {action}
    </div>
  );
}
/** Failed work with a way back. Announced assertively; always names what stayed safe. */
export function ErrorState({
  title,
  description,
  action,
  onRetry,
  retryLabel = 'Try again',
}: {
  title: string;
  description?: string;
  /** Custom recovery (open backup, pick another file). Defaults to a retry button. */
  action?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div className="ofk-empty" data-tone="danger" role="alert">
      <span className="ofk-empty-icon" aria-hidden="true">
        <Icon icon={IconAlertTriangle} />
      </span>
      <p className="ofk-empty-title">{title}</p>
      {description && <p className="ofk-caption">{description}</p>}
      {action ?? (onRetry && <Button onClick={onRetry}>{retryLabel}</Button>)}
    </div>
  );
}
