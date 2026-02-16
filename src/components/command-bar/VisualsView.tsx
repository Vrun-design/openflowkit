import React from 'react';
import { Activity, Grid, Network, Zap } from 'lucide-react';
import { useFlowStore } from '../../store';
import { ViewHeader } from './ViewHeader';

interface VisualsViewProps {
    onBack: () => void;
}

export const VisualsView = ({ onBack }: VisualsViewProps) => {
    const { globalEdgeOptions, setGlobalEdgeOptions, viewSettings, setDefaultIconsEnabled, setSmartRoutingEnabled, brandConfig } = useFlowStore();
    const isBeveled = brandConfig.ui.buttonStyle === 'beveled';

    return (
        <div className="flex flex-col h-full">
            <ViewHeader title="Connection Styles" icon={<Activity className="w-4 h-4 text-[var(--brand-primary)]" />} onBack={onBack} />

            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">

                {/* Edge Style */}
                <div className="space-y-3">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Edge Style</label>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { type: 'default', label: 'Bezier', desc: 'Smooth curves' },
                            { type: 'straight', label: 'Straight', desc: 'Direct lines' },
                            { type: 'smoothstep', label: 'Smooth Step', desc: 'Rounded corners' },
                            { type: 'step', label: 'Step', desc: 'Right angles' }
                        ].map((style) => (
                            <div
                                key={style.type}
                                onClick={() => setGlobalEdgeOptions({ type: style.type as any })}
                                className={`p-3 rounded-[var(--radius-md)] bordercursor-pointer transition-all duration-200 active:scale-[0.98]
                                    ${(globalEdgeOptions.type === style.type || (style.type === 'default' && globalEdgeOptions.type === 'bezier'))
                                        ? `border-[var(--brand-primary)] bg-[var(--brand-primary-50)]/50 ${isBeveled ? 'btn-beveled border-2' : 'border-2 ring-1 ring-[var(--brand-primary)]/10'}`
                                        : `border-slate-100 bg-white hover:border-[var(--brand-primary-200)] ${isBeveled ? 'btn-beveled hover:bg-slate-50' : 'hover:bg-slate-50 border-2'}`
                                    }`}
                            >
                                <div className="font-medium text-sm text-slate-700">{style.label}</div>
                                <div className="text-[10px] text-slate-400">{style.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Default Icons */}
                <div className={`flex items-center justify-between p-3 rounded-[var(--radius-md)] border transition-all ${isBeveled ? 'btn-beveled' : 'border-slate-200 bg-white'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-[var(--radius-sm)] shadow-inner"><Grid className="w-4 h-4 text-slate-500" /></div>
                        <div>
                            <div className="font-medium text-sm text-slate-700">Default Icons</div>
                            <div className="text-[10px] text-slate-400">Show standard node icons</div>
                        </div>
                    </div>
                    <button
                        onClick={() => setDefaultIconsEnabled(!viewSettings.defaultIconsEnabled)}
                        className={`w-11 h-6 rounded-full transition-all flex items-center px-0.5 active:scale-90 ${viewSettings.defaultIconsEnabled ? 'bg-[var(--brand-primary)] shadow-inner' : 'bg-slate-200 shadow-inner'}`}
                    >
                        <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${isBeveled ? 'border border-black/5 shadow-md' : ''} ${viewSettings.defaultIconsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                </div>

                {/* Intelligent Routing */}
                <div className={`flex items-center justify-between p-3 rounded-[var(--radius-md)] border transition-all ${isBeveled ? 'btn-beveled' : 'border-slate-200 bg-white'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-[var(--radius-sm)] shadow-inner"><Network className="w-4 h-4 text-emerald-500" /></div>
                        <div>
                            <div className="font-medium text-sm text-slate-700">Intelligent Routing</div>
                            <div className="text-[10px] text-slate-400">Auto-snap connections on drag</div>
                        </div>
                    </div>
                    <button
                        onClick={() => setSmartRoutingEnabled(!viewSettings.smartRoutingEnabled)}
                        className={`w-11 h-6 rounded-full transition-all flex items-center px-0.5 active:scale-90 ${viewSettings.smartRoutingEnabled ? 'bg-[var(--brand-primary)] shadow-inner' : 'bg-slate-200 shadow-inner'}`}
                    >
                        <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${isBeveled ? 'border border-black/5 shadow-md' : ''} ${viewSettings.smartRoutingEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                </div>

                {/* Animation */}
                <div className={`flex items-center justify-between p-3 rounded-[var(--radius-md)] border transition-all ${isBeveled ? 'btn-beveled' : 'border-slate-200 bg-white'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-[var(--radius-sm)] shadow-inner"><Zap className="w-4 h-4 text-amber-500" /></div>
                        <div>
                            <div className="font-medium text-sm text-slate-700">Animated Edges</div>
                            <div className="text-[10px] text-slate-400">Flowing particles</div>
                        </div>
                    </div>
                    <button
                        onClick={() => setGlobalEdgeOptions({ animated: !globalEdgeOptions.animated })}
                        className={`w-11 h-6 rounded-full transition-all flex items-center px-0.5 active:scale-90 ${globalEdgeOptions.animated ? 'bg-[var(--brand-primary)] shadow-inner' : 'bg-slate-200 shadow-inner'}`}
                    >
                        <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${isBeveled ? 'border border-black/5 shadow-md' : ''} ${globalEdgeOptions.animated ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                </div>

                {/* Stroke Width */}
                <div className="space-y-3">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stroke Width</label>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map(w => (
                            <button
                                key={w}
                                onClick={() => setGlobalEdgeOptions({ strokeWidth: w })}
                                className={`flex-1 h-10 rounded-[var(--radius-sm)] border font-medium text-sm transition-all active:scale-95
                                    ${globalEdgeOptions.strokeWidth === w
                                        ? `border-[var(--brand-primary)] bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)] shadow-inner ${isBeveled ? 'btn-beveled' : ''}`
                                        : `border-slate-200 text-slate-600 hover:border-[var(--brand-primary-200)] ${isBeveled ? 'btn-beveled hover:bg-slate-50' : ''}`}
                                `}
                            >
                                {w}px
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
