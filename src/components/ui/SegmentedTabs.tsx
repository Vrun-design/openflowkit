import React from 'react';

export interface SegmentedTabItem {
  id: string;
  label: React.ReactNode;
  count?: number;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface SegmentedTabsProps {
  items: SegmentedTabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  listClassName?: string;
  size?: 'sm' | 'md';
  fill?: boolean;
}

export function getSegmentedTabButtonClass(
  selected: boolean,
  size: 'sm' | 'md' = 'md',
  fill = false
): string {
  const sizeClassName =
    size === 'sm'
      ? 'h-8 rounded-[var(--radius-sm)] px-3 text-xs'
      : 'h-9 rounded-[var(--radius-sm)] px-3 text-xs';
  return `${sizeClassName} inline-flex items-center gap-2 border font-semibold transition-colors ${
    fill ? 'min-w-0 flex-1 justify-center' : 'shrink-0'
  }`;
}

export function getSegmentedTabCountClass(selected: boolean): string {
  return selected ? 'text-[var(--brand-primary-400)]' : 'text-[var(--brand-secondary-light)]';
}

export function SegmentedTabs({
  items,
  value,
  onChange,
  className = '',
  listClassName = '',
  size = 'md',
  fill = false,
}: SegmentedTabsProps): React.ReactElement {
  return (
    <div className={`overflow-x-auto pb-1 no-scrollbar ${className}`.trim()}>
      <div
        role="tablist"
        className={`flex ${fill ? 'w-full min-w-0' : 'min-w-max'} gap-2 ${listClassName}`.trim()}
      >
        {items.map((item) => {
          const selected = item.id === value;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(item.id)}
              disabled={item.disabled}
              className={`${getSegmentedTabButtonClass(selected, size, fill)} ${
                selected
                  ? 'border-[var(--brand-primary-200)] bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)]'
                  : 'border-[var(--color-brand-border)] bg-[var(--brand-surface)] text-[var(--brand-secondary)] hover:border-[var(--brand-secondary)] hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]'
              } ${item.disabled ? 'cursor-not-allowed opacity-50' : ''}`.trim()}
            >
              {item.icon ? (
                <span className="flex h-3.5 w-3.5 items-center justify-center">{item.icon}</span>
              ) : null}
              <span>{item.label}</span>
              {typeof item.count === 'number' ? (
                <span className={`text-[10px] ${getSegmentedTabCountClass(selected)}`}>
                  {item.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
