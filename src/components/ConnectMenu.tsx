import React from 'react';
import { Settings, Sparkles, StickyNote, X, Database, ArrowRightLeft, Circle } from 'lucide-react';

interface ConnectMenuProps {
    position: { x: number; y: number };
    onSelect: (type: string, shape?: string) => void;
    onClose: () => void;
}

export const ConnectMenu = ({ position, onSelect, onClose }: ConnectMenuProps) => {
    return (
        <>
            <div className="fixed inset-0 z-[60]" onClick={onClose} />
            <div
                className="fixed z-[70] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/50 overflow-hidden min-w-[180px] animate-in zoom-in-95 fade-in duration-150 ring-1 ring-black/5"
                style={{ top: position.y, left: position.x }}
            >
                <div className="p-1.5 space-y-0.5">
                    <div className="px-3 py-2 mb-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">Create New Node</p>
                    </div>

                    <button
                        onClick={() => { onSelect('process'); onClose(); }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 rounded-xl transition-all group"
                    >
                        <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center border border-blue-100 group-hover:scale-110 transition-transform">
                            <Settings className="w-4.5 h-4.5" />
                        </div>
                        <div className="flex flex-col items-start translate-y-[1px]">
                            <span className="font-bold text-slate-700 leading-none mb-1">Process</span>
                            <span className="text-[10px] text-slate-400 font-medium">Standard action</span>
                        </div>
                    </button>

                    <button
                        onClick={() => { onSelect('decision'); onClose(); }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 rounded-xl transition-all group"
                    >
                        <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center border border-amber-100 group-hover:scale-110 transition-transform">
                            <Sparkles className="w-4.5 h-4.5" />
                        </div>
                        <div className="flex flex-col items-start translate-y-[1px]">
                            <span className="font-bold text-slate-700 leading-none mb-1">Decision</span>
                            <span className="text-[10px] text-slate-400 font-medium">Branching logic</span>
                        </div>
                    </button>

                    <button
                        onClick={() => { onSelect('process', 'cylinder'); onClose(); }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 rounded-xl transition-all group"
                    >
                        <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center border border-emerald-100 group-hover:scale-110 transition-transform">
                            <Database className="w-4.5 h-4.5" />
                        </div>
                        <div className="flex flex-col items-start translate-y-[1px]">
                            <span className="font-bold text-slate-700 leading-none mb-1">Database</span>
                            <span className="text-[10px] text-slate-400 font-medium">Data storage</span>
                        </div>
                    </button>

                    <button
                        onClick={() => { onSelect('process', 'parallelogram'); onClose(); }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 rounded-xl transition-all group"
                    >
                        <div className="w-9 h-9 bg-violet-50 text-violet-600 rounded-lg flex items-center justify-center border border-violet-100 group-hover:scale-110 transition-transform">
                            <ArrowRightLeft className="w-4.5 h-4.5" />
                        </div>
                        <div className="flex flex-col items-start translate-y-[1px]">
                            <span className="font-bold text-slate-700 leading-none mb-1">Input / Output</span>
                            <span className="text-[10px] text-slate-400 font-medium">Data flow</span>
                        </div>
                    </button>

                    <button
                        onClick={() => { onSelect('annotation'); onClose(); }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 rounded-xl transition-all group"
                    >
                        <div className="w-9 h-9 bg-yellow-50 text-yellow-600 rounded-lg flex items-center justify-center border border-yellow-100 group-hover:scale-110 transition-transform">
                            <StickyNote className="w-4.5 h-4.5" />
                        </div>
                        <div className="flex flex-col items-start translate-y-[1px]">
                            <span className="font-bold text-slate-700 leading-none mb-1">Note</span>
                            <span className="text-[10px] text-slate-400 font-medium">Documentation</span>
                        </div>
                    </button>
                </div>

                <div className="bg-slate-50/80 px-4 py-2 flex items-center justify-between border-t border-slate-100">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Release to connect</span>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                        <X className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </>
    );
};
