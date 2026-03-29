import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({
    className = '',
    label,
    error,
    helperText,
    id,
    ...props
}, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;

    return (
        <div className="space-y-1.5 h-full flex flex-col">
            {label && (
                <label htmlFor={inputId} className="block text-xs font-semibold text-[var(--brand-secondary)] uppercase tracking-wider">
                    {label}
                </label>
            )}
            <textarea
                id={inputId}
                ref={ref}
                className={`
                    flex min-h-[80px] w-full rounded-[var(--brand-radius)] border bg-[var(--brand-surface)] px-3 py-2 text-sm ring-offset-[var(--brand-surface)] placeholder:text-[var(--brand-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] disabled:cursor-not-allowed disabled:opacity-50
                    ${error ? 'border-red-300 focus-visible:ring-red-500' : 'border-[var(--color-brand-border)] focus:border-[var(--brand-primary-400)]'}
                    ${className}
                `}
                {...props}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            {helperText && !error && <p className="text-xs text-[var(--brand-secondary)]">{helperText}</p>}
        </div>
    );
});

Textarea.displayName = "Textarea";
