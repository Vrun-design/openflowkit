import React from 'react';
import {
    Circle,
    Database,
    Diamond,
    Hexagon,
    PanelTop,
    RectangleHorizontal,
    Square,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import type { NodeData } from '@/lib/types';

interface ToolbarAddMenuPanelProps {
    onAddShape: (shape: NodeData['shape']) => void;
}

const SHAPE_ITEMS: Array<{
    id: NodeData['shape'];
    label: string;
    icon: React.ReactNode;
    className: string;
}> = [
    { id: 'rectangle', label: 'Rectangle', icon: <RectangleHorizontal className="w-4 h-4 mr-2" />, className: 'hover:bg-slate-100' },
    { id: 'rounded', label: 'Rounded', icon: <Square className="w-4 h-4 mr-2" />, className: 'hover:bg-indigo-50 hover:text-[var(--brand-primary)]' },
    { id: 'capsule', label: 'Capsule', icon: <PanelTop className="w-4 h-4 mr-2" />, className: 'hover:bg-violet-50 hover:text-violet-600' },
    { id: 'diamond', label: 'Diamond', icon: <Diamond className="w-4 h-4 mr-2" />, className: 'hover:bg-amber-50 hover:text-amber-600' },
    { id: 'hexagon', label: 'Hexagon', icon: <Hexagon className="w-4 h-4 mr-2" />, className: 'hover:bg-emerald-50 hover:text-emerald-600' },
    { id: 'cylinder', label: 'Database', icon: <Database className="w-4 h-4 mr-2" />, className: 'hover:bg-cyan-50 hover:text-cyan-600' },
    { id: 'parallelogram', label: 'Input / Output', icon: <RectangleHorizontal className="w-4 h-4 mr-2 skew-x-[-12deg]" />, className: 'hover:bg-orange-50 hover:text-orange-600' },
    { id: 'circle', label: 'Circle', icon: <Circle className="w-4 h-4 mr-2" />, className: 'hover:bg-pink-50 hover:text-pink-600' },
];

export function ToolbarAddMenuPanel({ onAddShape }: ToolbarAddMenuPanelProps): React.ReactElement {
    const { t } = useTranslation();

    return (
        <div className="absolute bottom-full left-1/2 mb-3 w-52 -translate-x-1/2 rounded-[var(--radius-lg)] border border-white/20 bg-white/95 p-1 shadow-xl ring-1 ring-black/5 backdrop-blur-md animate-in slide-in-from-bottom-4 zoom-in-95 duration-200 origin-bottom pointer-events-auto">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {t('toolbar.shapes', 'Shapes')}
            </div>

            {SHAPE_ITEMS.map((item) => (
                <Button
                    key={item.id}
                    onClick={() => onAddShape(item.id)}
                    variant="ghost"
                    className={`h-9 w-full justify-start rounded-[var(--radius-sm)] px-3 text-sm transition-colors ${item.className}`}
                    icon={item.icon}
                >
                    {item.label}
                </Button>
            ))}
        </div>
    );
}
