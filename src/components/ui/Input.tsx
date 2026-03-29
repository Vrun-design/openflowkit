import React from 'react';
import { EDITOR_FIELD_DEFAULT_CLASS } from './editorFieldStyles';

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
    const generatedId = React.useId();
    const inputId = id ?? generatedId;

    return (
        <div className="space-y-1.5">
            {label && (
                <label htmlFor={inputId} className="block text-xs font-semibold text-[var(--brand-secondary)] uppercase tracking-wider">
                    {label}
                </label>
            )}
            <input
                id={inputId}
                ref={ref}
                className={`${EDITOR_FIELD_DEFAULT_CLASS} h-9 px-3 py-1 file:border-0 file:bg-transparent file:text-sm file:font-medium ${error ? 'border-red-300 focus:ring-red-500/20' : ''} ${className}`.trim()}
                {...props}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            {helperText && !error && <p className="text-xs text-[var(--brand-secondary)]">{helperText}</p>}
        </div>
    );
});

Input.displayName = "Input";
