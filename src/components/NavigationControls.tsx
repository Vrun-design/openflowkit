import React from 'react';
import { useReactFlow, useViewport } from 'reactflow';
import { Plus, Minus, Maximize, Keyboard } from 'lucide-react';
import { Tooltip } from './Tooltip';
import { useFlowStore } from '../store';

export const NavigationControls = () => {
    const { zoomIn, zoomOut, fitView } = useReactFlow();
    const { zoom } = useViewport();
    const { setShortcutsHelpOpen } = useFlowStore();

    return (
        <div className="absolute bottom-8 left-8 flex flex-col gap-2 z-50">
            <div className="flex flex-col p-1 bg-white shadow-2xl rounded-[var(--radius-lg)] border border-slate-100 ring-1 ring-slate-900/5">
                <Tooltip text="Zoom In" side="right">
                    <button
                        onClick={() => zoomIn({ duration: 300 })}
                        className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-[var(--radius-sm)] transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </Tooltip>

                <div className="text-[10px] font-medium text-slate-400 text-center py-1 select-none tabular-nums">
                    {Math.round(zoom * 100)}%
                </div>

                <Tooltip text="Zoom Out" side="right">
                    <button
                        onClick={() => zoomOut({ duration: 300 })}
                        className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-[var(--radius-sm)] transition-all active:scale-95"
                    >
                        <Minus className="w-4 h-4" />
                    </button>
                </Tooltip>
                <div className="h-px bg-slate-100 mx-2 my-1" />
                <Tooltip text="Fit View" side="right">
                    <button
                        onClick={() => fitView({ duration: 600, padding: 0.2 })}
                        className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-[var(--radius-sm)] transition-all active:scale-95"
                    >
                        <Maximize className="w-4 h-4" />
                    </button>
                </Tooltip>
                <div className="h-px bg-slate-100 mx-2 my-1" />
                <Tooltip text="Keyboard Shortcuts" side="right">
                    <button
                        onClick={() => setShortcutsHelpOpen(true)}
                        className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-[var(--radius-sm)] transition-all active:scale-95"
                    >
                        <Keyboard className="w-4 h-4" />
                    </button>
                </Tooltip>
            </div>
        </div>
    );
};
