import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
    className = '',
    label,
    error,
    helperText,
    id,
    ...props
}, ref) => {
    const inputId = id || React.useId();

    return (
        <div className="space-y-1.5">
            {label && (
                <label htmlFor={inputId} className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {label}
                </label>
            )}
            <input
                id={inputId}
                ref={ref}
                className={`
                    flex h-9 w-full rounded-[var(--brand-radius)] border bg-white px-3 py-1 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] disabled:cursor-not-allowed disabled:opacity-50
                    ${error ? 'border-red-300 focus-visible:ring-red-500' : 'border-slate-300 shadow-sm focus:border-[var(--brand-primary-400)]'}
                    ${className}
                `}
                {...props}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            {helperText && !error && <p className="text-xs text-slate-400">{helperText}</p>}
        </div>
    );
});

Input.displayName = "Input";
