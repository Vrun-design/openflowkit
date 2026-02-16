import React from 'react';
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
    className = ''
}) => {
    return (
        <div className={`border-b border-slate-100 last:border-0 ${className}`}>
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between py-3 px-1 hover:bg-slate-50 transition-colors group text-left"
            >
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 group-hover:text-slate-700">
                    {icon && <span className="text-slate-400 group-hover:text-slate-600">{icon}</span>}
                    {title}
                </span>
                <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100 mb-4' : 'max-h-0 opacity-0'
                    }`}
            >
                <div className="px-1 pt-1">
                    {children}
                </div>
            </div>
        </div>
    );
};
