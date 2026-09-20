import type { HTMLAttributes, ReactNode } from 'react';
import { Toolbar } from './Toolbar';
/** Floating bar near the selection: groups separated by hairlines; each control opens its own popover. */
export function ContextBar({
  label,
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement> & { label: string }) {
  return (
    <Toolbar {...props} label={label} className={`ofk-context ofk-floating ofk-enter ${className}`}>
      {children}
    </Toolbar>
  );
}
export function ContextGroup({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className="ofk-context-group" role="group" aria-label={label}>
      {children}
    </div>
  );
}
/** Title + close row used by popovers opened from the context bar. */
export function PopoverHeader({ title, close }: { title: string; close: ReactNode }) {
  return (
    <header className="ofk-popover-header">
      <span className="ofk-popover-title">{title}</span>
      {close}
    </header>
  );
}
