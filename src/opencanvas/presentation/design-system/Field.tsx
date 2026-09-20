import { forwardRef, useId, type InputHTMLAttributes } from 'react';
interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, error, id, className = '', ...props },
  ref
) {
  const generated = useId();
  const inputId = id ?? generated;
  const message = error ?? hint;
  const describedBy = [props['aria-describedby'], message ? `${inputId}-message` : undefined]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={`ofk-field ${className}`}>
      <label htmlFor={inputId}>{label}</label>
      <input
        {...props}
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={describedBy || undefined}
      />
      {message && (
        <span id={`${inputId}-message`} data-error={Boolean(error)}>
          {message}
        </span>
      )}
    </div>
  );
});
