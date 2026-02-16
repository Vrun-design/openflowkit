import React from 'react';
import { NodeData } from '@/lib/types';

interface ShapeSelectorProps {
    selectedShape?: NodeData['shape'];
    onChange: (shape: NodeData['shape']) => void;
}

const SHAPES: { value: NodeData['shape'], label: string, svg: React.ReactNode }[] = [
    { value: 'rectangle', label: 'Rect', svg: <rect x="2" y="4" width="16" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" /> },
    { value: 'rounded', label: 'Rounded', svg: <rect x="2" y="4" width="16" height="12" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" /> },
    { value: 'capsule', label: 'Capsule', svg: <rect x="2" y="5" width="16" height="10" rx="5" fill="none" stroke="currentColor" strokeWidth="1.5" /> },
    { value: 'diamond', label: 'Diamond', svg: <polygon points="10,2 18,10 10,18 2,10" fill="none" stroke="currentColor" strokeWidth="1.5" /> },
    { value: 'hexagon', label: 'Hexagon', svg: <polygon points="5,2 15,2 19,10 15,18 5,18 1,10" fill="none" stroke="currentColor" strokeWidth="1.5" /> },
    { value: 'cylinder', label: 'Db', svg: <><ellipse cx="10" cy="5" rx="7" ry="3" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M3 5 L3 15 C3 17 10 19 17 15 L17 5" fill="none" stroke="currentColor" strokeWidth="1.5" /></> },

    { value: 'parallelogram', label: 'I/O', svg: <polygon points="5,3 19,3 15,17 1,17" fill="none" stroke="currentColor" strokeWidth="1.5" /> },
    { value: 'circle', label: 'Circle', svg: <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" /> },
];

export const ShapeSelector: React.FC<ShapeSelectorProps> = ({ selectedShape, onChange }) => {
    return (
        <div className="grid grid-cols-4 gap-2 mb-3">
            {SHAPES.map(({ value, label, svg }) => (
                <button
                    key={value}
                    onClick={() => onChange(value)}
                    className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-[var(--brand-radius)] text-[10px] font-semibold transition-all
                        ${(selectedShape || 'rounded') === value
                            ? 'bg-[var(--brand-primary-50)] text-[var(--brand-primary-600)] ring-1 ring-[var(--brand-primary-200)]'
                            : 'bg-[var(--brand-background)] text-[var(--brand-secondary)] hover:bg-[var(--brand-surface)] hover:text-[var(--brand-text)] hover:shadow-sm'
                        }`}
                    title={label}
                >
                    <svg viewBox="0 0 20 20" className="w-5 h-5 opacity-80">{svg}</svg>
                </button>
            ))}
        </div>
    );
};
