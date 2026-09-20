import type { CSSProperties, ReactNode } from 'react';

/**
 * Loading language: skeletons hold layout while content resolves, spinners
 * mark busy controls, progress tracks bounded work, thinking marks agent
 * cognition. All motion parks under reduced-motion and forced-colors rules.
 */

/** Shimmering placeholder that holds layout. Decorative: the host owns announcements. */
export function Skeleton({
  width = '100%',
  height = 14,
  radius = 6,
  className = '',
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      className={`ofk-skeleton ${className}`}
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

/** Stacked text-line placeholders; the last line runs short like real prose. */
export function SkeletonLines({ rows = 3, gap = 8 }: { rows?: number; gap?: number }) {
  const count = Math.max(1, Math.floor(rows));
  return (
    <span aria-hidden="true" className="ofk-skeleton-lines" style={{ gap }}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} width={i === count - 1 && count > 1 ? '62%' : '100%'} />
      ))}
    </span>
  );
}

/** Standalone busy mark with an accessible name. Pair with visible text where space allows. */
export function Spinner({
  label = 'Loading',
  size = 'md',
}: {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <span className="ofk-spinner" data-size={size} role="status" aria-label={label}>
      <span className="ofk-busy" aria-hidden="true" />
    </span>
  );
}

export interface ProgressProps {
  label: string;
  hideLabel?: boolean;
  /** Omit for indeterminate work (imports resolving, model streaming without totals). */
  value?: number;
  max?: number;
  className?: string;
}

/** Bounded work gets a measured bar; unbounded work gets an indeterminate sweep. */
export function Progress({ label, hideLabel, value, max = 100, className = '' }: ProgressProps) {
  const determinate = value !== undefined;
  const clamped = determinate ? Math.max(0, Math.min(max, value)) : 0;
  const percent = determinate ? (clamped / max) * 100 : undefined;
  return (
    <div className={`ofk-progress ${className}`} data-hide-label={hideLabel || undefined}>
      <span className="ofk-progress-label">{label}</span>
      <div
        className="ofk-progress-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={determinate ? max : undefined}
        aria-valuenow={determinate ? Math.round(clamped) : undefined}
        aria-valuetext={determinate ? `${Math.round(percent!)}%` : 'In progress'}
      >
        <div
          className="ofk-progress-fill"
          data-indeterminate={determinate ? undefined : true}
          style={determinate ? { width: `${percent}%` } : undefined}
        />
      </div>
    </div>
  );
}

/** Agent cognition state: animated dots plus a live label. Never a progress fake. */
export function Thinking({
  label = 'Thinking',
  detail,
}: {
  label?: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <span className="ofk-thinking" role="status">
      <span className="ofk-thinking-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="ofk-thinking-label">
        {label}
        {detail && <span className="ofk-caption"> · {detail}</span>}
      </span>
    </span>
  );
}
