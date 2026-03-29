import React from 'react';

interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    valueDisplay?: string | number;
}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(({
    className = '',
    label,
    valueDisplay,
    ...props
}, ref) => {
    return (
        <div className="space-y-2">
            {(label || valueDisplay) && (
                <div className="flex items-center justify-between rounded bg-[var(--brand-background)] px-2 py-1">
                    {label && <span className="text-xs font-medium text-[var(--brand-secondary)]">{label}</span>}
                    {valueDisplay && <span className="text-xs font-mono text-[var(--brand-secondary)]">{valueDisplay}</span>}
                </div>
            )}
            <input
                type="range"
                ref={ref}
                className={`
                    h-1.5 w-full cursor-pointer appearance-none rounded-[var(--brand-radius)] bg-[var(--color-brand-border)] accent-[var(--brand-primary)]
                    focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20
                    ${className}
                `}
                {...props}
            />
        </div>
    );
});

Slider.displayName = "Slider";
