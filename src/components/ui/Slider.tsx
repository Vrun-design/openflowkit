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
                <div className="flex justify-between items-center bg-slate-50 px-2 py-1 rounded">
                    {label && <span className="text-xs font-medium text-slate-500">{label}</span>}
                    {valueDisplay && <span className="text-xs font-mono text-slate-400">{valueDisplay}</span>}
                </div>
            )}
            <input
                type="range"
                ref={ref}
                className={`
                    w-full h-1.5 bg-slate-200 rounded-[var(--brand-radius)] appearance-none cursor-pointer accent-[var(--brand-primary)]
                    focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20
                    ${className}
                `}
                {...props}
            />
        </div>
    );
});

Slider.displayName = "Slider";
