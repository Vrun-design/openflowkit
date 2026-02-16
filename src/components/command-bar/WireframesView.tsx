import React, { useMemo, useState } from 'react';
import { Monitor, Smartphone, Type, MousePointer2, Image as ImageIcon, Box } from 'lucide-react';
import { CommandItem } from './types';
import { useFlowStore } from '../../store';
import { useFlowOperations } from '../../hooks/useFlowOperations';

interface WireframesViewProps {
    onClose: () => void;
    handleBack: () => void;
}

export const WireframesView: React.FC<WireframesViewProps> = ({ onClose, handleBack }) => {
    // Basic wireframe items configuration
    const wireframeItems = [
        { id: 'browser', label: 'Browser Window', icon: <Monitor size={20} />, type: 'browser' },
        { id: 'mobile', label: 'Mobile Device', icon: <Smartphone size={20} />, type: 'mobile' },
        { id: 'button', label: 'Button', icon: <MousePointer2 size={20} />, type: 'wireframe_button' },
        { id: 'input', label: 'Input Field', icon: <Type size={20} />, type: 'wireframe_input' },
        { id: 'image', label: 'Image Holder', icon: <ImageIcon size={20} />, type: 'wireframe_image' },
        { id: 'icon', label: 'Icon', icon: <Box size={20} />, type: 'wireframe_icon' },
    ];

    const { nodes, setNodes, brandConfig } = useFlowStore();
    const isBeveled = brandConfig.ui.buttonStyle === 'beveled';

    const handleAdd = (type: string) => {
        const id = `wf-${Date.now()}`;
        // Random offset to show movement/new placement
        const position = {
            x: 100 + Math.random() * 50,
            y: 100 + Math.random() * 50
        };

        const label = type === 'browser' ? 'New Window' :
            type === 'mobile' ? 'Mobile App' :
                type === 'wireframe_button' ? 'Button' :
                    type === 'wireframe_input' ? 'Input' :
                        type === 'wireframe_image' ? 'Image' : 'Icon';

        // Cast to any to avoid strict Node types check if needed, 
        // though standard FlowNode should work if types are aligned.
        const newNode: any = {
            id,
            type,
            position,
            data: {
                label,
                color: 'slate',
                // Optional: set initial size for some types if components don't default well
            }
        };

        // Use functional update to ensure we have latest state
        setNodes((prev: any[]) => [...prev, newNode]);
        onClose();
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center px-4 py-3 border-b border-slate-100 shrink-0 gap-2">
                <button onClick={handleBack} className="p-1 hover:bg-slate-100 rounded text-slate-400 active:scale-95 transition-all">
                    <span className="text-xs">←</span>
                </button>
                <div className="text-sm font-medium text-slate-800">Wireframe Elements</div>
            </div>

            <div className="p-4 grid grid-cols-2 gap-3 overflow-y-auto flex-1 custom-scrollbar">
                {wireframeItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => handleAdd(item.type)}
                        className={`flex flex-col items-center justify-center gap-3 p-4 rounded-xl border transition-all group active:scale-[0.98]
                            ${isBeveled
                                ? 'bg-white border-slate-200 btn-beveled hover:border-[var(--brand-primary-200)]'
                                : 'bg-slate-50/50 border-slate-200 hover:bg-white hover:border-[var(--brand-primary-200)] hover:shadow-md'}
                        `}
                    >
                        <div className={`p-2 bg-white rounded-lg border border-slate-100 text-slate-500 group-hover:text-[var(--brand-primary)] group-hover:scale-110 transition-all ${isBeveled ? 'shadow-sm' : ''}`}>
                            {item.icon}
                        </div>
                        <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900">{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};
