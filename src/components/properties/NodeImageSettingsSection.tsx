import React from 'react';
import type { Node } from 'reactflow';
import { Image as ImageIcon } from 'lucide-react';
import type { NodeData } from '@/lib/types';
import { CollapsibleSection } from '../ui/CollapsibleSection';

interface NodeImageSettingsSectionProps {
    selectedNode: Node<NodeData>;
    isOpen: boolean;
    onToggle: () => void;
    onChange: (id: string, data: Partial<NodeData>) => void;
}

export function NodeImageSettingsSection({
    selectedNode,
    isOpen,
    onToggle,
    onChange,
}: NodeImageSettingsSectionProps): React.ReactElement {
    return (
        <CollapsibleSection
            title="Image Settings"
            icon={<ImageIcon className="w-3.5 h-3.5" />}
            isOpen={isOpen}
            onToggle={onToggle}
        >
            <div className="space-y-1 mb-3">
                <div className="flex justify-between text-xs text-slate-500">
                    <span>Transparency</span>
                    <span>{Math.round((1 - (selectedNode.data?.transparency ?? 1)) * 100)}%</span>
                </div>
                <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={selectedNode.data?.transparency ?? 1}
                    onChange={(e) => onChange(selectedNode.id, { transparency: parseFloat(e.target.value) })}
                    className="w-full accent-[var(--brand-primary)] h-2 bg-slate-200 rounded-[var(--brand-radius)] appearance-none cursor-pointer"
                />
            </div>

            <div className="space-y-1 mb-2">
                <div className="flex justify-between text-xs text-slate-500">
                    <span>Rotation</span>
                    <span>{selectedNode.data?.rotation ?? 0}°</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="360"
                    step="15"
                    value={selectedNode.data?.rotation ?? 0}
                    onChange={(e) => onChange(selectedNode.id, { rotation: parseInt(e.target.value, 10) })}
                    className="w-full accent-[var(--brand-primary)] h-2 bg-slate-200 rounded-[var(--brand-radius)] appearance-none cursor-pointer"
                />
            </div>
        </CollapsibleSection>
    );
}
