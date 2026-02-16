import React from 'react';

interface SwitchProps {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    label?: string;
    className?: string;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onCheckedChange, label, className = '' }) => {
    return (
        <label className={`flex items-center gap-3 cursor-pointer group ${className}`}>
            <div className="relative">
                <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={(e) => onCheckedChange(e.target.checked)}
                />
                <div className={`w-9 h-5 rounded-full transition-colors duration-200 ease-in-out ${checked ? 'bg-[var(--brand-primary)]' : 'bg-slate-200 group-hover:bg-slate-300'}`}></div>
                <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${checked ? 'translate-x-4' : 'translate-x-0'}`}></div>
            </div>
            {label && <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">{label}</span>}
        </label>
    );
};
