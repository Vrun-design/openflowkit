import React from 'react';
import { useReactFlow } from 'reactflow';
import { Plus, Minus, Maximize, Lock, Unlock } from 'lucide-react';
import { Tooltip } from './Tooltip';

export const NavigationControls = () => {
    const { zoomIn, zoomOut, fitView } = useReactFlow();
    const [isLocked, setIsLocked] = React.useState(false);

    // Note: ReactFlow's useStore or direct manipulation might be needed to toggle interaction lock fully,
    // but for now we can just manage a visual state or implement simple locking if feasible via props.
    // However, the standard Controls component uses internal state. 
    // Since we are replacing it, we should ideally support "Interactive" vs "View Only" or just the basic zoom controls.
    // ReactFlow's `nodesDraggable`, `panOnDrag` etc are props on the main component.
    // Controlling them from here requires lifting state up or using a store. 
    // To keep it simple and match standard Controls behavior (Zoom/Fit/Lock), we will just implement Zoom/Fit for now.
    // The "Lock" feature in standard controls strictly locks the pane.

    return (
        <div className="absolute bottom-8 left-8 flex flex-col gap-2 z-50">
            <div className="flex flex-col p-1 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl border border-slate-100 ring-1 ring-slate-900/5">
                <Tooltip text="Zoom In" side="right">
                    <button
                        onClick={() => zoomIn({ duration: 300 })}
                        className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </Tooltip>
                <Tooltip text="Zoom Out" side="right">
                    <button
                        onClick={() => zoomOut({ duration: 300 })}
                        className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95"
                    >
                        <Minus className="w-4 h-4" />
                    </button>
                </Tooltip>
                <div className="h-px bg-slate-100 mx-2 my-1" />
                <Tooltip text="Fit View" side="right">
                    <button
                        onClick={() => fitView({ duration: 600, padding: 0.2 })}
                        className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95"
                    >
                        <Maximize className="w-4 h-4" />
                    </button>
                </Tooltip>
            </div>
        </div>
    );
};
