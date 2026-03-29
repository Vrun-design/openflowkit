import React from 'react';

interface PropertySliderRowProps {
    label: string;
    valueLabel: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (value: number) => void;
    labelClassName?: string;
    sliderClassName?: string;
    containerClassName?: string;
}

export function PropertySliderRow({
    label,
    valueLabel,
    value,
    min,
    max,
    step = 1,
    onChange,
    labelClassName = 'text-xs text-[var(--brand-secondary)]',
    sliderClassName = 'h-2 rounded-[var(--brand-radius)] bg-[var(--color-brand-border)] accent-[var(--brand-primary)]',
    containerClassName = 'space-y-1',
}: PropertySliderRowProps): React.ReactElement {
    return (
        <div className={containerClassName}>
            <div className={`flex items-center justify-between ${labelClassName}`.trim()}>
                <span>{label}</span>
                <span>{valueLabel}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(event) => onChange(Number(event.target.value))}
                className={`w-full cursor-pointer appearance-none ${sliderClassName}`.trim()}
            />
        </div>
    );
}
