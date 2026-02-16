import React, { useState, useMemo } from 'react';
import { Search, Ban, Upload } from 'lucide-react';
import { ICON_MAP } from '../IconMap';

interface IconPickerProps {
    selectedIcon?: string;
    customIconUrl?: string;
    onChange: (icon: string) => void;
    onCustomIconChange: (url?: string) => void;
}

export const IconPicker: React.FC<IconPickerProps> = ({
    selectedIcon,
    customIconUrl,
    onChange,
    onCustomIconChange
}) => {
    const [iconSearch, setIconSearch] = useState('');

    const filteredIcons = useMemo(() => {
        const term = iconSearch.toLowerCase();
        const allKeys = Object.keys(ICON_MAP);

        // Priority icons for flowcharts
        const priorityIcons = [
            'Database', 'Server', 'User', 'Users', 'Globe', 'Cloud', 'Lock', 'Unlock',
            'Shield', 'Key', 'Mail', 'MessageSquare', 'File', 'FileText', 'Folder',
            'Code', 'Terminal', 'Settings', 'Cpu', 'Smartphone', 'Tablet', 'Monitor',
            'CreditCard', 'DollarSign', 'ShoppingCart', 'Box', 'Truck', 'MapPin',
            'Search', 'Bell', 'Calendar', 'Clock', 'Check', 'X', 'AlertTriangle',
            'Info', 'HelpCircle', 'Home', 'Link', 'Share', 'Trash', 'Save', 'Edit'
        ];

        if (!term) {
            // Show priority icons first, then others
            const others = allKeys.filter(k => !priorityIcons.includes(k)).slice(0, 100);
            return [...priorityIcons.filter(k => allKeys.includes(k)), ...others];
        }

        return allKeys.filter(k => k.toLowerCase().includes(term)).slice(0, 50);

    }, [iconSearch]);

    return (
        <div className="space-y-3">
            <div className="mb-2">
                <div className="relative w-full">
                    <Search className="w-3 h-3 absolute left-2 top-2 text-[var(--brand-secondary)]" />
                    <input
                        type="text"
                        placeholder="Search icons..."
                        value={iconSearch}
                        onChange={(e) => setIconSearch(e.target.value)}
                        className="w-full pl-7 pr-2 py-1.5 bg-[var(--brand-background)] rounded-[calc(var(--brand-radius)-4px)] text-xs outline-none focus:ring-1 focus:ring-[var(--brand-primary)] text-[var(--brand-text)] border border-slate-200"
                    />
                </div>
            </div>

            <div className="grid grid-cols-6 gap-2 p-2 bg-[var(--brand-background)] rounded-[var(--brand-radius)] border border-slate-200 max-h-40 overflow-y-auto custom-scrollbar">
                {/* No Icon Option */}
                <button
                    onClick={() => onChange('none')}
                    className={`
                        p-2 rounded-lg flex items-center justify-center transition-all
                        ${selectedIcon === 'none'
                            ? 'bg-red-100 text-red-600 ring-1 ring-red-400'
                            : 'hover:bg-white hover:shadow-sm text-slate-400'
                        }
                    `}
                    title="No Icon"
                >
                    <Ban className="w-5 h-5" />
                </button>

                {filteredIcons.map((key) => {
                    const Icon = ICON_MAP[key];
                    return (
                        <button
                            key={key}
                            onClick={() => onChange(key)}
                            className={`
                                p-2 rounded-lg flex items-center justify-center transition-all
                                ${selectedIcon === key
                                    ? 'bg-[var(--brand-primary-100)] text-[var(--brand-primary)] ring-1 ring-[var(--brand-primary-400)]'
                                    : 'hover:bg-[var(--brand-surface)] hover:shadow-sm text-[var(--brand-secondary)]'
                                }
                            `}
                            title={key}
                        >
                            <Icon className="w-5 h-5" />
                        </button>
                    );
                })}
            </div>

            {/* Custom Icon Upload */}
            <div className="flex items-center gap-2">
                {customIconUrl ? (
                    <div className="flex items-center gap-2 w-full">
                        <div className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center overflow-hidden">
                            <img src={customIconUrl} alt="custom" className="w-5 h-5 object-contain" />
                        </div>
                        <span className="text-xs text-slate-500 flex-1">Custom icon</span>
                        <button
                            onClick={() => onCustomIconChange(undefined)}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 transition-colors"
                        >
                            Remove
                        </button>
                    </div>
                ) : (
                    <label className="flex items-center gap-2 w-full px-3 py-2 border border-dashed border-slate-300 rounded-[var(--brand-radius)] hover:bg-[var(--brand-background)] hover:border-[var(--brand-primary-400)] transition-all cursor-pointer text-xs text-[var(--brand-secondary)] hover:text-[var(--brand-primary)]">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload custom icon</span>
                        <input
                            type="file"
                            accept="image/svg+xml,image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                        onCustomIconChange(reader.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                }
                            }}
                        />
                    </label>
                )}
            </div>
        </div>
    );
};
