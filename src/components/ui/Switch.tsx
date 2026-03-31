import React from 'react';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onCheckedChange,
  label,
  className = '',
  disabled = false,
}) => {
  return (
    <label
      className={`flex items-center gap-3 group ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${className}`}
    >
      <div className="relative">
        <input
          type="checkbox"
          role="switch"
          aria-checked={checked}
          aria-disabled={disabled}
          className="sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onCheckedChange(e.target.checked)}
        />
        <div
          className={`w-9 h-5 rounded-full transition-colors duration-200 ease-in-out ${checked ? 'bg-[var(--brand-primary)]' : 'bg-[var(--color-brand-border)]'} ${disabled ? '' : 'group-hover:bg-[var(--brand-secondary)]'}`}
        ></div>
        <div
          className={`absolute top-1 left-1 h-3 w-3 rounded-full bg-[var(--brand-surface)] shadow-sm transform transition-transform duration-200 ease-in-out ${checked ? 'translate-x-4' : 'translate-x-0'}`}
        ></div>
      </div>
      {label && (
        <span className={`text-sm font-medium text-[var(--brand-secondary)] transition-colors ${disabled ? '' : 'group-hover:text-[var(--brand-text)]'}`}>
          {label}
        </span>
      )}
    </label>
  );
};
