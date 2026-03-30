export const MODAL_PANEL_CLASS =
  'rounded-[var(--radius-xl)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] shadow-[var(--shadow-overlay)] ring-1 ring-black/5';

export const SECTION_CARD_CLASS =
  'rounded-[var(--radius-lg)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] shadow-[var(--shadow-xs)]';

export const SECTION_SURFACE_CLASS =
  'rounded-[var(--radius-md)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] shadow-[var(--shadow-xs)]';

export const FLOATING_BADGE_CLASS =
  'rounded-full border border-[var(--color-surface-info-border)] bg-[var(--brand-surface)]/92 shadow-[var(--shadow-floating)] ring-1 ring-[var(--color-surface-info-border)]/80';

export const STATUS_SURFACE_CLASS = {
  success:
    'border-[var(--color-surface-success-border)] bg-[var(--color-surface-success-bg)] text-[var(--color-surface-success-text)]',
  warning:
    'border-[var(--color-surface-warning-border)] bg-[var(--color-surface-warning-bg)] text-[var(--color-surface-warning-text)]',
  danger:
    'border-[var(--color-surface-danger-border)] bg-[var(--color-surface-danger-bg)] text-[var(--color-surface-danger-text)]',
  info:
    'border-[var(--color-surface-info-border)] bg-[var(--color-surface-info-bg)] text-[var(--color-surface-info-text)]',
} as const;
