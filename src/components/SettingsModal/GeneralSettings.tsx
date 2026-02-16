import React from 'react';
import { Monitor } from 'lucide-react';
import { useFlowStore } from '../../store';
import { Switch } from '../ui/Switch';

export const GeneralSettings = () => {
    const { viewSettings, toggleGrid, toggleSnap, toggleMiniMap } = useFlowStore();

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <div className="p-1.5 bg-[var(--brand-primary)]/10 rounded-lg text-[var(--brand-primary)]">
                        <Monitor className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-slate-800">View Options</h3>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                        <span className="font-medium text-slate-700">Show Grid</span>
                        <Switch checked={viewSettings.showGrid} onCheckedChange={toggleGrid} />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                        <span className="font-medium text-slate-700">Snap to Grid</span>
                        <Switch checked={viewSettings.snapToGrid} onCheckedChange={toggleSnap} />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                        <span className="font-medium text-slate-700">Mini Map</span>
                        <Switch checked={viewSettings.showMiniMap} onCheckedChange={toggleMiniMap} />
                    </div>
                </div>
            </div>
        </div>
    );
};
