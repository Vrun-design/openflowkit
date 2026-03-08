import React from 'react';

export interface SegmentedChoiceItem {
    id: string;
    label: React.ReactNode;
}

interface SegmentedChoiceProps {
    items: SegmentedChoiceItem[];
    selectedId?: string;
    onSelect: (id: string) => void;
    columns?: number;
    size?: 'sm' | 'md';
}

const GRID_COLUMNS: Record<number, string> = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
};

export function SegmentedChoice({
    items,
    selectedId,
    onSelect,
    columns = 3,
    size = 'md',
}: SegmentedChoiceProps): React.ReactElement {
    const gridClass = GRID_COLUMNS[columns] || 'grid-cols-3';
    const sizeClass = size === 'sm' ? 'py-1.5 text-[11px]' : 'py-2 text-xs';

    return (
        <div className={`grid ${gridClass} gap-2`}>
            {items.map((item) => {
                const selected = item.id === selectedId;
                return (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelect(item.id)}
                        className={`${sizeClass} rounded-[var(--brand-radius)] border font-medium transition-all ${
                            selected
                                ? 'bg-[var(--brand-primary-50)] border-[var(--brand-primary-200)] text-[var(--brand-primary-700)]'
                                : 'bg-[var(--brand-surface)] border-slate-200 text-[var(--brand-secondary)]'
                        }`}
                    >
                        {item.label}
                    </button>
                );
            })}
        </div>
    );
}
