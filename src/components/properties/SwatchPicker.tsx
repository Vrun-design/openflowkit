import React from 'react';
import { Check } from 'lucide-react';

export interface SwatchPickerItem {
    id: string;
    label: string;
    backgroundColor: string;
    accentColor?: string;
    preview?: React.ReactNode;
}

interface SwatchPickerProps {
    items: SwatchPickerItem[];
    selectedId?: string;
    onSelect: (id: string, button?: HTMLButtonElement | null) => void;
    columns?: number;
    size?: 'sm' | 'md';
    showCaption?: boolean;
    caption?: string;
}

const GRID_COLUMNS: Record<NonNullable<SwatchPickerProps['columns']>, string> = {
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
    7: 'grid-cols-7',
};

export function SwatchPicker({
    items,
    selectedId,
    onSelect,
    columns = 5,
    size = 'md',
    showCaption = false,
    caption,
}: SwatchPickerProps): React.ReactElement {
    const sizeClass = size === 'sm' ? 'h-8' : 'h-10';
    const dotSizeClass = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
    const gridClass = GRID_COLUMNS[columns] || GRID_COLUMNS[5];

    return (
        <div className="space-y-3">
            <div className={`grid ${gridClass} gap-2`}>
                {items.map((item) => {
                    const selected = selectedId === item.id;
                    const innerBackground = selected
                        ? '#ffffff'
                        : item.accentColor || item.backgroundColor;
                    const innerBorderColor = selected
                        ? 'rgba(15, 23, 42, 0.18)'
                        : item.accentColor || innerBackground;
                    const innerColor = selected
                        ? '#0f172a'
                        : item.accentColor || '#64748b';

                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={(event) => onSelect(item.id, event.currentTarget)}
                            title={item.label}
                            aria-label={item.label}
                            className={`flex ${sizeClass} items-center justify-center rounded-[var(--brand-radius)] border transition-all hover:-translate-y-0.5 ${
                                selected
                                    ? 'border-[var(--brand-primary)] shadow-sm'
                                    : 'border-[var(--color-brand-border)] hover:border-[var(--brand-secondary)]'
                            }`}
                            style={{ backgroundColor: item.backgroundColor }}
                        >
                            {selected ? (
                                <span
                                    className={`inline-flex ${dotSizeClass} items-center justify-center rounded-full border`}
                                    style={{
                                        backgroundColor: innerBackground,
                                        borderColor: innerBorderColor,
                                        color: innerColor,
                                    }}
                                >
                                    <Check className="h-3 w-3" />
                                </span>
                            ) : item.preview ?? null}
                        </button>
                    );
                })}
            </div>

            {showCaption && caption && (
                <div className="text-xs font-medium text-[var(--brand-secondary)]">
                    {caption}
                </div>
            )}
        </div>
    );
}
