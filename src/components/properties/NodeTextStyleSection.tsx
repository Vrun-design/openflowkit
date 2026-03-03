import React from 'react';
import type { Node } from 'reactflow';
import { Type } from 'lucide-react';
import type { NodeData } from '@/lib/types';
import { CollapsibleSection } from '../ui/CollapsibleSection';

interface NodeTextStyleSectionProps {
    selectedNode: Node<NodeData>;
    isOpen: boolean;
    onToggle: () => void;
    onChange: (id: string, data: Partial<NodeData>) => void;
}

const FONT_OPTIONS = ['inter', 'roboto', 'outfit', 'playfair', 'fira'];
const SIZE_OPTIONS = [12, 14, 16, 20, 24, 32, 48, 64];

export function NodeTextStyleSection({
    selectedNode,
    isOpen,
    onToggle,
    onChange,
}: NodeTextStyleSectionProps): React.ReactElement {
    return (
        <CollapsibleSection
            title="Text Style"
            icon={<Type className="w-3.5 h-3.5" />}
            isOpen={isOpen}
            onToggle={onToggle}
        >
            <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto no-scrollbar">
                    {FONT_OPTIONS.map((font) => (
                        <button
                            key={font}
                            onClick={() => onChange(selectedNode.id, { fontFamily: font })}
                            className={`flex-1 px-2 py-1.5 rounded-[calc(var(--brand-radius)-4px)] text-[10px] font-bold uppercase whitespace-nowrap
                                ${(selectedNode.data?.fontFamily || 'inter') === font
                                    ? 'bg-[var(--brand-surface)] shadow-sm text-[var(--brand-primary)]'
                                    : 'text-[var(--brand-secondary)] hover:text-[var(--brand-text)]'}`}
                        >
                            {font}
                        </button>
                    ))}
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto no-scrollbar">
                    {SIZE_OPTIONS.map((size) => (
                        <button
                            key={size}
                            onClick={() => onChange(selectedNode.id, { fontSize: size.toString() })}
                            className={`flex-1 px-2 py-1.5 rounded-[calc(var(--brand-radius)-4px)] text-[10px] font-bold
                                ${(selectedNode.data?.fontSize || '16') === size.toString()
                                    ? 'bg-[var(--brand-surface)] shadow-sm text-[var(--brand-primary)]'
                                    : 'text-[var(--brand-secondary)] hover:text-[var(--brand-text)]'}`}
                        >
                            {size}
                        </button>
                    ))}
                </div>
            </div>
        </CollapsibleSection>
    );
}
