import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  busy?: boolean;
  selected?: boolean;
}
/** Busy stays focusable but cannot activate. Native disabled stays noninteractive. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    busy = false,
    selected,
    disabled,
    className = '',
    children,
    onClick,
    ...props
  },
  ref
) {
  return (
    <button
      {...props}
      ref={ref}
      type={props.type ?? 'button'}
      disabled={disabled}
      className={`ofk-button ${className}`}
      data-variant={variant}
      aria-busy={busy || undefined}
      aria-disabled={disabled || busy || undefined}
      aria-pressed={selected}
      onClick={(event) => {
        if (busy || disabled) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
    >
      {busy && <span className="ofk-busy" aria-hidden="true" />}
      {children}
    </button>
  );
});
export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'aria-label'> {
  label: string;
  icon: ReactNode;
}
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, className = '', ...props },
  ref
) {
  return (
    <Button
      {...props}
      ref={ref}
      className={`ofk-icon-button ${className}`}
      aria-label={label}
      title={props.title ?? label}
    >
      <span aria-hidden="true">{icon}</span>
    </Button>
  );
});
