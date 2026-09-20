import type { ReactNode } from 'react';
export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
const symbols: Record<StatusTone, string> = {
  neutral: '·',
  info: 'i',
  success: '✓',
  warning: '!',
  danger: '!',
};
export function Status({
  tone = 'neutral',
  children,
  live = false,
}: {
  tone?: StatusTone;
  children: ReactNode;
  live?: boolean;
}) {
  return (
    <span
      className="ofk-status"
      data-tone={tone}
      role={live ? 'status' : undefined}
      aria-atomic={live || undefined}
    >
      <span aria-hidden="true">{symbols[tone]}</span>
      {children}
    </span>
  );
}
