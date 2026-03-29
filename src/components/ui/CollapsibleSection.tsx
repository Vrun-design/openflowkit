import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  isOpen,
  onToggle,
  children,
  className = '',
}) => {
  const contentId = useId();

  return (
    <div className={`border-b border-[var(--color-brand-border)] last:border-0 ${className}`}>
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className="w-full flex items-center justify-between py-3 px-1 hover:bg-[var(--brand-background)] transition-colors group text-left"
      >
        <span className="text-xs font-bold text-[var(--brand-secondary)] uppercase tracking-wider flex items-center gap-2 group-hover:text-[var(--brand-text)]">
          {icon && (
            <span className="text-[var(--brand-secondary)] group-hover:text-[var(--brand-text)]">
              {icon}
            </span>
          )}
          {title}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[var(--brand-secondary)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        id={contentId}
        role="region"
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[500px] opacity-100 mb-4' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-1 pt-1">{children}</div>
      </div>
    </div>
  );
};
