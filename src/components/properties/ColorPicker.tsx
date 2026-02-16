import React from 'react';
import { Palette } from 'lucide-react';

interface ColorPickerProps {
    selectedColor?: string;
    onChange: (color: string) => void;
}

const COLORS = ['slate', 'blue', 'emerald', 'amber', 'red', 'violet', 'pink', 'yellow'];

export const ColorPicker: React.FC<ColorPickerProps> = ({ selectedColor, onChange }) => {
    return (
        <div className="space-y-3">

            <div className="flex flex-wrap gap-2">
                {COLORS.map((color) => (
                    <button
                        key={color}
                        onClick={() => onChange(color)}
                        className={`
                            w-8 h-8 rounded-full border-2 transition-transform hover:scale-110
                            ${selectedColor === color ? 'border-[var(--brand-primary)] scale-110' : 'border-transparent'}
                        `}
                        style={{ backgroundColor: `var(--color-${color}-100)` }}
                    >
                        <div className={`w-full h-full rounded-full bg-${color}-500 opacity-20 hover:opacity-100 transition-opacity`} />
                    </button>
                ))}
            </div>
        </div>
    );
};
